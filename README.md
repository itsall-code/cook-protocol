# cook-protocol

协议自动化冒烟测试脚手架，用于基于 `protocols.d.ts` 生成协议声明的游戏服务端。

它解决的问题：

- 自动读取协议声明，解析协议名、opcode 和 tuple 结构。
- 封装 WebSocket 连接、认证、创角、登录、协议发送和回包等待。
- 提供 QA 友好的命令行工具，降低不会写代码的同学执行协议冒烟的成本。
- 支持脚本导入，方便在 CI 或自定义自动化流程中复用。

## 项目结构

```text
test/
  README.md                 # 完整脚手架说明
  protocol/                 # 协议测试框架
  tools/                    # QA 命令行和脚本导入入口
package.json
package-lock.json
```

完整说明见：

```text
test/README.md
```

## 安装

```bash
npm install
```

## 快速使用

查看可用用例：

```bash
npm run protocol:list
```

执行默认协议冒烟：

```bash
npm run protocol:smoke -- --user qa_001 --host 192.168.110.17
```

执行单个协议用例：

```bash
npm run protocol:run -- bag --user qa_001 --host 192.168.110.17 0
```

## 放置位置

该脚手架默认假设它放在服务端项目的 `server/test` 下，并从以下相对路径读取协议声明：

```text
server/libs/generate/protocols.d.ts
```

如果你的项目协议文件叫 `protocol.d.ts` 或路径不同，请修改：

```text
test/protocol/init/protocol_catalog.js
```

中的 `DEFAULT_PROTOCOL_FILE`。

## 常用环境变量

- `PROTOCOL_HOST`：默认服务器地址。
- `PROTOCOL_AUTH_PORT`：认证服端口，默认 `7080`。
- `PROTOCOL_TIMEOUT`：等待超时毫秒数，默认 `8000`。
- `PROTOCOL_PYLON`：自定义 Pylon 编解码文件路径。
- `SMOKE_USER`：冒烟默认账号。
- `SMOKE_CASES`：冒烟用例列表，例如 `client_ping,bag`。

## License

MIT
