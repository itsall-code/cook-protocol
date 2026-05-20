const path = require("path");
const { loadProtocolCatalog } = require("../init/protocol_catalog");
const { createCodec } = require("../init/codec");
const { ProtocolSession } = require("./session");
const { assertCodeOk } = require("../validate/assertions");

const ERR = {
  SUCCESS: 0,
  ERROR_NO_ACTOR: 10101,
};

// AuthClient / GameLogin 当前使用同一组认证参数。
// 如果平台、区服、签名规则变化，只需要在 options 中覆盖，不影响用例层。
function createAuthTuple(user, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000) + (options.expireSeconds || 300);
  return [
    user,
    options.platform || 1,
    options.group || 1,
    options.sign || "",
    timestamp,
    options.serverId || 1,
  ];
}

class ProtocolLifecycle {
  constructor(options = {}) {
    const rootDir = options.rootDir || path.resolve(__dirname, "../../..");
    this.catalog = options.catalog || loadProtocolCatalog(options.protocolFile);
    this.codec = options.codec || createCodec({ rootDir });
    this.host = options.host || process.env.PROTOCOL_HOST || "127.0.0.1";
    this.authPort = Number(options.authPort || process.env.PROTOCOL_AUTH_PORT || 7080);
    this.timeoutMs = Number(options.timeoutMs || process.env.PROTOCOL_TIMEOUT || 8000);
    this.logger = options.logger || console;
    this.authTuple = null;
    this.game = null;
  }

  // 创建会话时注入 catalog 和 codec，保证所有连接都使用同一份协议定义。
  createSession(url) {
    return new ProtocolSession({
      url,
      catalog: this.catalog,
      codec: this.codec,
      logger: this.logger,
      timeoutMs: this.timeoutMs,
    });
  }

  async initAccount(user, options = {}) {
    this.authTuple = createAuthTuple(user, options);
    let authReply = await this.auth("AuthClient", this.authTuple);

    // 冒烟默认保证账号可用：账号无角色时自动创角。
    // 对需要验证“无角色”分支的用例，可传 createActor: false。
    if (authReply.tuple[0] === ERR.ERROR_NO_ACTOR && options.createActor !== false) {
      authReply = await this.auth("AuthCreate", [...this.authTuple, options.actorName || user]);
    }

    assertCodeOk(authReply, "auth");
    return authReply;
  }

  async auth(protocolName, tuple) {
    const session = await this.createSession(`ws://${this.host}:${this.authPort}`).connect();
    try {
      session.send(protocolName, tuple);
      return await session.wait("AuthClientReply");
    } finally {
      session.close();
    }
  }

  async login(authReply) {
    if (!this.authTuple) {
      throw new Error("call initAccount before login");
    }

    const gameHost = authReply.tuple[1] || this.host;
    const gamePort = authReply.tuple[2];
    this.game = await this.createSession(`ws://${gameHost}:${gamePort}`).connect();
    this.game.send("GameLogin", this.authTuple);
    const loginReply = await this.game.wait("GameLoginReply");
    assertCodeOk(loginReply, "game login");
    this.game.send("LoginComplete", null);
    return this.game;
  }

  async bootstrap(user, options = {}) {
    const authReply = await this.initAccount(user, options);
    const game = await this.login(authReply);
    return { authReply, game, catalog: this.catalog };
  }

  async prepareWithGm(commands) {
    const list = Array.isArray(commands) ? commands : [commands];
    for (const command of list.filter(Boolean)) {
      this.game.send("GMCommand", [command]);
      // GM 指令没有统一业务回包，不同指令可能触发 ErrCode、背包、奖励或货币更新。
      // 这里等待任一常见反馈，确保初始化命令已经被服务端处理过。
      await this.game.waitOneOf(["ErrCode", "UpdateBagOper", "NotifyRewardsItems", "UpdateMoney"], this.timeoutMs);
    }
  }

  async run(user, scenario, options = {}) {
    await this.bootstrap(user, options);
    try {
      // 用例生命周期：
      // init     做数据准备，通常是 GM、重置状态或查询前置数据。
      // logic    发送被测协议并返回关键回包。
      // validate 对回包和服务端推送做断言。
      if (scenario.init) {
        await scenario.init(this);
      }
      const result = scenario.logic ? await scenario.logic(this) : undefined;
      if (scenario.validate) {
        await scenario.validate(this, result);
      }
      return result;
    } finally {
      if (this.game) {
        this.game.close();
      }
    }
  }
}

module.exports = {
  ERR,
  ProtocolLifecycle,
  createAuthTuple,
};
