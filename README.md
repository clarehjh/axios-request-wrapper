# HRequest

[English](#en) | [简体中文](#zh)

## <span id="zh">中文介绍</span>
这是一个基于axios的增强型HTTP请求库，拥有可插拔的加密/签名适配器，支持自动重试、日志记录，并可灵活拓展。非常适用于对数据传输安全性、自动化错误处理和易用性有较高要求的前端与Node.js项目。

---

## <span id="en">English Introduction</span>
Pluggable axios wrapper with crypto/signature adapters, retries and logging.
Suitable for frontend/Node.js scenarios which need enhanced data security,
automated error handling, and flexible extension.

---

Install

```
npm i @your-scope/h-request axios
```

Quick Start

```
import { HRequest } from '@your-scope/h-request';

const cryptoAdapter = {
  provideStaticHeaders: () => ({ 'X-System-Id': '1001', version: '1.0.0' }),
  shouldEncrypt: (config) => config.method?.toLowerCase() === 'post',
  encryptRequest: (config) => {
    const { cipherText, header } = yourEncrypt(JSON.stringify(config.data));
    return { data: { cipherText }, headers: { 'x-crypto-key': header } };
  },
  decryptResponse: (res) => {
    if (res.headers['x-crypto-key']) {
      const key = yourAsymDecrypt(res.headers['x-crypto-key']);
      return yourSymDecrypt(res.data, key);
    }
    return res.data;
  },
};

const signatureAdapter = {
  sign: ({ url, params, data, formData, method, authToken }) =>
    createSignatureHeaders({ url, params, data, formData, method, authToken }),
};

const http = new HRequest({
  baseURL: '/api',
  cryptoAdapter,
  signatureAdapter,
  loggerAdapter: {
    onRequestStart: (cfg) => {},
    onResponse: (res, ms) => {},
    onError: (err, ms) => {},
  },
  retry: {
    retries: 2,
    retryDelayMs: (attempt) => 200 * 2 ** (attempt - 1),
  },
  normalizeError: (e) => ({ message: e.message, status: e?.response?.status }),
});

// Use generics <TResponse, TRequest>
const res = await http.post<{ ok: boolean }, { name: string }>(
  '/demo',
  { name: 'a' }
);
```

Skip encrypt/sign per request

```
http.post('/no-encrypt', { a: 1 }, { headers: { 'X-Skip-Encrypt': 'true' } });
http.post('/no-sign', { a: 1 }, { headers: { 'X-Skip-Signature': 'true' } });
```

API

- class HRequest(config)

  - cryptoAdapter: CryptoAdapter | CryptoAdapter[]
  - signatureAdapter: SignatureAdapter | SignatureAdapter[]
  - loggerAdapter?: LoggerAdapter
  - retry?: RetryOptions
  - normalizeError?: (error) => any

- request<TResponse, TRequest>(config)
- get<TResponse>(url, params?, config?)
- post<TResponse, TRequest>(url, body?, config?)
- put<TResponse, TRequest>(url, body?, config?)
- delete<TResponse>(url, params?, config?)
- download(url, params?, config?): Promise<BlobPart>

Types

- CryptoAdapter
- SignatureAdapter
- LoggerAdapter
- RetryOptions
- newRequestConfig
- Result / ResultData

License

MIT
