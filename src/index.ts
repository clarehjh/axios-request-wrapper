import axios from "axios";
import type { AxiosInstance } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type {
  ResultData,
  LoggerAdapter,
  RetryOptions,
  CryptoAdapter,
  SignatureAdapter,
  newRequestConfig,
} from "./types";

interface newInterceptors<T = AxiosResponse> {
  requestSuccessFn?: (config: any) => InternalAxiosRequestConfig;
  requestFailFn?: (err: any) => any;
  responseSuccessFn?: (res: T) => T;
  responseFailFn?: (err: any) => any;
}

class HRequest {
  instance: AxiosInstance;
  private cryptoAdapters: CryptoAdapter[] = [];
  private signatureAdapters: SignatureAdapter[] = [];
  private logger?: LoggerAdapter;
  private normalizeError?: (error: any) => any;
  private retry?: RetryOptions;
  private instanceInterceptors?: newInterceptors<any>;
  constructor(config: newRequestConfig) {
    this.instance = axios.create(config);
    // 一键配置：实例级适配器
    this.cryptoAdapters = Array.isArray(config.cryptoAdapter)
      ? config.cryptoAdapter
      : config.cryptoAdapter
      ? [config.cryptoAdapter]
      : [];
    this.signatureAdapters = Array.isArray(config.signatureAdapter)
      ? config.signatureAdapter
      : config.signatureAdapter
      ? [config.signatureAdapter]
      : [];
    this.logger = config.loggerAdapter;
    this.normalizeError = config.normalizeError;
    this.retry = config.retry;
    // 实例级（全局）拦截器：用于多实例场景，每个实例可以有自己的全局链路
    this.instanceInterceptors = config.interceptors;
    this.instance.interceptors.request.use(
      (config: any) => {
        const { url, params, data, method } = config;
        const startedAt = Date.now();
        this.logger?.onRequestStart?.(config);

        // 选择适配器：优先请求级，其次实例级
        const cryptoAdapters: CryptoAdapter[] = (
          Array.isArray(config.cryptoAdapter)
            ? config.cryptoAdapter
            : config.cryptoAdapter
            ? [config.cryptoAdapter]
            : []
        ).concat(this.cryptoAdapters);
        const signatureAdapters: SignatureAdapter[] = (
          Array.isArray(config.signatureAdapter)
            ? config.signatureAdapter
            : config.signatureAdapter
            ? [config.signatureAdapter]
            : []
        ).concat(this.signatureAdapters);

        // 可选请求级跳过标记（通过 header 控制）
        const headersAny: any = config.headers as any;
        const skipEncrypt =
          headersAny?.["X-Skip-Encrypt"] === true ||
          headersAny?.["X-Skip-Encrypt"] === "true";
        const skipSignature =
          headersAny?.["X-Skip-Signature"] === true ||
          headersAny?.["X-Skip-Signature"] === "true";

        // 1) 通过适配器注入通用头
        for (const adapter of cryptoAdapters) {
          if (!adapter?.provideStaticHeaders) continue;
          const staticHeaders = adapter.provideStaticHeaders();
          if (!staticHeaders) continue;
          if (typeof config.headers?.set === "function") {
            Object.entries(staticHeaders).forEach(([k, v]) => {
              if (v !== undefined && v !== null)
                config.headers.set(k, String(v));
            });
          } else {
            Object.assign(
              config.headers || (config.headers = {}),
              staticHeaders
            );
          }
        }

        // 2) 请求加密（全部交由适配器处理）
        if (!skipEncrypt) {
          for (const adapter of cryptoAdapters) {
            const shouldEncrypt = adapter?.shouldEncrypt?.(config);
            if (!shouldEncrypt || !adapter?.encryptRequest) continue;
            const encrypted = adapter.encryptRequest(config);
            if (encrypted?.headers) {
              if (typeof config.headers?.set === "function") {
                Object.entries(encrypted.headers).forEach(([k, v]) =>
                  config.headers.set(k, String(v))
                );
              } else {
                Object.assign(
                  config.headers || (config.headers = {}),
                  encrypted.headers
                );
              }
            }
            if (encrypted?.data !== undefined) {
              config.data = encrypted.data;
            }
            break;
          }
        }

        // 3) 签名（全部交由适配器处理）
        if (!skipSignature) {
          for (const signer of signatureAdapters) {
            if (!signer) continue;
            const formData: FormData | null =
              data instanceof FormData ? data : null;
            const signHeaders = signer.sign({
              url,
              params,
              data: config.data,
              formData,
              method,
              authToken: (config.headers as any)?.["X-Auth-Token"],
            });
            if (signHeaders)
              Object.assign(
                config.headers || (config.headers = {}),
                signHeaders
              );
          }
        }

        (config as any).__startedAt = startedAt;

        return config;
      },
      (err) => {
        return err;
      }
    );
    this.instance.interceptors.response.use(
      (res) => {
        const startedAt = (res.config as any).__startedAt as number | undefined;
        const elapsed = startedAt ? Date.now() - startedAt : 0;
        const adapters: CryptoAdapter[] = (
          Array.isArray((res.config as any)?.cryptoAdapter)
            ? (res.config as any).cryptoAdapter
            : (res.config as any)?.cryptoAdapter
            ? [(res.config as any).cryptoAdapter]
            : []
        ).concat(this.cryptoAdapters);
        let output: any = res;
        for (const adapter of adapters) {
          if (adapter?.decryptResponse) {
            output = adapter.decryptResponse(output as AxiosResponse);
          }
        }
        this.logger?.onResponse?.(res, elapsed);
        return (output as any)?.data !== undefined &&
          (output as any)?.status !== undefined
          ? (output as AxiosResponse).data
          : output;
      },
      async (err) => {
        const config: any = err?.config || {};
        const startedAt = config.__startedAt as number | undefined;
        const elapsed = startedAt ? Date.now() - startedAt : 0;

        const retry = config.retry || this.retry;
        const maxRetries = retry?.retries ?? 0;
        const shouldRetry = retry?.retryOn?.(err) ?? isRetryableError(err);
        config.__retryCount = config.__retryCount || 0;
        if (shouldRetry && config.__retryCount < maxRetries) {
          config.__retryCount++;
          const delay =
            retry?.retryDelayMs?.(config.__retryCount, err) ??
            defaultRetryDelay(config.__retryCount);
          await sleep(delay);
          return this.instance.request(config);
        }

        this.logger?.onError?.(err, elapsed);
        throw this.normalizeError ? this.normalizeError(err) : err;
      }
    );
    // 不在构造器中注入与具体实例化参数绑定的拦截器；
    // per-request 的拦截器在 request 方法里处理
  }
  // 封装网络请求的方法
  // T => IHomeData
  request<TResponse = any, TRequest = any>(
    config: newRequestConfig<TResponse> & { data?: TRequest }
  ) {
    // 先执行实例级(全局) requestSuccess，再执行请求级 requestSuccess
    if (this.instanceInterceptors?.requestSuccessFn) {
      config = this.instanceInterceptors.requestSuccessFn(config as any);
    }
    if (config.interceptors?.requestSuccessFn) {
      config = config.interceptors.requestSuccessFn(config as any);
    }

    return new Promise<TResponse>((resolve, reject) => {
      this.instance
        .request<any, TResponse>(config)
        .then((res) => {
          // 先执行请求级 responseSuccess，再执行实例级(全局) responseSuccess
          if (config.interceptors?.responseSuccessFn) {
            res = config.interceptors.responseSuccessFn(res);
          }
          if (this.instanceInterceptors?.responseSuccessFn) {
            res = this.instanceInterceptors.responseSuccessFn(res);
          }
          resolve(res);
        })
        .catch((err) => {
          let currentErr = err;
          // 先请求级 responseFail，再实例级(全局) responseFail
          if (config.interceptors?.responseFailFn) {
            try {
              currentErr = config.interceptors.responseFailFn(currentErr);
            } catch (e) {
              currentErr = e;
            }
          }
          if (this.instanceInterceptors?.responseFailFn) {
            try {
              currentErr = this.instanceInterceptors.responseFailFn(currentErr);
            } catch (e) {
              currentErr = e;
            }
          }
          reject(currentErr);
        });
    });
  }
  get<TResponse = any>(
    url: string,
    params?: object,
    config?: {}
  ): Promise<ResultData<TResponse>> {
    return this.instance.get(url, { params, ...config });
  }
  post<TResponse = any, TRequest = any>(
    url: string,
    params?: TRequest,
    _object = {}
  ): Promise<ResultData<TResponse>> {
    return this.instance.post(url, params, _object);
  }
  put<TResponse = any, TRequest = any>(
    url: string,
    params?: TRequest,
    _object = {}
  ): Promise<ResultData<TResponse>> {
    return this.instance.put(url, params, _object);
  }
  delete<TResponse = any>(
    url: string,
    params?: any,
    _object = {}
  ): Promise<ResultData<TResponse>> {
    return this.instance.delete(url, { params, ..._object });
  }
  download(url: string, params?: object, _object = {}): Promise<BlobPart> {
    return this.instance.post(url, params, {
      ..._object,
      responseType: "blob",
    });
  }
}

export { HRequest };

// ========== Helpers ==========
function isRetryableError(error: any): boolean {
  if (!error || !error.isAxiosError) return false;
  const status = error?.response?.status;
  if (status === undefined) return true; // 网络错误/超时
  return status >= 500 && status < 600;
}

function defaultRetryDelay(attempt: number): number {
  const base = 200;
  const jitter = Math.floor(Math.random() * 100);
  return base * Math.pow(2, attempt - 1) + jitter; // 指数退避 + 抖动
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
