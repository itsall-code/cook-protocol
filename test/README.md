# 协议测试自动化脚手架

本目录用于放置服务端协议自动化测试工具。当前脚手架围绕生成协议文件构建：

```text
server/libs/generate/protocols.d.ts
```

如果其他项目的生成文件名是 `protocol.d.ts`，需要在 `test/protocol/init/protocol_catalog.js` 中调整 `DEFAULT_PROTOCOL_FILE`。本项目实际文件名是 `protocols.d.ts`。

## 相对路径

脚手架必须放在 `server/test` 下，并依赖协议声明文件的相对位置：

```text
server/
  libs/generate/protocols.d.ts      # 协议声明源
  publish/bin/general/util/pylon.js # 协议编解码
  test/
    README.md
    protocol/                      # 协议测试框架
    tools/                         # QA 使用入口和脚本导入工具
```

关键相对路径：

- 从 `test/README.md` 到协议声明：`../libs/generate/protocols.d.ts`
- 从 `test/tools/` 到协议声明：`../../libs/generate/protocols.d.ts`
- 从 `test/protocol/init/protocol_catalog.js` 到协议声明：`../../../libs/generate/protocols.d.ts`
- 从 `libs/generate/protocols.d.ts` 到 QA 工具目录：`../../test/tools`

框架会自动读取 `libs/generate/protocols.d.ts`，解析协议名、opcode、tuple 字段结构。因此用例里不要手写协议号，统一使用协议名。

## 目录说明

```text
test/
  protocol/
    init/       # 初始化层：读取 protocols.d.ts，加载 Pylon 编解码
    logic/      # 逻辑层：连接、认证、创角、登录、发送协议、等待回包
    validate/   # 验证层：通用断言、错误码、tuple 结构校验
    cases/      # 用例层：具体业务协议用例
    run_smoke.js
    run_protocol_case.js
    smoke_cases.js
  tools/
    protocol_case_registry.js # QA 友好的用例注册表
    protocol_tools.js         # 自动化脚本导入入口
    protocol_runner.js        # QA 命令行入口
```

## QA 使用方式

优先使用 `npm` 命令，不需要理解底层代码。

查看所有可用用例：

```bash
npm run protocol:list
```

执行默认协议冒烟：

```bash
npm run protocol:smoke -- --user qa_001 --host 192.168.110.17
```

只执行指定冒烟用例：

```bash
npm run protocol:smoke -- --user qa_001 --host 192.168.110.17 --cases client_ping,bag
```

执行单个协议用例：

```bash
npm run protocol:run -- bag --user qa_001 --host 192.168.110.17 0
npm run protocol:run -- gm --user qa_001 --host 192.168.110.17 additem 1001 10
```

## 可用环境变量

- `PROTOCOL_HOST`：默认服务器地址。
- `PROTOCOL_AUTH_PORT`：认证服端口，默认 `7080`。
- `PROTOCOL_TIMEOUT`：等待超时毫秒数，默认 `8000`。
- `PROTOCOL_PYLON`：自定义 Pylon 编解码文件路径。
- `SMOKE_USER`：冒烟默认账号。
- `SMOKE_CASES`：冒烟用例列表，例如 `client_ping,bag`；传 `all` 跑全部已登记用例。

## 生命周期约定

每个协议用例由三个阶段组成：

1. `init`：准备数据，例如 GM 发物品、重置状态、查询前置数据。
2. `logic`：发送被测协议并等待目标回包。
3. `validate`：校验不是 `ErrCode`，回包名正确，tuple 结构和 `protocols.d.ts` 一致，再补业务断言。

推荐用例结构：

```js
function someProtocolCase(arg) {
  return {
    name: "some_protocol",
    async init(ctx) {
      await ctx.prepareWithGm("additem 1001 10");
    },
    async logic(ctx) {
      ctx.game.send("SomeProtocol", [arg]);
      return ctx.game.waitOneOf(["SomeProtocolReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      // 通用校验 + 业务字段校验。
    },
  };
}
```

## 新增协议用例

1. 在 `test/protocol/cases/` 下新增用例文件。
2. 用 `ctx.game.send("协议名", tuple)` 发送协议，不要写死 opcode。
3. 用 `ctx.game.waitOneOf(["目标回包", "ErrCode"])` 等待回包。
4. 在 `test/tools/protocol_case_registry.js` 登记用例，填写中文名称、说明、参数和是否默认冒烟。
5. 如需兼容老入口，再同步到 `test/protocol/run_protocol_case.js` 或 `test/protocol/smoke_cases.js`。

## 脚本导入方式

自动化脚本可以直接导入 `test/tools/protocol_tools.js`：

```js
const tools = require("./test/tools/protocol_tools");

async function main() {
  await tools.runCase("bag", {
    user: "qa_001",
    host: "192.168.110.17",
    args: [0],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

多个用例共用一次登录：

```js
const tools = require("./test/tools/protocol_tools");

async function main() {
  await tools.runCases(["client_ping", "human_info", "bag"], {
    user: "qa_001",
    host: "192.168.110.17",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## 维护原则

- 协议声明以 `libs/generate/protocols.d.ts` 为唯一数据源。
- QA 入口统一放在 `test/tools/`。
- 协议测试框架能力统一放在 `test/protocol/`。
- 公共流程放在 `logic/`，公共断言放在 `validate/`，业务校验写在具体 case。
- 当协议重新生成后，通常只需要更新或新增用例，不需要维护 opcode 映射。
