// Minimal ESM -> CJS bridge: duplicate ESM output to CJS filename
// This keeps the package export map working without a bundler.
const fs = require("fs");
const path = require("path");

const esm = path.join(__dirname, "..", "dist", "index.js");
const cjs = path.join(__dirname, "..", "dist", "index.cjs");

if (fs.existsSync(esm)) {
  fs.copyFileSync(esm, cjs);
}
