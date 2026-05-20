const tools = require("./protocol_tools");

function parseOptions(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === "--user" || item === "-u") {
      options.user = argv[++i];
    } else if (item === "--host" || item === "-h") {
      options.host = argv[++i];
    } else if (item === "--cases" || item === "-c") {
      options.cases = argv[++i];
    } else if (item === "--help") {
      options.help = true;
    } else {
      options._.push(item);
    }
  }
  return options;
}

function usage() {
  console.log([
    "协议自动化工具",
    "",
    "常用命令：",
    "  node test/tools/protocol_runner.js list",
    "  node test/tools/protocol_runner.js smoke --user qa_001 --host 192.168.110.17",
    "  node test/tools/protocol_runner.js run bag --user qa_001 --host 192.168.110.17 0",
    "  node test/tools/protocol_runner.js run gm --user qa_001 --host 192.168.110.17 additem 1001 10",
    "",
    "说明：",
    "  list              查看所有可用协议用例",
    "  smoke             执行默认冒烟用例",
    "  smoke --cases all 执行全部已登记用例",
    "  run <用例名>       单独执行一个用例，后面的参数按 list 展示填写",
  ].join("\n"));
}

function printCases() {
  const cases = tools.PROTOCOL_CASES;
  console.log("可用协议用例：");
  for (const name of tools.getCaseNames()) {
    const item = cases[name];
    const smoke = item.smoke ? "默认冒烟" : "可选";
    const args = item.args ? ` 参数：${item.args}` : "";
    console.log(`- ${name} [${smoke}] ${item.title}${args}`);
    console.log(`  ${item.description}`);
  }
}

function parseSmokeCases(input) {
  if (!input) {
    return tools.getDefaultSmokeCaseNames();
  }
  if (input === "all") {
    return tools.getCaseNames();
  }
  return input.split(",").map((item) => item.trim()).filter(Boolean);
}

async function main() {
  const command = process.argv[2];
  const options = parseOptions(process.argv.slice(3));

  if (!command || options.help) {
    usage();
    return;
  }

  if (command === "list") {
    printCases();
    return;
  }

  if (command === "smoke") {
    const cases = parseSmokeCases(options.cases);
    console.log(`开始冒烟：user=${options.user || "自动生成"} host=${options.host || process.env.PROTOCOL_HOST || "127.0.0.1"} cases=${cases.join(",")}`);
    const results = await tools.runSmoke({ user: options.user, host: options.host, cases });
    for (const item of results) {
      console.log(`[PASS] ${item.name} ${item.cost}ms`);
    }
    console.log(`冒烟通过：${results.length}/${results.length}`);
    return;
  }

  if (command === "run") {
    const name = options._[0];
    const args = options._.slice(1);
    if (!name) {
      throw new Error("缺少用例名，请先执行 list 查看可用用例");
    }
    console.log(`执行用例：${name}`);
    await tools.runCase(name, { user: options.user, host: options.host, args });
    console.log(`[PASS] ${name}`);
    return;
  }

  throw new Error(`未知命令：${command}`);
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
