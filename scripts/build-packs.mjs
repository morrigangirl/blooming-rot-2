import { compilePack } from "@foundryvtt/foundryvtt-cli";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE_ROOT = path.join(ROOT, "packs", "_source");
const OUTPUT_ROOT = path.join(ROOT, "packs");

const PACKS = [
  "phase-1-journals",
  "phase-1-actors",
  "phase-1-scenes",
  "phase-2-journals",
  "phase-2-actors",
  "phase-3-journals",
  "phase-3-actors",
  "phase-4-journals",
  "phase-4-actors",
  "phase-5-journals",
  "phase-5-actors",
  "sandbox-journals",
  "module-macros"
];

for (const pack of PACKS) {
  const src = path.join(SOURCE_ROOT, pack);
  const dst = path.join(OUTPUT_ROOT, pack);
  console.log(`Compiling ${pack} ...`);
  await compilePack(src, dst, { yaml: false, log: false });
  console.log(`  -> ${dst}`);
}

console.log("Done.");
