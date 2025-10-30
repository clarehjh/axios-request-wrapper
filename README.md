# HRequest <img src="https://img.shields.io/npm/v/@your-scope/h-request.svg?style=flat-square" alt="npm version"/>

[English](#en) | [简体中文](#zh)

---

## <span id="zh">✨ 中文简介</span>

HRequest 是一个基于 axios 的增强型 HTTP 请求库，支持可插拔的加密、签名适配器，自动重试与日志记录功能，适合高安全性要求的前端与 Node.js 项目。

---

## <span id="en">✨ English Introduction</span>

HRequest is a pluggable axios wrapper with adapters for crypto/signatures, built-in retries & logging. Suitable for advanced frontend / Node.js security scenarios.

---

## 📦 安装 / Install

```bash
npm i @your-scope/h-request axios
```

---

## 🚀 快速开始 / Quick Start

```typescript
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
  retry: { retries: 2, retryDelayMs: (a) => 200 * 2 ** (a - 1) },
  // ...other options
});

// Use generics <TResponse, TRequest>
const res = await http.post<{ ok: boolean }, { name: string }>(
  '/demo',
  { name: 'a' }
);
```

更多用法见 [examples/global.ts](./examples/global.ts)

---

## 🧩 API/类型 Type Reference

| 名称              | 说明                                    |
|------------------|-----------------------------------------|
| `HRequest`         | 主类：HTTP 调用入口                    |
| `CryptoAdapter`    | 插件接口：加密适配                     |
| `SignatureAdapter` | 插件接口：签名适配                     |
| `LoggerAdapter`    | 插件接口：日志适配                     |
| `RetryOptions`     | 配置项：重试机制参数                   |
| ...              | ...                                     |

更详细类型定义请见 [src/index.ts](./src/index.ts)

---

## ❓ 常见问题 / FAQ
- [如何按需跳过加密或签名？](#skip-encryptsign-per-request)
- [如何扩展适配器？](#api)
- 更多请查看示例与源码注释。

---

## 📝 License
MIT
