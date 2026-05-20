function gmPrepare(commands) {
  return {
    async init(ctx) {
      await ctx.prepareWithGm(commands);
    },
  };
}

module.exports = {
  gmPrepare,
};
