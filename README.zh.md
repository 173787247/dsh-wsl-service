# dsh-wsl-service

> 从 WSL 读取 Windows 服务状态：列出服务、按名查看单个服务。

DeepSeek Harness 插件：Read Windows service state from WSL: list services and inspect one by name.

属于 **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)** 的一部分。

[English → README.md](./README.md)

## 安装

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-service
```

## 用法

```
win_services                          # all services
win_services state=running limit=20
win_services name=Spooler             # one service
```

## 说明

Read-only: this plugin lists and inspects services, it does not start or stop them.
`total` counts services matching the filter, which can exceed `listed`.

## 依赖

- Windows + WSL，DeepSeek Harness 跑在 WSL 里。

## 测试

```sh
npm test
```

单元测试在任何平台都能跑；实时测试在 WSL 之外自动跳过。

## 许可

MIT
