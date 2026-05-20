const { clientPing, getHumanInfo } = require("./cases/base");
const { getBag } = require("./cases/bag");
const { getActorEquip } = require("./cases/equip_level");
const { getLuckStoreInfo } = require("./cases/luck_store");

// 冒烟注册表。
// key 是命令行和环境变量里使用的稳定名称，value 是 case 工厂函数。
// 新增冒烟协议时，优先在 cases/ 下实现生命周期对象，再在这里登记。
const SMOKE_CASES = {
  client_ping: clientPing,
  human_info: getHumanInfo,
  bag: () => getBag(0),
  actor_equip: getActorEquip,
  luck_store_info: getLuckStoreInfo,
};

const DEFAULT_SMOKE_CASES = [
  "client_ping",
  "human_info",
  "bag",
  "actor_equip",
];

function parseCaseNames(input) {
  if (!input) {
    return DEFAULT_SMOKE_CASES;
  }
  if (input === "all") {
    return Object.keys(SMOKE_CASES);
  }
  return input.split(",").map((item) => item.trim()).filter(Boolean);
}

function buildSmokeCases(input) {
  return parseCaseNames(input).map((name) => {
    const factory = SMOKE_CASES[name];
    if (!factory) {
      throw new Error(`unknown smoke case: ${name}`);
    }
    const scenario = factory();
    // 每个 scenario 可以自定义 name；没有时使用注册表 key，方便统一输出。
    scenario.name = scenario.name || name;
    return scenario;
  });
}

module.exports = {
  DEFAULT_SMOKE_CASES,
  SMOKE_CASES,
  buildSmokeCases,
};
