#!/usr/bin/env node
// Generate the Phase 6+ utility macros pack.
//
// Two macros:
//   1. "BR2 — Phase Clock Tracker" — opens a dialog, GM sets the current
//      phase, the Haskur Trail Clock, and the Greyhawk Heat Clock; the
//      values persist in a world-level flag and can be reported at any
//      time.
//   2. "BR2 — Campaign State Snapshot" — produces a chat report
//      summarising the current state across all carry-forward variables
//      (Sereth path, Closure motion, Pell's fate, Quill's outcome, Lies
//      1-5, current phase, current clock state).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_DIR = path.join(ROOT, "packs", "_source", "module-macros");
fs.mkdirSync(OUT_DIR, { recursive: true });

const STATS_BLOCK = {
  compendiumSource: null,
  duplicateSource: null,
  exportSource: null,
  coreVersion: "13.351",
  systemId: "dnd5e",
  systemVersion: "5.3.0",
  createdTime: null,
  modifiedTime: null,
  lastModifiedBy: null
};

const phaseClockMacroId = "BR2MacroPhaseCl";
const phaseClockCommand = `(async () => {
  if (!game.user.isGM) { ui.notifications.warn("BR2 Phase Clock: GM only."); return; }
  const FLAG_NS = "blooming-rot-2";
  const FLAG_KEY = "phase-clocks";
  const current = game.world.getFlag(FLAG_NS, FLAG_KEY) ?? { phase: 1, trailClock: 0, heatClock: 0 };
  const html = '<form><p>Set the current phase and clock state.</p>' +
    '<div class="form-group"><label>Phase (1-9):</label><input type="number" name="phase" min="1" max="9" value="' + current.phase + '"/></div>' +
    '<div class="form-group"><label>Haskur Trail Clock (0-6):</label><input type="number" name="trail" min="0" max="6" value="' + current.trailClock + '"/></div>' +
    '<div class="form-group"><label>Greyhawk Heat Clock (0-6):</label><input type="number" name="heat" min="0" max="6" value="' + current.heatClock + '"/></div></form>';
  new Dialog({
    title: "BR2 Phase Clock Tracker",
    content: html,
    buttons: {
      save: {
        label: "Save",
        callback: async (htmlEl) => {
          const form = htmlEl[0].querySelector("form");
          const next = {
            phase: Number(form.elements.phase.value) || 1,
            trailClock: Number(form.elements.trail.value) || 0,
            heatClock: Number(form.elements.heat.value) || 0
          };
          await game.world.setFlag(FLAG_NS, FLAG_KEY, next);
          ChatMessage.create({
            content: '<div style="border:1px solid #8a7a5e;padding:6px;border-radius:4px;background:#f3ead9;">' +
              '<h3 style="margin:0 0 4px 0;">BR2 Phase ' + next.phase + '</h3>' +
              '<p style="margin:2px 0;"><strong>Haskur Trail Clock:</strong> ' + next.trailClock + ' / 6</p>' +
              '<p style="margin:2px 0;"><strong>Greyhawk Heat Clock:</strong> ' + next.heatClock + ' / 6</p>' +
              '</div>',
            whisper: [game.user.id]
          });
        }
      },
      report: {
        label: "Show only",
        callback: () => {
          const v = game.world.getFlag(FLAG_NS, FLAG_KEY) ?? current;
          ChatMessage.create({
            content: '<div style="border:1px solid #8a7a5e;padding:6px;border-radius:4px;background:#f3ead9;">' +
              '<h3 style="margin:0 0 4px 0;">BR2 Phase ' + v.phase + '</h3>' +
              '<p style="margin:2px 0;"><strong>Haskur Trail Clock:</strong> ' + v.trailClock + ' / 6</p>' +
              '<p style="margin:2px 0;"><strong>Greyhawk Heat Clock:</strong> ' + v.heatClock + ' / 6</p>' +
              '</div>',
            whisper: [game.user.id]
          });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "save"
  }).render(true);
})();
`;

const phaseClockMacro = {
  _key: "!macros!" + phaseClockMacroId,
  _id: phaseClockMacroId,
  name: "BR2 — Phase Clock Tracker",
  type: "script",
  author: null,
  img: "icons/svg/clockwork.svg",
  scope: "global",
  command: phaseClockCommand,
  folder: null,
  sort: 100,
  ownership: { default: 0 },
  flags: { "blooming-rot-2": { kind: "utility-macro", purpose: "phase-clock" } },
  _stats: STATS_BLOCK
};

