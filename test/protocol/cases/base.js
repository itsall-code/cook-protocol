const { assertNoErrCode, assertProtocol, assertTupleShape } = require("../validate/assertions");

function clientPing() {
  return {
    name: "client_ping",
    async logic(ctx) {
      ctx.game.send("ClientPing", null);
      return ctx.game.waitOneOf(["ClientPingReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "ClientPingReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

function getHumanInfo() {
  return {
    name: "human_info",
    async logic(ctx) {
      ctx.game.send("GetHumanInfo", null);
      return ctx.game.waitOneOf(["GetHumanInfoReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "GetHumanInfoReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  clientPing,
  getHumanInfo,
};
