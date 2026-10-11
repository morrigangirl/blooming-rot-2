#!/usr/bin/env node
// Calendar lint for packs/_source (fix ledger YEAR-01 and CAL-01).
//
// Every in-world date has to be one the Greyhawk calendar can produce:
//   - a CY year from 1 to 600 (the campaign runs 584–586 CY; history may sit
//     earlier, and nothing in-world is dated in four digits),
//   - a month from the Greyhawk calendar wherever a date names one,
//   - no Earth weekdays (the Greyhawk week runs Starday … Freeday).
//
// Scans string values only, so map sizes and coordinates never match.
// Exits 1 with file, document path and context for each problem.
//
//   node scripts/lint-calendar.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "packs", "_source");

const MONTHS = new Set([
  "Needfest", "Fireseek", "Readying", "Coldeven", "Growfest", "Planting", "Flocktime", "Wealsun",
  "Richfest", "Reaping", "Goodmonth", "Harvester", "Brewfest", "Patchwall", "Ready'reat", "Sunsebb",
]);
const EARTH_WEEKDAYS = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)s?\b/g;
const CY_YEAR = /\b(\d{1,5})\s*CY\b/g;
// Bare four-digit years in prose ("in 1571", "the 1550s", "from 1554 to 1576"). The rules
// editions (D&D 2014, 2024) are not in-world dates.
const BARE_YEAR = /\b(?:in|since|from|until|to|of|the)\s+([1-4]\d{3})s?\b/gi;
const EDITIONS = new Set(["2014", "2024"]);
// "14th of Patchwall", "[Patchwall 28]", "Readying, 574 CY", "Patchwall 574 CY"
const DATED_MONTH = [
  /\b\d{1,2}(?:st|nd|rd|th)\s+of\s+([A-Z][a-z']+)/g,
  /\[([A-Z][a-z']+)\s+\d{1,2}\]/g,
  /\b([A-Z][a-z']+),?\s+\d{1,3}\s*CY\b/g,
];
// Words that can sit in those shapes without being a month name.
const NOT_A_MONTH = new Set(["Year", "Day", "Week", "Month", "Season", "Quarter", "Autumn", "Spring", "Summer", "Winter", "Early", "Late", "Mid", "In", "Since", "By", "Of", "The"]);

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
const problems = [];

function* strings(node, where) {
  if (typeof node === "string") yield [where, node];
  else if (Array.isArray(node)) for (let i = 0; i < node.length; i++) yield* strings(node[i], `${where}[${i}]`);
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) yield* strings(v, where ? `${where}.${k}` : k);
}

for (const pack of fs.readdirSync(SOURCE).sort()) {
  const dir = path.join(SOURCE, pack);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")); } catch { continue; }
    for (const [where, raw] of strings(doc, "")) {
      if (/(^|\.)(_key|_id|src|img)$/.test(where)) continue;
      const text = strip(raw);
      const report = (kind, m) => problems.push(
        `${pack}/${file} ${where}\n    ${kind}: …${text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 30).replace(/\s+/g, " ")}…`);
      for (const m of text.matchAll(CY_YEAR)) if (+m[1] < 1 || +m[1] > 600) report(`CY year ${m[1]} outside 1–600`, m);
      for (const m of text.matchAll(BARE_YEAR)) if (!EDITIONS.has(m[1])) report(`four-digit year ${m[1]}`, m);
      for (const m of text.matchAll(EARTH_WEEKDAYS)) report(`Earth weekday "${m[1]}"`, m);
      for (const re of DATED_MONTH) for (const m of text.matchAll(re)) {
        if (!MONTHS.has(m[1]) && !NOT_A_MONTH.has(m[1])) report(`"${m[1]}" is not a Greyhawk month`, m);
      }
    }
  }
}

if (problems.length) {
  console.error(`Calendar lint: ${problems.length} problem(s)\n` + problems.join("\n"));
  process.exit(1);
}
console.log("Calendar lint: clean.");