const campaignStateMacroId = "BR2MacroCampSta";
const campaignStateCommand = `(async () => {
  if (!game.user.isGM) { ui.notifications.warn("BR2 Campaign State: GM only."); return; }
  const FLAG_NS = "blooming-rot-2";
  const STATE_KEY = "campaign-state";
  const CLOCK_KEY = "phase-clocks";
  const sereth = ["Indicted (Path A)", "Privately removed (Path B)", "Kinetically removed (Path C)", "Unresolved"];
  const closure = ["Passed", "Held over", "Defeated", "Unresolved"];
  const pell = ["Exposed", "Turned", "Fed false information", "Shadowed", "Removed", "Killed", "Unresolved"];
  const quill = ["Captured", "Escaped", "Never reached", "Unresolved"];
  const lieList = [
    "Lie 1 — Haskur in Rel Astra",
    "Lie 2 — party pursuing wood correspondent",
    "Lie 3 — party has no usable Sereth evidence",
    "Lie 4 — party intends to expose Galenix Naelax",
    "Lie 5 — party returning to Hardby"
  ];
  const current = game.world.getFlag(FLAG_NS, STATE_KEY) ?? { sereth: 3, closure: 3, pell: 6, quill: 3, lies: [] };
  const clocks = game.world.getFlag(FLAG_NS, CLOCK_KEY) ?? { phase: 1, trailClock: 0, heatClock: 0 };

  const sel = (label, options, currentVal, name) => {
    let s = '<div class="form-group"><label>' + label + ':</label><select name="' + name + '">';
    for (let i = 0; i < options.length; i++) {
      s += '<option value="' + i + '"' + (i === currentVal ? " selected" : "") + '>' + options[i] + '</option>';
    }
    s += '</select></div>';
    return s;
  };
  let lieBoxes = "";
  for (let i = 0; i < lieList.length; i++) {
    lieBoxes += '<label style="display:block;"><input type="checkbox" name="lie' + i + '"' + (current.lies.includes(i) ? " checked" : "") + '/> ' + lieList[i] + '</label>';
  }
  const html = '<form><p>Carry-forward state from earlier phases.</p>' +
    sel("Sereth", sereth, current.sereth, "sereth") +
    sel("Closure motion", closure, current.closure, "closure") +
    sel("Pell", pell, current.pell, "pell") +
    sel("Vesten Quill", quill, current.quill, "quill") +
    '<div class="form-group"><label>Active lies fed to the conspiracy:</label>' + lieBoxes + '</div></form>';

  new Dialog({
    title: "BR2 Campaign State Snapshot",
    content: html,
    buttons: {
      save: {
        label: "Save + Report",
        callback: async (htmlEl) => {
          const form = htmlEl[0].querySelector("form");
          const lies = [];
          for (let i = 0; i < lieList.length; i++) {
            if (form.elements["lie" + i].checked) lies.push(i);
          }
          const next = {
            sereth: Number(form.elements.sereth.value),
            closure: Number(form.elements.closure.value),
            pell: Number(form.elements.pell.value),
            quill: Number(form.elements.quill.value),
            lies
          };
          await game.world.setFlag(FLAG_NS, STATE_KEY, next);
          let lieReport = "";
          if (next.lies.length === 0) {
            lieReport = "<li><em>none</em></li>";
          } else {
            for (const i of next.lies) lieReport += "<li>" + lieList[i] + "</li>";
          }
          ChatMessage.create({
            content: '<div style="border:1px solid #8a7a5e;padding:8px;border-radius:4px;background:#f3ead9;">' +
              '<h3 style="margin:0 0 6px 0;">BR2 Campaign State — Phase ' + clocks.phase + '</h3>' +
              '<p style="margin:2px 0;"><strong>Sereth:</strong> ' + sereth[next.sereth] + '</p>' +
              '<p style="margin:2px 0;"><strong>Closure:</strong> ' + closure[next.closure] + '</p>' +
              '<p style="margin:2px 0;"><strong>Pell:</strong> ' + pell[next.pell] + '</p>' +
              '<p style="margin:2px 0;"><strong>Quill:</strong> ' + quill[next.quill] + '</p>' +
              '<p style="margin:6px 0 2px 0;"><strong>Active lies:</strong></p>' +
              '<ul style="margin:2px 0 6px 16px;">' + lieReport + '</ul>' +
              '<p style="margin:6px 0 2px 0;"><strong>Trail Clock:</strong> ' + clocks.trailClock + ' / 6 &nbsp; <strong>Heat Clock:</strong> ' + clocks.heatClock + ' / 6</p>' +
              '</div>',
            whisper: [game.user.id]
          });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "save"
  }).render(true);
})();
`;

const campaignStateMacro = {
  _key: "!macros!" + campaignStateMacroId,
  _id: campaignStateMacroId,
  name: "BR2 — Campaign State Snapshot",
  type: "script",
  author: null,
  img: "icons/svg/book.svg",
  scope: "global",
  command: campaignStateCommand,
  folder: null,
  sort: 200,
  ownership: { default: 0 },
  flags: { "blooming-rot-2": { kind: "utility-macro", purpose: "campaign-state" } },
  _stats: STATS_BLOCK
};

fs.writeFileSync(
  path.join(OUT_DIR, "macro-phase-clock-tracker.json"),
  JSON.stringify(phaseClockMacro, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(OUT_DIR, "macro-campaign-state-snapshot.json"),
  JSON.stringify(campaignStateMacro, null, 2) + "\n"
);
console.log("Wrote 2 utility macros to packs/_source/module-macros/");
