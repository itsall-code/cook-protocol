const fs = require("fs");
const path = require("path");

function loadPylon(rootDir = path.resolve(__dirname, "../../..")) {
  const candidates = [
    process.env.PROTOCOL_PYLON,
    path.join(rootDir, "publish/bin/general/util/pylon.js"),
    path.join(rootDir, "publish/bin2/general/util/pylon.js"),
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return require(file).Pylon;
    }
  }

  throw new Error("Cannot find Pylon. Build publish/bin first or set PROTOCOL_PYLON.");
}

function createCodec(options = {}) {
  const Pylon = options.Pylon || loadPylon(options.rootDir);

  return {
    encode(tuple) {
      return tuple == null ? Buffer.alloc(0) : Buffer.from(Pylon.encode(tuple));
    },
    decode(buffer) {
      return !buffer || buffer.length === 0 ? null : Pylon.decode(buffer);
    },
  };
}

module.exports = {
  createCodec,
  loadPylon,
};
