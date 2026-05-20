const { ProtocolLifecycle } = require("./logic/lifecycle");
const { buildSmokeCases, DEFAULT_SMOKE_CASES, SMOKE_CASES } = require("./smoke_cases");

// 冒烟入口：一次认证登录，多协议串行执行。
// 这样可以减少建连成本，也能覆盖“登录后连续协议调用”的真实客户端场景。

function usage() {
  console.log([
    "Usage:",
    "  node test/protocol/run_smoke.js [user] [host] [case1,case2|all]",
    "",
    "Default cases:",
    `  ${DEFAULT_SMOKE_CASES.join(", ")}`,
    "",
    "Available cases:",
    `  ${Object.keys(SMOKE_CASES).join(", ")}`,
    "",
    "Examples:",
    "  node test/protocol/run_smoke.js smoke_001 192.168.110.17",
    "  node test/protocol/run_smoke.js smoke_001 192.168.110.17 all",
    "  node test/protocol/run_smoke.js smoke_001 192.168.110.17 client_ping,bag",
  ].join("\n"));
}

async function runScenario(ctx, scenario) {
  const startedAt = Date.now();
  // 保持和单协议 runner 一致的生命周期，让用例能在冒烟和单跑之间复用。
  if (scenario.init) {
    await scenario.init(ctx);
  }
  const result = scenario.logic ? await scenario.logic(ctx) : undefined;
  if (scenario.validate) {
    await scenario.validate(ctx, result);
  }
  return Date.now() - startedAt;
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    return;
  }

  const user = process.argv[2] || process.env.SMOKE_USER || `smoke_${Date.now()}`;
  const host = process.argv[3] || process.env.PROTOCOL_HOST || "127.0.0.1";
  const caseInput = process.argv[4] || process.env.SMOKE_CASES || "";
  const cases = buildSmokeCases(caseInput);
  const ctx = new ProtocolLifecycle({ host });
  const results = [];

  console.log(`smoke user=${user} host=${host} cases=${cases.map((item) => item.name).join(",")}`);
  // 冒烟只登录一次；后续所有协议共用 ctx.game。
  await ctx.bootstrap(user);

  try {
    for (const scenario of cases) {
      process.stdout.write(`[RUN] ${scenario.name} ... `);
      try {
        const cost = await runScenario(ctx, scenario);
        results.push({ name: scenario.name, ok: true, cost });
        console.log(`PASS ${cost}ms`);
      } catch (err) {
        results.push({ name: scenario.name, ok: false, error: err });
        console.log("FAIL");
        throw err;
      }
    }
  } finally {
    if (ctx.game) {
      ctx.game.close();
    }
  }

  const total = results.reduce((sum, item) => sum + item.cost, 0);
  console.log(`smoke passed: ${results.length}/${results.length}, cost=${total}ms`);
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
