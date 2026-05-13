import { compilePack } from "@foundryvtt/foundryvtt-cli";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_ROOT = path.join(ROOT, "packs", "_source");
const OUTPUT_ROOT = path.join(ROOT, "packs");

// Regenerate the macro source files first. The relink macro in particular
// is emitted by a separate generator (build-macro-pack.mjs) rather than
// being hand-edited, so we must always rebuild it before compiling the
// module-macros pack — otherwise it silently drops out of the release.
console.log("Regenerating macro sources ...");
execSync("node " + JSON.stringify(path.join(HERE, "build-macro-pack.mjs")), {
  cwd: ROOT,
  stdio: "inherit"
});

const PACKS = [
  "welcome",
  "module-macros",
  "phase-1-journals",
  "phase-1-actors",
  "phase-1-scenes",
  "phase-2-journals",
  "phase-2-actors",
  "phase-2-scenes",
  "phase-3-journals",
  "phase-3-actors",
  "phase-3-scenes",
  "phase-4-journals",
  "phase-4-actors",
  "phase-4-scenes",
  "phase-5-journals",
  "phase-5-actors",
  "phase-5-scenes",
  "sandbox-journals",
  "sandbox-actors",
  "phase-6-journals",
  "phase-6-actors",
  "phase-6-scenes",
  "phase-7-journals",
  "phase-7-actors",
  "phase-8-journals",
  "phase-8-actors",
  "phase-9-journals",
  "phase-9-actors",
  "pc-threads",
  "aerdy-network",
  "aerdy-network-actors",
  "world-stakes",
  "relief-scenes"
];

for (const pack of PACKS) {
  const src = path.join(SOURCE_ROOT, pack);
  const dst = path.join(OUTPUT_ROOT, pack);
  console.log(`Compiling ${pack} ...`);
  await compilePack(src, dst, { yaml: false, log: false });
  console.log(`  -> ${dst}`);
}

console.log("Done.");
