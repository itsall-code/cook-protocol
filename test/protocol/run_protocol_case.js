const { ProtocolLifecycle } = require("./logic/lifecycle");
const { getBag } = require("./cases/bag");
const { equipQualityUp } = require("./cases/equip_quality");
const { getActorEquip, allEquipAddLevelOnekey } = require("./cases/equip_level");
const { luckyDraw } = require("./cases/lucky_draw");
const { getLuckStoreInfo, fireLuckStore, drawLuckStoreBigReward } = require("./cases/luck_store");

// 单协议调试入口。
// 和 run_smoke.js 使用同一套 case 生命周期，适合定位某一个协议失败原因。

function usage() {
  console.log([
    "Usage:",
    "  node test/protocol/run_protocol_case.js <case> [user] [host] [...args]",
    "",
    "Cases:",
    "  bag [bagType]",
    "  actor_equip",
    "  equip_level_all",
    "  equip_quality <uuid> [autoBuy]",
    "  lucky <pet|petNew|fashion> <jsonTuple>",
    "  luck_store_info",
    "  luck_store_fire [angle] [multi]",
    "  luck_store_big_reward",
    "  gm <command...>",
    "",
    "Examples:",
    "  node test/protocol/run_protocol_case.js bag test_001 192.168.110.17 0",
    "  node test/protocol/run_protocol_case.js gm test_001 192.168.110.17 additem 1001 10",
    "  node test/protocol/run_protocol_case.js lucky test_001 192.168.110.17 pet [1]",
  ].join("\n"));
}

function buildScenario(name, args) {
  // 这里负责把命令行参数转成具体 case。
  // case 内部只关心业务 tuple，不关心参数来自命令行还是冒烟配置。
  if (name === "bag") {
    return getBag(Number(args[0] || 0));
  }
  if (name === "actor_equip") {
    return getActorEquip();
  }
  if (name === "equip_level_all") {
    return allEquipAddLevelOnekey();
  }
  if (name === "equip_quality") {
    return equipQualityUp(args[0], args[1] === "true" || args[1] === "1");
  }
  if (name === "lucky") {
    return luckyDraw(args[0], args[1] ? JSON.parse(args[1]) : null);
  }
  if (name === "luck_store_info") {
    return getLuckStoreInfo();
  }
  if (name === "luck_store_fire") {
    return fireLuckStore(Number(args[0] || 270), Number(args[1] || 0));
  }
  if (name === "luck_store_big_reward") {
    return drawLuckStoreBigReward();
  }
  if (name === "gm") {
    const command = args.join(" ");
    if (!command) {
      throw new Error("missing gm command");
    }
    return {
      async logic(ctx) {
        await ctx.prepareWithGm(command);
      },
    };
  }
  throw new Error(`unknown case: ${name}`);
}

async function main() {
  const caseName = process.argv[2];
  if (!caseName || caseName === "-h" || caseName === "--help") {
    usage();
    return;
  }

  const user = process.argv[3] || `protocol_${Date.now()}`;
  const host = process.argv[4] || process.env.PROTOCOL_HOST || "127.0.0.1";
  const args = process.argv.slice(5);
  const lifecycle = new ProtocolLifecycle({ host });
  const scenario = buildScenario(caseName, args);
  await lifecycle.run(user, scenario);
  console.log(`case ${caseName} passed`);
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
