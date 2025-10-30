import { HRequest } from "../src/index";
import type {
  CryptoAdapter,
  SignatureAdapter,
  LoggerAdapter,
  RetryOptions,
} from "../index";

// ----- 1) Define adapters (project-specific) -----
const cryptoAdapter: CryptoAdapter = {
  provideStaticHeaders: () => ({
    "X-System-Id": "1001",
    version: "1.0.0",
  }),
  shouldEncrypt: (config) =>
    config.method?.toLowerCase() === "post" &&
    (config.headers as any)?.["Content-Type"] === "application/json" &&
    !!config.data,
  encryptRequest: (config) => {
    // demo only
    const body = JSON.stringify(config.data ?? {});
    const cipherText = Buffer.from(body).toString("base64");
    return { data: { cipherText }, headers: { "x-crypto-key": "demo-key" } };
  },
  decryptResponse: (res) => {
    if (res.headers["x-crypto-key"]) {
      try {
        const json = Buffer.from(String(res.data), "base64").toString();
        return JSON.parse(json);
      } catch (_) {
        return res.data;
      }
    }
    return res.data;
  },
};

const signatureAdapter: SignatureAdapter = {
  sign: ({ url, params, data, formData, method, authToken }) => {
    // demo only: attach a fake signature
    return { "X-Signature": "demo-signature" };
  },
};

const loggerAdapter: LoggerAdapter = {
  onRequestStart: (cfg) => {
    // console.log("request ->", cfg.method, cfg.url);
  },
  onResponse: (res, ms) => {
    // console.log("response <-", res.status, res.config.url, `${ms}ms`);
  },
  onError: (err, ms) => {
    // console.warn("error <-", err?.response?.status, err?.config?.url, `${ms}ms`);
  },
};

const retryOptions: RetryOptions = {
  retries: 2,
  retryDelayMs: (attempt) => 200 * 2 ** (attempt - 1),
};

// ----- 2) Create a singleton client (global setup) -----
export const http = new HRequest({
  baseURL: "/api",
  cryptoAdapter,
  signatureAdapter,
  loggerAdapter,
  retry: retryOptions,
  normalizeError: (e) => ({
    message: e?.response?.data?.message || e.message,
    status: e?.response?.status,
    url: e?.config?.url,
  }),
});

// ----- 3) Example API layer -----
export type User = { id: number; name: string };
export type CreateUserInput = { name: string };

export async function getUser(id: number) {
  return http.get<User>(`/users/${id}`);
}

export async function createUser(input: CreateUserInput) {
  return http.post<User, CreateUserInput>("/users", input);
}

// ----- 4) Per-request overrides -----
export async function uploadFile(form: FormData) {
  // Skip encrypt & sign for this request
  return http.post<unknown, FormData>("/upload", form, {
    headers: { "X-Skip-Encrypt": "true", "X-Skip-Signature": "true" },
  });
}

export async function getWithLocalErrorHandler(url: string) {
  return http.request<string>({
    url,
    method: "get",
    interceptors: {
      responseFailFn: (err) => {
        // per-request error shaping
        return { message: "local handler", cause: err } as any;
      },
    },
  });
}
