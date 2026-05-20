const { clientPing, getHumanInfo } = require("../protocol/cases/base");
const { getBag } = require("../protocol/cases/bag");
const { getActorEquip, allEquipAddLevelOnekey } = require("../protocol/cases/equip_level");
const { equipQualityUp } = require("../protocol/cases/equip_quality");
const { luckyDraw } = require("../protocol/cases/lucky_draw");
const { getLuckStoreInfo, fireLuckStore, drawLuckStoreBigReward } = require("../protocol/cases/luck_store");

// QA 友好的用例注册表。
// 每个条目包含：
// - title：列表展示用的中文名称。
// - description：告诉使用者这个用例测什么。
// - smoke：是否适合放进默认冒烟。
// - build：把命令行参数转为真正的生命周期 case。
// 后续新增协议时优先登记到这里，run、smoke、脚本导入都能复用。
const PROTOCOL_CASES = {
  client_ping: {
    title: "客户端心跳",
    description: "发送 ClientPing，验证 ClientPingReply。",
    smoke: true,
    build: () => clientPing(),
  },
  human_info: {
    title: "主角信息",
    description: "发送 GetHumanInfo，验证主角基础信息回包。",
    smoke: true,
    build: () => getHumanInfo(),
  },
  bag: {
    title: "背包信息",
    description: "发送 GetBag，默认查询 0 号背包。",
    smoke: true,
    args: "bagType=0",
    build: (args) => getBag(Number(args[0] || 0)),
  },
  actor_equip: {
    title: "主角装备",
    description: "发送 GetActorEquip，验证主角装备回包。",
    smoke: true,
    build: () => getActorEquip(),
  },
  equip_level_all: {
    title: "全部装备一键升级",
    description: "发送 AllEquipAddLevelOnekey，验证升级回包。",
    smoke: false,
    build: () => allEquipAddLevelOnekey(),
  },
  equip_quality: {
    title: "装备升品",
    description: "发送 EquipQualityUp，需要传装备 uuid。",
    smoke: false,
    args: "uuid autoBuy=false",
    build: (args) => equipQualityUp(args[0], args[1] === "true" || args[1] === "1"),
  },
  lucky: {
    title: "幸运抽奖",
    description: "发送宠物/新版宠物/时装活动幸运抽奖协议。",
    smoke: false,
    args: "pet|petNew|fashion jsonTuple",
    build: (args) => luckyDraw(args[0], args[1] ? JSON.parse(args[1]) : null),
  },
  luck_store_info: {
    title: "好运卖场信息",
    description: "发送 GetLuckStoreInfo，验证活动信息回包。",
    smoke: false,
    build: () => getLuckStoreInfo(),
  },
  luck_store_fire: {
    title: "好运卖场发射弹珠",
    description: "发送 LuckStoreFireSarbles，默认角度 270。",
    smoke: false,
    args: "angle=270 multi=0",
    build: (args) => fireLuckStore(Number(args[0] || 270), Number(args[1] || 0)),
  },
  luck_store_big_reward: {
    title: "好运卖场领取大奖",
    description: "发送 LuckStoreBigRewardDraw，验证领取回包。",
    smoke: false,
    build: () => drawLuckStoreBigReward(),
  },
  gm: {
    title: "GM 指令",
    description: "发送 GMCommand，用于准备账号数据。",
    smoke: false,
    args: "command...",
    build: (args) => {
      const command = args.join(" ");
      if (!command) {
        throw new Error("GM 指令不能为空，例如：gm additem 1001 10");
      }
      return {
        name: "gm",
        async logic(ctx) {
          await ctx.prepareWithGm(command);
        },
      };
    },
  },
};

function getCaseNames() {
  return Object.keys(PROTOCOL_CASES);
}

function getDefaultSmokeCaseNames() {
  return getCaseNames().filter((name) => PROTOCOL_CASES[name].smoke);
}

function buildCase(name, args = []) {
  const item = PROTOCOL_CASES[name];
  if (!item) {
    throw new Error(`未知用例：${name}，可用 node test/tools/protocol_runner.js list 查看`);
  }
  const scenario = item.build(args);
  scenario.name = scenario.name || name;
  return scenario;
}

function buildCases(names, argsByName = {}) {
  return names.map((name) => buildCase(name, argsByName[name] || []));
}

module.exports = {
  PROTOCOL_CASES,
  getCaseNames,
  getDefaultSmokeCaseNames,
  buildCase,
  buildCases,
};
