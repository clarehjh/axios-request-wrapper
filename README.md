
[English](#english-introduction) | [简体中文](#中文介绍-1)

---

<a id="中文介绍-1"></a>
## 中文介绍

HRequest 是一个基于 axios 的增强型 HTTP 请求库，支持可插拔的加密、签名适配器，自动重试与日志记录功能，适合高安全性要求的前端与 Node.js 项目。

---
<a id="english-introduction"></a>  
## English Introduction

HRequest is a pluggable axios wrapper with adapters for crypto/signatures, built-in retries & logging. Suitable for advanced frontend / Node.js security scenarios.

---

## 📦 安装 / Install

```bash
npm i axios-request-wrapper
```

---

## 🚀 快速开始 / Quick Start

```typescript
import { HRequest } from "axios-request-wrapper";

const cryptoAdapter = {
  provideStaticHeaders: () => ({ "X-System-Id": "1001", version: "1.0.0" }),
  shouldEncrypt: (config) => config.method?.toLowerCase() === "post",
  encryptRequest: (config) => {
    const { cipherText, header } = yourEncrypt(JSON.stringify(config.data));
    return { data: { cipherText }, headers: { "x-crypto-key": header } };
  },
  decryptResponse: (res) => {
    if (res.headers["x-crypto-key"]) {
      const key = yourAsymDecrypt(res.headers["x-crypto-key"]);
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
  baseURL: "/api",
  cryptoAdapter,
  signatureAdapter,
  retry: { retries: 2, retryDelayMs: (a) => 200 * 2 ** (a - 1) },
  // ...other options
});

// Use generics <TResponse, TRequest>
const res = await http.post<{ ok: boolean }, { name: string }>("/demo", {
  name: "a",
});
```

更多用法见 [examples/global.ts](./examples/global.ts)

---

## 🧩 API/类型 Type Reference

| 名称                                | 类型/定义                                                                                  | 说明                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `HRequest`                          | class                                                                                      | HTTP 请求主类，所有请求实例入口                             |
| `HRequest.options`                  | `newRequestConfig`                                                                         | 构造参数，支持全局配置适配器、日志等                        |
| `Result`                            | `interface`<br> `{ code: string; msg: string }`                                            | 标准返回结果基础结构                                        |
| `ResultData<T>`                     | `interface`<br> `extends Result`<br> `{ data: T }`                                         | 泛型返回数据结构                                            |
| `CryptoAdapter`                     | `interface`<br> `{ shouldEncrypt, encryptRequest, decryptResponse, provideStaticHeaders }` | 加密适配器接口，可自定义加密流程及注入请求头                |
| `SignatureAdapter`                  | `interface`<br> `{ sign(args): Record<string, string> }`                                   | 签名适配器接口，用于生成签名相关请求头                      |
| `LoggerAdapter`                     | `interface`<br> `{ onRequestStart, onRequestEnd, onResponse, onError }`                    | 日志/埋点/副作用适配器接口，推荐用于 loading、监控、调试等  |
| `RetryOptions`                      | `interface`<br> `{ retries, retryDelayMs, retryOn }`                                       | 重试参数配置，支持自定义次数和重试策略                      |
| `newRequestConfig`                  | `interface` `extends AxiosRequestConfig`                                                   | 单次请求的全部配置                                          |
| `newRequestConfig.loading`          | `boolean`                                                                                  | 是否需要显示 Loading（具体实现由 loggerAdapter/业务层决定） |
| `newRequestConfig.cryptoAdapter`    | `CryptoAdapter/ CryptoAdapter[]`                                                           | 本次请求加密插件，覆盖全局配置                              |
| `newRequestConfig.signatureAdapter` | `SignatureAdapter/ SignatureAdapter[]`                                                     | 本次请求签名插件，覆盖全局配置                              |
| `newRequestConfig.loggerAdapter`    | `LoggerAdapter`                                                                            | 本次请求日志适配器，覆盖全局                                |

更详细类型定义请见 [`src/types/index.ts`](./src/types/index.ts)

---


## 📝 许可证

MIT License


## 🤝 贡献
欢迎提交 Issue 和 PR！
---
Made with ❤️ by [clarehjh](https://github.com/clarehjh)
