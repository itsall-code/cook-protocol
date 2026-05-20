const WebSocket = require("ws");
const { pack, unpack } = require("./packet");

// 单条 WebSocket 连接的最小封装。
// 这里刻意不放登录、创角等业务流程，只负责：
// - 连接和关闭
// - 根据协议名发送 tuple
// - 等待一个或多个目标回包
// 这样 smoke、单协议调试、后续压测脚本都能复用同一套收发能力。
class ProtocolSession {
  constructor({ url, catalog, codec, logger = console, timeoutMs = 8000 }) {
    this.url = url;
    this.catalog = catalog;
    this.codec = codec;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ws.terminate();
        reject(new Error(`timeout connecting ${this.url}`));
      }, this.timeoutMs);

      this.ws.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    return this;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  send(nameOrOpcode, tuple) {
    const opcode = typeof nameOrOpcode === "number" ? nameOrOpcode : this.catalog.opcodeOf(nameOrOpcode);
    this.logger.log("->", this.catalog.nameOf(opcode), JSON.stringify(tuple));
    this.ws.send(pack(opcode, tuple, this.codec));
  }

  waitOneOf(namesOrOpcodes, timeoutMs = this.timeoutMs) {
    const wants = new Set(namesOrOpcodes.map((item) => (typeof item === "number" ? item : this.catalog.opcodeOf(item))));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`timeout waiting ${namesOrOpcodes.join(", ")}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.ws.off("message", onMessage);
        this.ws.off("error", onError);
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const onMessage = (data) => {
        try {
          const msg = unpack(data, this.codec, this.catalog);
          this.logger.log("<-", msg.name, JSON.stringify(msg.tuple));
          // 服务端可能先推送红点、背包、货币等旁路更新。
          // 冒烟只在目标协议出现时返回，其余消息打印后继续等待。
          if (wants.has(msg.opcode)) {
            cleanup();
            resolve(msg);
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      this.ws.on("message", onMessage);
      this.ws.once("error", onError);
    });
  }

  wait(nameOrOpcode, timeoutMs = this.timeoutMs) {
    return this.waitOneOf([nameOrOpcode], timeoutMs);
  }
}

module.exports = {
  ProtocolSession,
};
