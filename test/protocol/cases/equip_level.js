const { assertNoErrCode, assertProtocol, assertTupleShape } = require("../validate/assertions");

function getActorEquip() {
  return {
    async logic(ctx) {
      ctx.game.send("GetActorEquip", null);
      return ctx.game.waitOneOf(["GetActorEquipReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "GetActorEquipReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

function allEquipAddLevelOnekey() {
  return {
    async logic(ctx) {
      ctx.game.send("AllEquipAddLevelOnekey", null);
      return ctx.game.waitOneOf(["AllEquipAddLevelReply", "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      assertProtocol(msg, "AllEquipAddLevelReply");
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  getActorEquip,
  allEquipAddLevelOnekey,
};
