const { ProtocolLifecycle } = require("../protocol/logic/lifecycle");
const {
  PROTOCOL_CASES,
  getCaseNames,
  getDefaultSmokeCaseNames,
  buildCase,
  buildCases,
} = require("./protocol_case_registry");

// 给测试脚本导入的统一工具文件。
// 示例：
// const tools = require("./test/tools/protocol_tools");
// await tools.runCase("bag", { user: "qa_001", host: "192.168.110.17", args: [0] });

async function runScenario(ctx, scenario) {
  if (scenario.init) {
    await scenario.init(ctx);
  }
  const result = scenario.logic ? await scenario.logic(ctx) : undefined;
  if (scenario.validate) {
    await scenario.validate(ctx, result);
  }
  return result;
}

async function withLogin(options, fn) {
  const user = options.user || `qa_${Date.now()}`;
  const host = options.host || process.env.PROTOCOL_HOST || "127.0.0.1";
  const ctx = new ProtocolLifecycle({ host, logger: options.logger || console });

  await ctx.bootstrap(user, options.auth || {});
  try {
    return await fn(ctx);
  } finally {
    if (ctx.game) {
      ctx.game.close();
    }
  }
}

async function runCase(name, options = {}) {
  const scenario = buildCase(name, options.args || []);
  return withLogin(options, async (ctx) => runScenario(ctx, scenario));
}

async function runCases(names, options = {}) {
  const scenarios = buildCases(names, options.argsByName || {});
  return withLogin(options, async (ctx) => {
    const results = [];
    for (const scenario of scenarios) {
      const startedAt = Date.now();
      await runScenario(ctx, scenario);
      results.push({ name: scenario.name, cost: Date.now() - startedAt });
    }
    return results;
  });
}

async function runSmoke(options = {}) {
  const names = options.cases && options.cases.length ? options.cases : getDefaultSmokeCaseNames();
  return runCases(names, options);
}

module.exports = {
  PROTOCOL_CASES,
  getCaseNames,
  getDefaultSmokeCaseNames,
  buildCase,
  buildCases,
  runCase,
  runCases,
  runSmoke,
  withLogin,
};
