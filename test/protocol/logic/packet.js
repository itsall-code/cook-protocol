function pack(opcode, tuple, codec) {
  const body = codec.encode(tuple);
  const out = Buffer.allocUnsafe(2 + 4 + body.length);
  let offset = 0;
  out.writeUInt16LE(out.length, offset);
  offset += 2;
  out.writeUInt32LE(opcode, offset);
  offset += 4;
  body.copy(out, offset);
  return out;
}

function unpack(data, codec, catalog) {
  const buffer = Buffer.from(data);
  if (buffer.length < 7) {
    throw new Error(`bad packet length: ${buffer.length}`);
  }

  const size = buffer.readUInt16LE(0);
  if (size !== buffer.length) {
    throw new Error(`bad packet size ${size} != ${buffer.length}`);
  }

  const opcode = buffer.readUInt32LE(2);
  const zip = buffer.readUInt8(6);
  if (zip !== 0) {
    throw new Error(`zip reply is not supported by protocol tester: ${catalog.nameOf(opcode)}`);
  }

  return {
    opcode,
    name: catalog.nameOf(opcode),
    tuple: codec.decode(buffer.slice(7)),
  };
}

module.exports = {
  pack,
  unpack,
};
