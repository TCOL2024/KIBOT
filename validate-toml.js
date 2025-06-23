// validate-toml.js
const fs = require("fs");
const toml = require("toml");
try {
  const content = fs.readFileSync("netlify.toml", "utf8");
  toml.parse(content);
  console.log("✅ netlify.toml ist syntaktisch korrekt.");
} catch (err) {
  console.error("❌ Parsing-Fehler in netlify.toml:", err.message);
  process.exit(1);
}
