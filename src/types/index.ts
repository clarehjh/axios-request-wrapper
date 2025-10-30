// 类型定义集中管理

import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

export interface Result {
  code: string;
  msg: string;
}

export interface ResultData<T = any> extends Result {
  data: T;
}

export interface LoggerAdapter {
  onRequestStart?: (config: InternalAxiosRequestConfig) => void;
  onRequestEnd?: (config: InternalAxiosRequestConfig, ms: number) => void;
  onResponse?: (response: AxiosResponse, ms: number) => void;
  onError?: (error: any, ms: number) => void;
}

export interface RetryOptions {
  retries?: number;
  retryDelayMs?: (attempt: number, error: any) => number;
  retryOn?: (error: any) => boolean;
}

// 插件式加解密适配器：对外暴露接口，便于外部注入实现
export interface CryptoAdapter {
  // 是否需要对本次请求进行加密
  shouldEncrypt?: (config: InternalAxiosRequestConfig) => boolean;
  // 对请求数据进行加密，返回替换后的 data 和需要附加的 headers
  encryptRequest?: (config: InternalAxiosRequestConfig) => {
    data: any;
    headers?: Record<string, string>;
  };
  // 对响应进行解密，返回业务可直接使用的数据（或完整响应）
  decryptResponse?: (response: AxiosResponse) => any;
  // 提供每次请求都需要注入的静态/动态头，例如密钥、版本、系统ID、客户端公钥等
  provideStaticHeaders?: () => Record<string, string>;
}

// 可选：签名适配器，对外暴露接口，便于外部注入实现
export interface SignatureAdapter {
  sign: (args: {
    url?: string;
    params?: any;
    data?: any;
    formData?: FormData | null;
    method?: string;
    authToken?: string;
  }) => Record<string, string>;
}

interface newInterceptors<T = AxiosResponse> {
  requestSuccessFn?: (config: any) => InternalAxiosRequestConfig;
  requestFailFn?: (err: any) => any;
  responseSuccessFn?: (res: T) => T;
  responseFailFn?: (err: any) => any;
}

export interface newRequestConfig<T = AxiosResponse>
  extends AxiosRequestConfig {
  interceptors?: newInterceptors<T>;
  loading?: boolean;
  // 可选：加解密适配器（实例或请求级）
  cryptoAdapter?: CryptoAdapter | CryptoAdapter[];
  // 可选：签名适配器（实例或请求级）
  signatureAdapter?: SignatureAdapter | SignatureAdapter[];
  // 可选：日志、错误、重试
  loggerAdapter?: LoggerAdapter;
  normalizeError?: (error: any) => any;
  retry?: RetryOptions;
}


