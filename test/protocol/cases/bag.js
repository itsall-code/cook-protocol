const { assertNoErrCode, assertProtocol, assertTupleShape } = require("../validate/assertions");

function getBag(bagType = 0) {
  return {
    async logic(ctx) {
      ctx.game.send("GetBag", [bagType]);
      return ctx.game.waitOneOf(["GetBagReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "GetBagReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  getBag,
};
