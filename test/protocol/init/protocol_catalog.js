const fs = require("fs");
const path = require("path");

const DEFAULT_PROTOCOL_FILE = path.resolve(__dirname, "../../../libs/generate/protocols.d.ts");

// 协议目录是整个自动化框架的数据源。
// 它从 generate 出来的 d.ts 里提取三类信息：
// 1. 协议名和 opcode，例如 UserGameOpcode.GetBag -> 0x2001f4。
// 2. 协议名和 tuple 类型，例如 GetBag -> [number]。
// 3. tuple 字段名，例如 GetBagFields.type -> 下标 0。
// 后续新增协议时通常不需要改这里，只要重新生成 libs/generate/protocols.d.ts。

function parseNumber(text) {
  return Number(text.trim());
}

function splitTupleFields(typeText) {
  const body = typeText.trim();
  if (body === "null") {
    return [];
  }
  if (!body.startsWith("[") || !body.endsWith("]")) {
    return [];
  }

  const fields = [];
  let depth = 0;
  let start = 1;
  // tuple 字段里可能有 Array<Pair> 这种泛型，也可能嵌套数组。
  // 只有在最外层逗号处分割，避免把 Array<number> 之类拆坏。
  for (let i = 1; i < body.length - 1; i++) {
    const ch = body[i];
    if (ch === "<" || ch === "[" || ch === "(") {
      depth++;
    } else if (ch === ">" || ch === "]" || ch === ")") {
      depth--;
    } else if (ch === "," && depth === 0) {
      fields.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = body.slice(start, -1).trim();
  if (last) {
    fields.push(last);
  }
  return fields;
}

function parseFieldNames(source) {
  const result = {};
  const re = /const enum\s+(\w+)Fields\s*{([\s\S]*?)\n\t}/g;
  let match;
  while ((match = re.exec(source))) {
    const tupleName = match[1];
    const fields = {};
    const fieldRe = /\b(\w+)\s*=\s*(\d+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRe.exec(match[2]))) {
      fields[parseNumber(fieldMatch[2])] = fieldMatch[1];
    }
    result[tupleName] = fields;
  }
  return result;
}

function parseTypes(source, fieldNames) {
  const result = {};
  const re = /type\s+(\w+)\s*=\s*([^;]+);/g;
  let match;
  while ((match = re.exec(source))) {
    const name = match[1];
    const typeText = match[2].trim();
    result[name] = {
      name,
      type: typeText,
      fields: splitTupleFields(typeText).map((type, index) => ({
        index,
        name: fieldNames[name] && fieldNames[name][index] ? fieldNames[name][index] : String(index),
        type,
      })),
    };
  }
  return result;
}

function parseOpcodes(source) {
  const result = {};
  const enumRe = /const enum\s+(\w+Opcode)\s*{([\s\S]*?)\n\t}/g;
  let enumMatch;
  while ((enumMatch = enumRe.exec(source))) {
    const group = enumMatch[1];
    const itemRe = /\b(\w+)\s*=\s*(0x[0-9a-fA-F]+|\d+)/g;
    let itemMatch;
    while ((itemMatch = itemRe.exec(enumMatch[2]))) {
      const name = itemMatch[1];
      const opcode = parseNumber(itemMatch[2]);
      result[name] = { name, opcode, group };
    }
  }
  return result;
}

function parseMappings(source, opcodes, types) {
  const byName = {};
  const byOpcode = {};
  const re = /\[(\w+Opcode)\.(\w+)\]:\s*(\w+)/g;
  let match;
  while ((match = re.exec(source))) {
    const opcodeName = match[2];
    const typeName = match[3];
    const opcodeInfo = opcodes[opcodeName];
    if (!opcodeInfo) {
      continue;
    }
    const item = {
      ...opcodeInfo,
      typeName,
      tuple: types[typeName] || { name: typeName, type: "unknown", fields: [] },
    };
    byName[opcodeName] = item;
    byOpcode[opcodeInfo.opcode] = item;
  }
  return { byName, byOpcode };
}

function loadProtocolCatalog(file = DEFAULT_PROTOCOL_FILE) {
  const source = fs.readFileSync(file, "utf8");
  const fieldNames = parseFieldNames(source);
  const types = parseTypes(source, fieldNames);
  const opcodes = parseOpcodes(source);
  const mappings = parseMappings(source, opcodes, types);

  // 对外只暴露稳定查询能力：按名称查、按 opcode 反查、按名称取 opcode。
  // 用例层不应该硬编码数字协议号，保证协议变更后只依赖生成文件。
  return {
    file,
    types,
    opcodes,
    byName: mappings.byName,
    byOpcode: mappings.byOpcode,
    get(name) {
      const item = mappings.byName[name];
      if (!item) {
        throw new Error(`protocol not found: ${name}`);
      }
      return item;
    },
    nameOf(opcode) {
      const item = mappings.byOpcode[opcode];
      return item ? item.name : `0x${opcode.toString(16)}`;
    },
    opcodeOf(name) {
      return this.get(name).opcode;
    },
  };
}

module.exports = {
  loadProtocolCatalog,
};
