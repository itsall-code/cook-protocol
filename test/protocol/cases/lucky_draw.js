const { assertNoErrCode, assertTupleShape } = require("../validate/assertions");

const LUCKY_DRAWS = {
  pet: ["PetAdventureLuckyDraw", "PetAdventureLuckyDrawReply"],
  petNew: ["PetAdventureNewLuckyDraw", "PetAdventureNewLuckyDrawReply"],
  fashion: ["FashionActiveLuckyDraw", "FashionActiveLuckyDrawReply"],
};

function luckyDraw(kind, tuple) {
  const pair = LUCKY_DRAWS[kind];
  if (!pair) {
    throw new Error(`unknown lucky draw kind: ${kind}`);
  }
  const [request, reply] = pair;

  return {
    async logic(ctx) {
      ctx.game.send(request, tuple);
      return ctx.game.waitOneOf([reply, "ErrCode"]);
    },
    async validate(ctx, msg) {
      assertNoErrCode(msg);
      if (msg.name !== reply) {
        throw new Error(`expected ${reply}, got ${msg.name}`);
      }
      assertTupleShape(ctx.catalog, msg);
    },
  };
}

module.exports = {
  luckyDraw,
  LUCKY_DRAWS,
};
