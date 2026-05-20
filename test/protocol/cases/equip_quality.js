const { assertNoErrCode, assertProtocol, assertTupleShape } = require("../validate/assertions");

function equipQualityUp(uuid, autoBuy = false) {
  return {
    async logic(ctx) {
      ctx.game.send("EquipQualityUp", [uuid, autoBuy]);
      return ctx.game.waitOneOf(["EquipQualityUpReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "EquipQualityUpReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  equipQualityUp,
};
