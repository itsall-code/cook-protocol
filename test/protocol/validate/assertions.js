function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 验证层只放可复用的通用断言。
// 业务字段校验应该写在具体 case 的 validate 中，避免公共断言越来越臃肿。

function assertProtocol(msg, name) {
  assert(msg && msg.name === name, `expected ${name}, got ${msg ? msg.name : "null"}`);
}

function assertCodeOk(msg, label = msg && msg.name) {
  // 大部分登录、认证和业务返回约定 tuple[0] 是错误码。
  assert(Array.isArray(msg.tuple), `${label} reply tuple is not an array`);
  assert(msg.tuple[0] === 0, `${label} failed: ${JSON.stringify(msg.tuple)}`);
}

function assertNoErrCode(msg) {
  assert(msg.name !== "ErrCode", `server returned ErrCode: ${JSON.stringify(msg.tuple)}`);
}

function assertTupleShape(catalog, msg) {
  const meta = catalog.byOpcode[msg.opcode];
  assert(meta, `unknown opcode: 0x${msg.opcode.toString(16)}`);
  if (meta.tuple.type === "null") {
    assert(msg.tuple == null, `${meta.name} expected null tuple`);
    return;
  }
  // 这里只做“协议结构级”校验：是否数组、长度是否满足 d.ts 声明。
  // 更细的字段取值范围留给业务用例，保证框架对所有协议通用。
  assert(Array.isArray(msg.tuple), `${meta.name} expected tuple array`);
  assert(
    msg.tuple.length >= meta.tuple.fields.length,
    `${meta.name} tuple length ${msg.tuple.length} < ${meta.tuple.fields.length}`,
  );
}

module.exports = {
  assert,
  assertProtocol,
  assertCodeOk,
  assertNoErrCode,
  assertTupleShape,
};
