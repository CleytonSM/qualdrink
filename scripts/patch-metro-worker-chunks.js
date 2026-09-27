/**
 * Keeps expo-sqlite working on web until the published packages catch up.
 *
 * 1. expo/expo#50244: with web.output "static", lazy dev bundles omit the
 *    SQLite worker and @expo/metro-config@57.0.12 throws "Worker chunk not found".
 * 2. expo-sqlite writes the sync result length with Uint8Array.set, which keeps
 *    only length % 256. Rows larger than that fail JSON.parse on web.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "@expo",
  "metro-config",
  "build",
  "serializer",
  "serializeChunks.js",
);

const marker = "if (isWorker && options.includeAsyncPaths)";
const needle = `else if (asyncType &&
                // Workers require standalone bundles even when ordinary chunk splitting is disabled.
                (isWorker || splitChunks)) {
                const asyncChunks = gatherChunks`;
const patched = `else if (asyncType &&
                // Workers require standalone bundles even when ordinary chunk splitting is disabled.
                (isWorker || splitChunks)) {
                if (isWorker && options.includeAsyncPaths) {
                    continue;
                }
                const asyncChunks = gatherChunks`;

if (!fs.existsSync(file)) {
  console.warn("metro worker patch: @expo/metro-config serializer not installed, skipping");
} else {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes(marker)) {
    // already patched or published with the fix
  } else if (!source.includes(needle)) {
    console.warn(
      "metro worker patch: serializeChunks.js layout changed, skipping. Upgrade @expo/metro-config if web bundling still fails.",
    );
  } else {
    fs.writeFileSync(file, source.replace(needle, patched));
    console.log("metro worker patch: skipped worker chunks in lazy development bundles");
  }
}

patchSqliteSyncLength();

function patchSqliteSyncLength() {
  const channel = path.join(__dirname, "..", "node_modules", "expo-sqlite", "web", "WorkerChannel.ts");
  if (!fs.existsSync(channel)) {
    console.warn("sqlite sync patch: WorkerChannel.ts not installed, skipping");
    return;
  }
  const current = fs.readFileSync(channel, "utf8");
  const broken = "resultArray.set(new Uint32Array([length]), 0);";
  const fixed = "new Uint32Array(resultBuffer, 0, 1)[0] = length;";
  if (current.includes(fixed) || !current.includes(broken)) {
    return;
  }
  fs.writeFileSync(channel, current.replace(broken, fixed));
  console.log("sqlite sync patch: write the full result length into the shared buffer");
}
