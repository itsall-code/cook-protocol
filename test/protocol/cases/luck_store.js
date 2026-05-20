const { assertNoErrCode, assertProtocol, assertTupleShape } = require("../validate/assertions");

function getLuckStoreInfo() {
  return {
    async logic(ctx) {
      ctx.game.send("GetLuckStoreInfo", null);
      return ctx.game.waitOneOf(["GetLuckStoreInfoReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "GetLuckStoreInfoReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

function fireLuckStore(angle = 270, multi = 0) {
  return {
    async init(ctx) {
      await ctx.prepareWithGm("additem 1027 1");
    },
    async logic(ctx) {
      ctx.game.send("LuckStoreFireSarbles", [angle, multi]);
      return ctx.game.waitOneOf(["LuckStoreFireSarblesReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "LuckStoreFireSarblesReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

function drawLuckStoreBigReward() {
  return {
    async logic(ctx) {
      ctx.game.send("LuckStoreBigRewardDraw", null);
      return ctx.game.waitOneOf(["LuckStoreBigRewardDrawReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "LuckStoreBigRewardDrawReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  getLuckStoreInfo,
  fireLuckStore,
  drawLuckStoreBigReward,
};
