#!/usr/bin/env node
// Blooming Rot 2 — actor items populator
//
// Reads each actor JSON in packs/_source/phase-{1..5}-actors/, replaces the
// empty items: [] array with a populated array of weapons, armor, focus items,
// signature gear, NPC features, and (for Trina Alvere only) spells, drawn
// from declarative templates below.
//
// Idempotent: item _ids are deterministic (derived from actor _id + item slug),
// so re-running the script produces identical output.
//
// Reads the user's installed dnd5e 2024 PHB/DMG/MM modules via flags.core.sourceId
// hints. If the user's installation uses standard pack names, Foundry will
// auto-link on import; if not, the embedded item data still functions.
//
// Usage:
//   node scripts/populate-actor-items.mjs              # populate all 25 actors
//   node scripts/populate-actor-items.mjs --dry-run    # print plan, don't write
//   node scripts/populate-actor-items.mjs --only BR2P3ActAnverR  # one actor

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCE = path.join(ROOT, "packs", "_source");

// ============================================================================
// HELPERS
// ============================================================================

// Deterministic 16-char alphanumeric ID for an embedded item.
// Hash of actorId + itemSlug, base36-encoded, padded.
function itemId(actorId, slug) {
  const hash = crypto.createHash("sha256").update(`${actorId}.${slug}`).digest("hex");
  // Take 16 chars from the hex digest. Foundry IDs are alphanumeric; hex is fine.
  return ("BR2I" + hash).slice(0, 16);
}

function blankStats() {
  return {
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null,
    coreVersion: "13.351",
    systemId: "dnd5e",
    systemVersion: "5.3.0",
    createdTime: null,
    modifiedTime: null,
    lastModifiedBy: null,
  };
}

function blankFlagsWithSourceId(sourceId) {
  return sourceId ? { core: { sourceId } } : {};
}

// ============================================================================
// WEAPON TEMPLATES (PHB 2024)
// ============================================================================

const W = {
  rapier: {
    name: "Rapier",
    type: "weapon",
    img: "icons/weapons/swords/rapier-blue.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-rapier",
    system: {
      description: { value: "<p>A finesse martial melee weapon. Pairs with Sneak Attack and Mastery: Vex.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 2, units: "lb" },
      price: { value: 25, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d8 + @mod", "piercing"]], versatile: "" },
      properties: ["fin"],
      weaponType: "martialM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  dagger: {
    name: "Dagger",
    type: "weapon",
    img: "icons/weapons/daggers/dagger-curved-glow.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-dagger",
    system: {
      description: { value: "<p>A finesse, light, thrown simple melee weapon. Mastery: Nick.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 2, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: 60, units: "ft" },
      damage: { parts: [["1d4 + @mod", "piercing"]], versatile: "" },
      properties: ["fin", "lgt", "thr"],
      weaponType: "simpleM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  shortsword: {
    name: "Shortsword",
    type: "weapon",
    img: "icons/weapons/swords/shortsword-guard-gold.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-shortsword",
    system: {
      description: { value: "<p>A finesse, light martial melee weapon. Mastery: Vex.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 2, units: "lb" },
      price: { value: 10, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d6 + @mod", "piercing"]], versatile: "" },
      properties: ["fin", "lgt"],
      weaponType: "martialM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  longsword: {
    name: "Longsword",
    type: "weapon",
    img: "icons/weapons/swords/sword-broad-steel.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-longsword",
    system: {
      description: { value: "<p>A versatile martial melee weapon. Mastery: Sap.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 3, units: "lb" },
      price: { value: 15, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d8 + @mod", "slashing"]], versatile: "1d10 + @mod" },
      properties: ["ver"],
      weaponType: "martialM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  scimitar: {
    name: "Scimitar",
    type: "weapon",
    img: "icons/weapons/swords/scimitar-curved-eastern.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-scimitar",
    system: {
      description: { value: "<p>A finesse, light martial melee weapon. Mastery: Nick.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 3, units: "lb" },
      price: { value: 25, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d6 + @mod", "slashing"]], versatile: "" },
      properties: ["fin", "lgt"],
      weaponType: "martialM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  handCrossbow: {
    name: "Hand Crossbow",
    type: "weapon",
    img: "icons/weapons/crossbows/crossbow-hand.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-hand-crossbow",
    system: {
      description: { value: "<p>A martial ranged weapon. Light, loading. Mastery: Vex.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 3, units: "lb" },
      price: { value: 75, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 30, long: 120, units: "ft" },
      damage: { parts: [["1d6 + @mod", "piercing"]], versatile: "" },
      properties: ["amm", "lgt", "lod"],
      weaponType: "martialR",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  heavyCrossbow: {
    name: "Heavy Crossbow",
    type: "weapon",
    img: "icons/weapons/crossbows/crossbow-heavy.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-heavy-crossbow",
    system: {
      description: { value: "<p>A martial ranged weapon. Heavy, loading, two-handed. Mastery: Push.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 18, units: "lb" },
      price: { value: 50, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 100, long: 400, units: "ft" },
      damage: { parts: [["1d10 + @mod", "piercing"]], versatile: "" },
      properties: ["amm", "hvy", "lod", "two"],
      weaponType: "martialR",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  lightCrossbow: {
    name: "Light Crossbow",
    type: "weapon",
    img: "icons/weapons/crossbows/crossbow-light.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-light-crossbow",
    system: {
      description: { value: "<p>A simple ranged weapon. Loading, two-handed. Mastery: Slow.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 5, units: "lb" },
      price: { value: 25, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 80, long: 320, units: "ft" },
      damage: { parts: [["1d8 + @mod", "piercing"]], versatile: "" },
      properties: ["amm", "lod", "two"],
      weaponType: "simpleR",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  claspKnife: {
    name: "Heavy Clasp-Knife",
    type: "weapon",
    img: "icons/weapons/daggers/dagger-utility.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.weapon-dagger",
    system: {
      description: { value: "<p>A heavy folding knife — uses dagger statistics. A working sailor's blade kept since Astor's mariner days.</p>", chat: "" },
      source: { custom: "PHB 2024 (Dagger statistics)", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 2, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d4 + @mod", "piercing"]], versatile: "" },
      properties: ["fin", "lgt"],
      weaponType: "simpleM",
      attack: { bonus: "", flat: false },
      ability: "",
    },
  },
  pactStiletto: {
    name: "Pact Weapon — Stiletto",
    type: "weapon",
    img: "icons/weapons/daggers/dagger-handled-jeweled.webp",
    sourceId: null,
    system: {
      description: { value: "<p>Trina's Pact-of-the-Blade weapon, summoned at will: a slim silver stiletto with a leaf-shaped pommel matching her Quiet-Patroness pendant. Uses Charisma for attack and damage. Counts as magical for the purpose of overcoming resistance.</p>", chat: "" },
      source: { custom: "PHB 2024 (Warlock Pact of the Blade)", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: "uncommon",
      identified: true,
      equipped: true,
      proficient: 1,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: "", units: "inst" },
      target: { value: "", width: null, units: "", type: "creature" },
      range: { value: 5, long: null, units: "ft" },
      damage: { parts: [["1d4 + @abilities.cha.mod", "piercing"]], versatile: "" },
      properties: ["fin", "lgt", "mgc"],
      weaponType: "simpleM",
      attack: { bonus: "", flat: false },
      ability: "cha",
    },
  },
};

// ============================================================================
// ARMOR / EQUIPMENT TEMPLATES
// ============================================================================

const A = {
  studdedLeather: {
    name: "Studded Leather Armor",
    type: "equipment",
    img: "icons/equipment/chest/breastplate-leather-brown.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.armor-studded-leather",
    system: {
      description: { value: "<p>Light armor. AC 12 + Dex modifier.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 13, units: "lb" },
      price: { value: 45, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      armor: { value: 12, type: "light", dex: null, magicalBonus: 0 },
      strength: 0,
      stealth: false,
      properties: [],
      type: { value: "light", baseItem: "studded" },
    },
  },
  hiddenMail: {
    name: "Hidden Mail Shirt",
    type: "equipment",
    img: "icons/equipment/chest/shirt-collared-brown.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.armor-chain-shirt",
    system: {
      description: { value: "<p>A close-woven mail shirt worn under a fine wool overcoat. Light armor: AC 13 + Dex modifier (max 2). Sereth wears it concealed during all his offices' meetings.</p>", chat: "" },
      source: { custom: "PHB 2024 (Chain Shirt statistics)", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 20, units: "lb" },
      price: { value: 50, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      armor: { value: 13, type: "medium", dex: 2, magicalBonus: 0 },
      strength: 0,
      stealth: false,
      properties: [],
      type: { value: "medium", baseItem: "chainShirt" },
    },
  },
  chainMail: {
    name: "Chain Mail",
    type: "equipment",
    img: "icons/equipment/chest/breastplate-collared-steel.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.armor-chain-mail",
    system: {
      description: { value: "<p>Heavy armor. AC 16. Disadvantage on Stealth. Strength 13 required.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 55, units: "lb" },
      price: { value: 75, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      armor: { value: 16, type: "heavy", dex: 0, magicalBonus: 0 },
      strength: 13,
      stealth: true,
      properties: [],
      type: { value: "heavy", baseItem: "chainMail" },
    },
  },
  shield: {
    name: "Shield",
    type: "equipment",
    img: "icons/equipment/shield/heater-steel-worn.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.armor-shield",
    system: {
      description: { value: "<p>+2 to AC while wielded.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 6, units: "lb" },
      price: { value: 10, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      armor: { value: 2, type: "shield", dex: null, magicalBonus: 0 },
      strength: 0,
      stealth: false,
      properties: [],
      type: { value: "shield", baseItem: "shield" },
    },
  },
};

// Civic / flavor clothing — equipment type with no AC contribution.
function clothing(name, desc, imgPath = "icons/equipment/chest/coat-leather-brown-old.webp") {
  return {
    name,
    type: "equipment",
    img: imgPath,
    sourceId: null,
    system: {
      description: { value: `<p>${desc}</p>`, chat: "" },
      source: { custom: "Blooming Rot 2", book: "", page: "" },
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: true,
      armor: { value: 10, type: "clothing", dex: null, magicalBonus: 0 },
      strength: 0,
      stealth: false,
      properties: [],
      type: { value: "clothing", baseItem: "" },
    },
  };
}

// ============================================================================
// CONSUMABLES & TOOLS
// ============================================================================

function bolts(count = 10) {
  return {
    name: `Crossbow Bolts (${count})`,
    type: "consumable",
    img: "icons/weapons/ammunition/arrows-bodkin-brown.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.ammo-crossbow-bolts",
    system: {
      description: { value: `<p>${count} crossbow bolts in a quiver or wallet.</p>`, chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: count,
      weight: { value: 0.075, units: "lb" },
      price: { value: 0.05, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: false,
      type: { value: "ammo", subtype: "crossbowBolt" },
      uses: { value: count, max: count, recovery: [], spent: 0 },
      properties: [],
    },
  };
}

function smokePellet(count = 2) {
  return {
    name: `Smoke Pellet ×${count}`,
    type: "consumable",
    img: "icons/magic/air/cloud-tendril-grey.webp",
    sourceId: null,
    system: {
      description: { value: `<p><strong>Action:</strong> Throw at a point within 30 ft. Creates a 10-ft cube of acrid smoke (heavily obscured) for 1 minute or until dispersed. Each creature inside at the start of its turn must succeed on a DC 13 Constitution save or be Blinded until the start of its next turn.</p>`, chat: "" },
      source: { custom: "Blooming Rot 2 (Homebrew)", book: "", page: "" },
      quantity: count,
      weight: { value: 0.5, units: "lb" },
      price: { value: 50, denomination: "gp" },
      rarity: "uncommon",
      identified: true,
      equipped: false,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: 1, units: "minute" },
      range: { value: 30, long: null, units: "ft" },
      target: { value: 10, width: null, units: "ft", type: "cube" },
      type: { value: "trinket", subtype: "" },
      uses: { value: count, max: count, recovery: [{ period: "lr", type: "recoverAll" }], spent: 0 },
      properties: ["mgc"],
    },
  };
}

function calligraphersSupplies() {
  return {
    name: "Calligrapher's Supplies",
    type: "tool",
    img: "icons/tools/scribal/ink-quill-pink.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.tool-calligraphers-supplies",
    system: {
      description: { value: "<p>Quills, ink, parchment, sealing wax, signet seal. Used by clerks, notaries, and paleographers.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 5, units: "lb" },
      price: { value: 10, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: false,
      proficient: 1,
      ability: "int",
      type: { value: "art", baseItem: "calligrapher" },
      properties: [],
    },
  };
}

function herbalismKit() {
  return {
    name: "Herbalism Kit",
    type: "tool",
    img: "icons/tools/laboratory/mortar-stone-pestle.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.tool-herbalism-kit",
    system: {
      description: { value: "<p>Pouches and vials, mortar and pestle, clippers and leather gloves. Used to identify and apply herbs.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 3, units: "lb" },
      price: { value: 5, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: false,
      proficient: 1,
      ability: "wis",
      type: { value: "kit", baseItem: "herb" },
      properties: [],
    },
  };
}

function thievesTools() {
  return {
    name: "Thieves' Tools",
    type: "tool",
    img: "icons/tools/hand/lockpicks-brown.webp",
    sourceId: "Compendium.dnd-players-handbook.items.Item.tool-thieves-tools",
    system: {
      description: { value: "<p>A small file, narrow-bladed scissors, a pair of pliers, a set of lockpicks, a small mirror on a metal handle, narrow tweezers.</p>", chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      quantity: 1,
      weight: { value: 1, units: "lb" },
      price: { value: 25, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: false,
      proficient: 1,
      ability: "dex",
      type: { value: "kit", baseItem: "thief" },
      properties: [],
    },
  };
}

// ============================================================================
// LOOT (flavor items, signature gear)
// ============================================================================

function loot(name, desc, imgPath = "icons/sundries/misc/pin-bronze.webp") {
  return {
    name,
    type: "loot",
    img: imgPath,
    sourceId: null,
    system: {
      description: { value: `<p>${desc}</p>`, chat: "" },
      source: { custom: "Blooming Rot 2", book: "", page: "" },
      quantity: 1,
      weight: { value: 0, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: "",
      identified: true,
      equipped: false,
      type: { value: "trinket", subtype: "" },
      properties: [],
    },
  };
}

// ============================================================================
// FEAT TEMPLATES (NPC features)
// ============================================================================

function feat(name, desc, opts = {}) {
  const { activation = null, uses = null, recharge = null, sourceId = null, img = "icons/sundries/scrolls/scroll-rolled-tan.webp" } = opts;
  return {
    name,
    type: "feat",
    img,
    sourceId,
    system: {
      description: { value: desc, chat: "" },
      source: { custom: "Blooming Rot 2 (NPC feature)", book: "", page: "" },
      activation: activation || { type: "", cost: null, condition: "" },
      duration: { value: "", units: "" },
      target: { value: "", width: null, units: "", type: "" },
      range: { value: null, long: null, units: "" },
      uses: uses || { value: null, max: "", recovery: [], spent: 0 },
      recharge: recharge || { value: null, charged: false },
      requirements: "",
      type: { value: "monster", subtype: "" },
      properties: [],
    },
  };
}

// Common reusable feats
const F = {
  cunningAction: () => feat("Cunning Action",
    "<p><strong>Bonus Action.</strong> Take the Dash, Disengage, or Hide action.</p>",
    { activation: { type: "bonus", cost: 1, condition: "" }, sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.rogue-cunning-action" }),
  sneakAttack: (dice) => feat(`Sneak Attack (${dice})`,
    `<p><strong>1/Turn.</strong> Deal an extra <strong>${dice}</strong> damage on a weapon attack with advantage on the attack roll, or when an ally of the rogue is within 5 feet of the target. The weapon must have the finesse or ranged property.</p>`,
    { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.rogue-sneak-attack" }),
  uncannyDodge: () => feat("Uncanny Dodge",
    "<p><strong>Reaction.</strong> When an attacker hits with an attack the rogue can see, halve the damage of that attack.</p>",
    { activation: { type: "reaction", cost: 1, condition: "Hit by an attack the rogue can see" }, sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.rogue-uncanny-dodge" }),
  evasion: () => feat("Evasion",
    "<p>When subjected to an effect that allows a Dex save for half damage, the rogue takes <strong>no damage</strong> on a successful save and only half damage on a failed save.</p>",
    { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.rogue-evasion" }),
  multiattack: (desc) => feat("Multiattack",
    `<p>${desc}</p>`,
    { activation: { type: "action", cost: 1, condition: "" }, sourceId: "Compendium.dnd-monster-manual.actions.Item.multiattack" }),
  parry: (bonus) => feat(`Parry (+${bonus} AC)`,
    `<p><strong>Reaction.</strong> When hit by a melee attack the creature can see, add <strong>+${bonus}</strong> to its AC against that attack, potentially turning the hit into a miss.</p>`,
    { activation: { type: "reaction", cost: 1, condition: "Hit by a melee attack" }, sourceId: "Compendium.dnd-monster-manual.actions.Item.parry" }),
};

// ============================================================================
// SPELL TEMPLATES (Trina's Warlock 10 loadout, PHB 2024)
// ============================================================================

function spellBase({ name, level, school, description, components = "vs", duration = { value: "", units: "inst" }, range = { value: null, long: null, units: "self" }, target = { value: "", width: null, units: "", type: "self" }, materials = "", concentration = false, ritual = false, sourceSlug, prepared = 1, activation = { type: "action", cost: 1, condition: "" }, properties = [] }) {
  return {
    name,
    type: "spell",
    img: `icons/magic/control/silhouette-hold-change-blue.webp`,
    sourceId: `Compendium.dnd-players-handbook.spells.Item.spell-${sourceSlug}`,
    system: {
      description: { value: description, chat: "" },
      source: { custom: "PHB 2024", book: "PHB", page: "" },
      level,
      school,
      components: {
        verbal: components.includes("v"),
        somatic: components.includes("s"),
        material: components.includes("m"),
        ritual,
        concentration,
      },
      materials: { value: materials, consumed: false, cost: 0, supply: 0 },
      preparation: { mode: "always", prepared },
      scaling: { mode: "none", formula: "" },
      activation,
      duration,
      target,
      range,
      uses: { value: null, max: "", recovery: [], spent: 0 },
      properties,
    },
  };
}

const S = {
  eldritchBlast: () => spellBase({
    name: "Eldritch Blast",
    level: 0,
    school: "evo",
    description: "<p>A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes <strong>1d10 force damage</strong>. The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, four beams at 17th level. With Trina's <em>Agonizing Blast</em> invocation, each hit adds her Charisma modifier (+5) to the damage.</p>",
    range: { value: 120, long: null, units: "ft" },
    duration: { value: "", units: "inst" },
    target: { value: 1, width: null, units: "", type: "creature" },
    sourceSlug: "eldritch-blast",
  }),
  mageHand: () => spellBase({
    name: "Mage Hand",
    level: 0,
    school: "con",
    description: "<p>A spectral, floating hand appears at a point within 30 feet. The hand can manipulate objects up to 10 lbs, open unlocked doors and containers, retrieve items from open containers, etc.</p>",
    range: { value: 30, long: null, units: "ft" },
    duration: { value: 1, units: "minute" },
    target: { value: 1, width: null, units: "", type: "object" },
    sourceSlug: "mage-hand",
  }),
  minorIllusion: () => spellBase({
    name: "Minor Illusion",
    level: 0,
    school: "ill",
    description: "<p>Create a sound or an image of an object within range that lasts for the duration. The illusion ends if you dismiss it as an action or cast this spell again.</p>",
    components: "sm",
    materials: "A bit of fleece",
    range: { value: 30, long: null, units: "ft" },
    duration: { value: 1, units: "minute" },
    target: { value: 5, width: null, units: "ft", type: "cube" },
    sourceSlug: "minor-illusion",
  }),
  prestidigitation: () => spellBase({
    name: "Prestidigitation",
    level: 0,
    school: "trs",
    description: "<p>This minor magical trick performs a number of small, simple effects: light, clean, douse, mark, etc.</p>",
    range: { value: 10, long: null, units: "ft" },
    duration: { value: 1, units: "hour" },
    target: { value: "", width: null, units: "", type: "self" },
    sourceSlug: "prestidigitation",
  }),
  hex: () => spellBase({
    name: "Hex",
    level: 1,
    school: "enc",
    description: "<p><strong>Concentration, up to 1 hour.</strong> Place a curse on a creature you can see. Until the spell ends, you deal an extra <strong>1d6 necrotic damage</strong> to the target whenever you hit it with an attack. You also choose one ability when cast; the target has disadvantage on ability checks made with that ability.</p>",
    components: "vsm",
    materials: "The petrified eye of a newt",
    range: { value: 90, long: null, units: "ft" },
    duration: { value: 1, units: "hour" },
    target: { value: 1, width: null, units: "", type: "creature" },
    concentration: true,
    activation: { type: "bonus", cost: 1, condition: "" },
    sourceSlug: "hex",
  }),
  mageArmor: () => spellBase({
    name: "Mage Armor",
    level: 1,
    school: "abj",
    description: "<p>You touch a willing creature who is not wearing armor. Until the spell ends, the target's base AC becomes <strong>13 + their Dex modifier</strong>. The spell ends if the target dons armor or if you dismiss it as an action.</p>",
    components: "vsm",
    materials: "A piece of cured leather",
    range: { value: 0, long: null, units: "touch" },
    duration: { value: 8, units: "hour" },
    target: { value: 1, width: null, units: "", type: "creature" },
    sourceSlug: "mage-armor",
  }),
  mistyStep: () => spellBase({
    name: "Misty Step",
    level: 2,
    school: "con",
    description: "<p><strong>Bonus Action.</strong> Briefly surrounded by silvery mist, you teleport up to <strong>30 feet</strong> to an unoccupied space you can see.</p>",
    activation: { type: "bonus", cost: 1, condition: "" },
    range: { value: 30, long: null, units: "ft" },
    duration: { value: "", units: "inst" },
    target: { value: "", width: null, units: "", type: "self" },
    sourceSlug: "misty-step",
  }),
  suggestion: () => spellBase({
    name: "Suggestion",
    level: 2,
    school: "enc",
    description: "<p><strong>Concentration, up to 8 hours.</strong> Suggest a course of activity (limited to a sentence or two) and magically influence a creature you can see within range that can hear and understand you. The target must succeed on a Wisdom save or pursue the suggested course as best it can.</p>",
    components: "vm",
    materials: "A snake's tongue and a drop of honey",
    range: { value: 30, long: null, units: "ft" },
    duration: { value: 8, units: "hour" },
    target: { value: 1, width: null, units: "", type: "creature" },
    concentration: true,
    sourceSlug: "suggestion",
  }),
  hypnoticPattern: () => spellBase({
    name: "Hypnotic Pattern",
    level: 3,
    school: "ill",
    description: "<p><strong>Concentration, up to 1 minute.</strong> Create a twisting pattern of colors in a 30-foot cube within range. Each creature in the area that can see the pattern must make a Wisdom save or be charmed for the duration. While charmed, the creature is incapacitated and has a speed of 0.</p>",
    components: "sm",
    materials: "A glowing stick of incense or a crystal vial filled with phosphorescent material",
    range: { value: 120, long: null, units: "ft" },
    duration: { value: 1, units: "minute" },
    target: { value: 30, width: null, units: "ft", type: "cube" },
    concentration: true,
    sourceSlug: "hypnotic-pattern",
  }),
  counterspell: () => spellBase({
    name: "Counterspell",
    level: 3,
    school: "abj",
    description: "<p><strong>Reaction</strong>, when you see a creature within 60 feet casting a spell. Attempt to interrupt that spell. If the spell is 3rd level or lower, it fails automatically. If 4th level or higher, make an ability check using your spellcasting ability — the DC equals 10 + the spell's level. On a success, the creature's spell fails.</p>",
    activation: { type: "reaction", cost: 1, condition: "Seeing a creature within 60 feet cast a spell" },
    components: "s",
    range: { value: 60, long: null, units: "ft" },
    duration: { value: "", units: "inst" },
    target: { value: 1, width: null, units: "", type: "creature" },
    sourceSlug: "counterspell",
  }),
  dimensionDoor: () => spellBase({
    name: "Dimension Door",
    level: 4,
    school: "con",
    description: "<p>You teleport yourself from your current location to any other spot within range. You arrive at exactly the spot desired. You can also teleport one willing creature with you, who must be within 5 feet when the spell is cast.</p>",
    range: { value: 500, long: null, units: "ft" },
    duration: { value: "", units: "inst" },
    target: { value: "", width: null, units: "", type: "self" },
    sourceSlug: "dimension-door",
  }),
  holdMonster: () => spellBase({
    name: "Hold Monster",
    level: 5,
    school: "enc",
    description: "<p><strong>Concentration, up to 1 minute.</strong> Choose a creature within range. The target must succeed on a Wisdom save or be paralyzed for the duration. The creature can repeat the save at the end of each of its turns.</p>",
    components: "vsm",
    materials: "A small, straight piece of iron",
    range: { value: 90, long: null, units: "ft" },
    duration: { value: 1, units: "minute" },
    target: { value: 1, width: null, units: "", type: "creature" },
    concentration: true,
    sourceSlug: "hold-monster",
  }),
};

// ============================================================================
// ACTOR PLAN — what items each actor gets
// ============================================================================

const ACTOR_PLAN = {
  // -------- PHASE 1 --------
  "BR2ActrCaelithDn": [
    { slug: "rapier", template: () => W.rapier },
    { slug: "dagger", template: () => W.dagger },
    { slug: "scholars-coat", template: () => clothing("Scholar's Black Coat", "Plain heavy black wool, civic dignified, no ornament except the brass quill pin at the lapel.", "icons/equipment/chest/coat-collared-black.webp") },
    { slug: "quill-pin", template: () => loot("Brass Quill Pin", "The Hand of the Duke's badge of office, awarded at twenty years' service. Visibly missing from his lapel in Phase 5 after the Closure motion review.", "icons/sundries/scrolls/scroll-symbol-feather-blue.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "feat-cunning", template: () => F.cunningAction() },
    { slug: "feat-sneak", template: () => F.sneakAttack("4d6 (14)") },
    { slug: "feat-hand", template: () => feat("Hand of the Duke",
      "<p>Caelith functions as the Yeomanry's spymaster — the Duchy's quiet adviser, with access to the Audit Hall's foreign-correspondence apparatus. While in office (Phases 1–4), he commands two clerical staff, holds the brass quill pin of office, and is recognized by Yeomanry, Hardby, and Aerdi commercial-court functionaries as legitimate. The role is administrative, not magical. Removed at the start of Phase 5 by the Civic Reconciliation Closure motion.</p>") },
  ],

  // -------- PHASE 2 --------
  "BR2ActrTrinaAlvr": [
    { slug: "pact-stiletto", template: () => W.pactStiletto },
    { slug: "silver-leaf", template: () => loot("Silver Leaf Pendant",
      "Trina's pact focus — a small silver leaf-shaped pendant on a fine chain. The mark of the Quiet Patroness (Tasha / Iggwilv as the Archfey patron). Pulses faintly when she has cast or prepared a spell within the hour. Worn at her collar at all times.",
      "icons/equipment/neck/pendant-silver-leaf.webp") },
    { slug: "feat-pact-blade", template: () => feat("Pact of the Blade",
      "<p><strong>Bonus Action.</strong> Summon a melee pact weapon of any kind into a free hand. The weapon counts as magical and uses Charisma for attack and damage rolls. Trina's pact form is a slim silver stiletto matching her leaf pendant.</p>",
      { activation: { type: "bonus", cost: 1, condition: "" }, sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-pact-of-the-blade" }) },
    { slug: "feat-agonizing", template: () => feat("Eldritch Invocation: Agonizing Blast",
      "<p>When Trina casts <em>Eldritch Blast</em>, she adds her Charisma modifier (+5) to the damage of each ray it deals.</p>",
      { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-invocation-agonizing-blast" }) },
    { slug: "feat-devils-sight", template: () => feat("Eldritch Invocation: Devil's Sight",
      "<p>Trina sees normally in <strong>darkness, both magical and nonmagical</strong>, to a distance of 120 feet.</p>",
      { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-invocation-devils-sight" }) },
    { slug: "feat-mask-faces", template: () => feat("Eldritch Invocation: Mask of Many Faces",
      "<p>Trina can cast <em>Disguise Self</em> at will, without expending a spell slot.</p>",
      { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-invocation-mask-of-many-faces" }) },
    { slug: "feat-misty-visions", template: () => feat("Eldritch Invocation: Misty Visions",
      "<p>Trina can cast <em>Silent Image</em> at will, without expending a spell slot or material components.</p>",
      { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-invocation-misty-visions" }) },
    { slug: "feat-mystic-arcanum", template: () => feat("Mystic Arcanum (5th level): Hold Monster",
      "<p>Trina can cast <em>Hold Monster</em> once per long rest as a Mystic Arcanum, without expending a spell slot.</p>",
      { uses: { value: 1, max: "1", recovery: [{ period: "lr", type: "recoverAll" }], spent: 0 }, sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.warlock-mystic-arcanum-5" }) },
    { slug: "spell-eldritch-blast", template: () => S.eldritchBlast() },
    { slug: "spell-mage-hand", template: () => S.mageHand() },
    { slug: "spell-minor-illusion", template: () => S.minorIllusion() },
    { slug: "spell-prestidigitation", template: () => S.prestidigitation() },
    { slug: "spell-hex", template: () => S.hex() },
    { slug: "spell-mage-armor", template: () => S.mageArmor() },
    { slug: "spell-misty-step", template: () => S.mistyStep() },
    { slug: "spell-suggestion", template: () => S.suggestion() },
    { slug: "spell-hypnotic-pattern", template: () => S.hypnoticPattern() },
    { slug: "spell-counterspell", template: () => S.counterspell() },
    { slug: "spell-dimension-door", template: () => S.dimensionDoor() },
    { slug: "spell-hold-monster", template: () => S.holdMonster() },
  ],
  "BR2ActrMerevSrth": [
    { slug: "shortsword", template: () => W.shortsword },
    { slug: "hand-crossbow", template: () => W.handCrossbow },
    { slug: "bolts", template: () => bolts(10) },
    { slug: "studded-leather", template: () => A.studdedLeather },
    { slug: "courier-tabard", template: () => clothing("Yeomanry Courier Tabard", "A genuine Yeomanry courier's tabard, dull green over a darker undershirt — purchased through proper channels, not stolen. A uniform she wears, not earned.", "icons/equipment/chest/coat-tabard-tan.webp") },
    { slug: "smoke-pellets", template: () => smokePellet(3) },
    { slug: "writ", template: () => loot("Forged Inspection Writ", "A folded paper bearing a Loftwick civic seal that almost — but not quite — matches a real Audit Hall stamp. Sufficient for a tired gate-watch; insufficient for any serious examination.") },
    { slug: "thieves-tools", template: () => thievesTools() },
    { slug: "feat-cunning", template: () => F.cunningAction() },
    { slug: "feat-sneak", template: () => F.sneakAttack("4d6") },
    { slug: "feat-uncanny", template: () => F.uncannyDodge() },
    { slug: "feat-evasion", template: () => F.evasion() },
    { slug: "feat-retrieval", template: () => feat("On Retrieval, Not Kill",
      "<p>Merev is contracted to retrieve evidence, not to kill the party. She will not initiate lethal combat unless cornered with no escape route. If reduced below half HP and offered a way out, she <strong>surrenders</strong> rather than die for a fee.</p>") },
  ],

  // -------- PHASE 3 --------
  "BR2P3ActAnverR": [
    { slug: "hand-crossbow", template: () => W.handCrossbow },
    { slug: "bolts", template: () => bolts(10) },
    { slug: "hidden-knife", template: () => W.dagger },
    { slug: "studded-leather", template: () => A.studdedLeather },
    { slug: "winter-coat", template: () => clothing("Heavy Wool Greatcoat", "Plain dark wool, slightly worn at the cuffs. Conceals the studded leather beneath. Smells faintly of cheap pipe-leaf.", "icons/equipment/chest/coat-leather-brown-old.webp") },
    { slug: "smoke-pellets", template: () => smokePellet(2) },
    { slug: "pipe-tin", template: () => loot("Pipe and Brass Tobacco-Tin", "A small clay pipe and a worn brass tobacco-tin. Cheap pipe-leaf. The yellow stains on his right-hand fingers are from this.", "icons/sundries/misc/pipe-tan.webp") },
    { slug: "notary-stylus", template: () => calligraphersSupplies() },
    { slug: "feat-cunning", template: () => F.cunningAction() },
    { slug: "feat-sneak", template: () => F.sneakAttack("4d6 (14)") },
    { slug: "feat-uncanny", template: () => F.uncannyDodge() },
    { slug: "feat-evasion", template: () => F.evasion() },
    { slug: "feat-reader-rooms", template: () => feat("Reader of Rooms",
      "<p><strong>Advantage</strong> on Insight checks to determine if someone is lying or holding back, in any setting where Anver is the room's most senior occupant.</p>") },
    { slug: "feat-broker-rule", template: () => feat("The Broker's Rule",
      "<p>Anver will not personally kill. Has not in sixteen years. <strong>Surrenders</strong> rather than make a killing blow himself, even if doing so means giving up a fight he is otherwise winning.</p>") },
  ],
  "BR2P3ActVeskMa": [
    { slug: "notarial-badge", template: () => loot("Silver Scale-and-Scroll Notarial Badge", "Veska's seal of office as a Hardby trade-clearing notary. Worn at the throat of her plain wool dress. Sworn opinions made under this badge are admissible in Aerdi or Yeomanry courts without further authentication.", "icons/sundries/scrolls/scroll-symbol-coin-blue.webp") },
    { slug: "lenses", template: () => loot("Reading Lenses on Black Silk Cord", "Fine reading lenses worn on a black silk cord around her neck. Used for close paleographic work.", "icons/sundries/gaming/glasses-half-moon.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "feat-reader-hands", template: () => feat("Reader of Hands",
      "<p>Veska can identify the writer of a document, the chop applied to it, and the era and provenance of the wax used to seal it, with up to a week's careful comparison work against her own files.</p>") },
    { slug: "feat-notarial", template: () => feat("Notarial Standing",
      "<p>Veska's sworn notarial opinions are admissible in any Aerdi or Yeomanry court without further authentication.</p>") },
    { slug: "feat-network", template: () => feat("Quiet Network",
      "<p>Veska maintains correspondence with eight other notaries across the Aerdi coast, all in cipher. She can request and receive a comparison-document from any of them within ten days.</p>") },
  ],
  "BR2P3ActSolen": [
    { slug: "firm-pin", template: () => loot("Cindren & Vhal Enamel Firm-Pin", "A small enamel pin bearing the firm's crane-and-three-coins device. Worn at the lapel of his dark broadcloth coat.", "icons/sundries/misc/pin-bronze.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "feat-poor-health", template: () => feat("Poor Health",
      "<p>Solen's stiff knees and persistent cough mean he walks short distances only and tires after an hour of standing. He cannot pursue, fight, or flee on foot for long.</p>") },
  ],
  "BR2P3ActCastrn": [
    { slug: "notebook", template: () => loot("Poet's Notebook", "A small leather-bound notebook of unfinished poems and salon-night lists, kept in his study. Castrian's salons are referenced throughout it.", "icons/sundries/scrolls/scroll-bound-brown.webp") },
    { slug: "wool-coat", template: () => clothing("Plain Hardby Wool Coat", "A respectable but not lavish dark wool coat. Castrian's wardrobe is curated for the poet's-studio aesthetic — nothing ostentatious.") },
  ],
  "BR2P3ActHesren": [
    { slug: "junior-pin", template: () => loot("Junior C&V Clerk's Pin", "A small bronze C&V branch-clerk pin at the lapel. Less prestigious than Solen's enamel.") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
  ],
  "BR2P3ActAilen": [
    { slug: "dagger", template: () => W.dagger },
    { slug: "travel-clothes", template: () => clothing("Traveler's Hardby Linens", "A practical traveler's outfit — linen blouse, dark wool trousers, sturdy boots. Suitable for the road, suitable for blending in.") },
    { slug: "light-crossbow", template: () => W.lightCrossbow },
    { slug: "bolts", template: () => bolts(10) },
  ],
  "BR2P3ActMira": [
    { slug: "junior-partner-pin", template: () => loot("C&V Hardby Junior Partner's Pin", "A bronze-and-enamel pin marking her Hardby branch junior partner standing. Worn at the throat of her tailored Hardby mercantile coat.") },
    { slug: "merc-coat", template: () => clothing("Tailored Hardby Mercantile Coat", "A polished merchant's coat — well-cut, well-kept, the kind of dignified outerwear a Hardby junior partner wears for her daily work. Subtly more expensive than it looks.") },
  ],
  "BR2P3ActZoria": [
    { slug: "cipher-book", template: () => loot("Hardby Civic Cipher Book", "A small bound book of the Hardby Gynarchy registry's working ciphers. Restricted material — Zoria carries it on duty, locks it in her desk overnight. Caelith does not have a copy.", "icons/sundries/scrolls/scroll-bound-black-purple.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
  ],

  // -------- PHASE 4 --------
  "BR2P4ActSereth": [
    { slug: "hand-crossbow", template: () => W.handCrossbow },
    { slug: "bolts", template: () => bolts(10) },
    { slug: "concealed-dagger", template: () => W.dagger },
    { slug: "hidden-mail", template: () => A.hiddenMail },
    { slug: "advocates-coat", template: () => clothing("Aerdi Advocate's Overcoat", "Dark grey Aerdi advocate's overcoat — a credential, not a profession. Sereth was admitted to commercial court in 1556 and has never represented a client at trial; he wears the coat to mark his standing.", "icons/equipment/chest/coat-collared-black.webp") },
    { slug: "seal-ring", template: () => loot("C&V Senior Partner Seal-Ring", "A heavy silver ring bearing the firm's crane-and-three-coins device. The firm's seal, not Sereth's personal device. Used to certify firm correspondence.", "icons/equipment/finger/ring-band-engraved-silver.webp") },
    { slug: "feat-cunning", template: () => F.cunningAction() },
    { slug: "feat-reader-rooms", template: () => feat("Reader of Rooms",
      "<p><strong>Advantage</strong> on Insight and Investigation checks against any creature whose intentions Sereth has read for at least one round.</p>") },
    { slug: "feat-yields", template: () => feat("The Senior Partner Yields",
      "<p>If reduced to half HP and not within reach of his guards, Sereth surrenders and offers terms. He <strong>never makes a killing blow himself</strong> — has not in twenty years and will not now.</p>") },
    { slug: "feat-bodyguard-chain", template: () => feat("The Senior Partner's Guard",
      "<p>At his offices, Sereth is always accompanied by <strong>two Bodyguards</strong> (use Veteran statblock, MM 2024) and a <strong>Bodyguard Captain</strong> (use Knight statblock, MM 2024 — with Fighting Style: Defense). Outside his offices, by one Bodyguard. In his closed carriage, by a competent driver (use Bandit Captain, MM 2024). These are GM-controlled — drag from the MM 2024 compendium during the Sereth confrontation.</p>") },
  ],
  "BR2P4ActHalask": [
    { slug: "advocates-ring", template: () => loot("Old Advocate's Silver Ring", "A heavy silver ring bearing Halask's old advocate's seal — an open scroll above two crossed quills. No longer recognized in Aerdi commercial court but still respected by anyone who recognizes the design.", "icons/equipment/finger/ring-band-thick-silver.webp") },
    { slug: "lenses", template: () => loot("Reading Lenses on Silver Chain", "Fine Aerdi reading lenses on a silver chain. Currently pushed up on his forehead, by habit.", "icons/sundries/gaming/glasses-half-moon.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "feat-procedural", template: () => feat("Procedural Authority",
      "<p>Halask's procedural pleadings are accepted by the Aerdi Commercial Court without further authentication. His sworn statements are admissible in any Aerdi or Yeomanry court.</p>") },
    { slug: "feat-quiet-network", template: () => feat("Quiet Network",
      "<p>Halask maintains correspondence with eleven Aerdi commercial-court advocates, three Aerdi imperial-customs functionaries, and Caelith Dunivar. He can request a procedural opinion or deposition from any of them within five to fifteen days.</p>") },
    { slug: "feat-reader-filings", template: () => feat("Reader of Filings",
      "<p><strong>Advantage</strong> on Investigation checks involving Aerdi commercial documents, registry entries, or court records.</p>") },
  ],
  "BR2P4ActAstor": [
    { slug: "clasp-knife", template: () => W.claspKnife },
    { slug: "wave-anchor", template: () => loot("Wave-and-Anchor Pin", "A small enameled wave-and-anchor pin — the mark of a sitting Old Harbor Ward councilor. Astor wears it always; he was a councilor before he was a chandler-and-councilor.") },
    { slug: "chandlers-coat", template: () => clothing("Chandler's Apron and Wool Coat", "A heavy work coat with a leather chandler's apron over it. The coat is older than most of Astor's customers' marriages.", "icons/equipment/chest/coat-collared-leather-tan.webp") },
    { slug: "feat-sea-master", template: () => feat("Sea-Master's Eye",
      "<p><strong>Advantage</strong> on Perception checks involving the harbor, ships, weather, or the small commercial movements of the Old Harbor Ward. Twenty years' experience as a master mariner before he came ashore.</p>") },
  ],
  "BR2P4ActGalenx": [
    { slug: "side-sword", template: () => W.shortsword },
    { slug: "house-ring", template: () => loot("Naelax House Ring", "A heavy gold ring bearing the Naelax house device — a stylized eagle on a black field. Worn on his left hand. Marks him as a Naelax cousin.", "icons/equipment/finger/ring-engraved-band-gold.webp") },
    { slug: "mothers-signet", template: () => loot("Mother's Family Signet", "A smaller silver signet ring on his right hand — his mother's family. Worn quietly; the signet is small and the family is minor.", "icons/equipment/finger/ring-band-thick-silver.webp") },
    { slug: "house-coat", template: () => clothing("Naelax House Coat", "Restrained noble cut in deep bottle-green and black — the Naelax house colors. The cut is restrained because the times are restrictive: ostentation would invite further restriction from the four-house coalition holding him under polite house arrest.") },
    { slug: "feat-noble-bearing", template: () => feat("Aerdy Noble's Bearing",
      "<p><strong>Advantage</strong> on Persuasion checks at Aerdy noble gatherings or in formal Aerdi court settings. Galenix has spent ten years as the senior Naelax presence in Rel Astra; he knows the room.</p>") },
  ],
  "BR2P4ActMirelth": [
    { slug: "house-pin", template: () => loot("Mirelth House Pin", "A small bronze pin marking him as a member of House Mirelth. The bronze is showing wear; the family standing has been showing wear for four years.") },
    { slug: "civic-coat", template: () => clothing("Reformist's Civic Coat", "A respectable Aerdy commercial-quarter coat with the modest reformist cut — high collar, plain cuffs, a single small enameled pin of his civic transparency committee.") },
  ],
  "BR2P4ActVesh": [
    { slug: "academic-chain", template: () => loot("Magister's Silver-and-Pearl Academic Chain", "The College's mark of magisterial distinction — silver links with small freshwater pearls at the throat. Worn at his collar.", "icons/sundries/gaming/chess-king-silver.webp") },
    { slug: "lenses", template: () => loot("Reading Lenses", "Standard Aerdy academic reading lenses, kept in a small soft pouch when not in use.", "icons/sundries/gaming/glasses-half-moon.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "codex-mercatum", template: () => loot("Codex Mercatum (4 vols.)", "Vesh's own published reference — the four-volume standard work on Aerdi commercial procedure. His copy travels with him; smaller editions are at every magister's desk in the Aerdi commercial-court system.", "icons/sundries/books/book-stack.webp") },
  ],
  "BR2P4ActTenrel": [
    { slug: "advocate-pin", template: () => loot("Aerdy Commercial-Court Advocate's Pin", "A small gold-and-jet pin marking her standing in the Aerdi commercial bar. Worn at the throat of her wine-colored advocate's coat.") },
    { slug: "advocate-coat", template: () => clothing("Wine-Colored Advocate's Coat", "Dark wine-red Aerdi commercial-court advocate's coat with white linen at the collar and cuffs. Tailored. Tenrel's grooming is precise and her wardrobe is more expensive than her listed income.") },
  ],

  // -------- PHASE 5 --------
  "BR2P5ActOstren": [
    { slug: "audit-pin", template: () => loot("Audit Hall Enamel Pin", "A small silver-and-green Audit Hall pin at his collar — has not been recalled, even after the Closure motion. Pell still wears it because no one has told him to take it off.") },
    { slug: "clerk-coat", template: () => clothing("Worn Brown Clerk's Coat", "A respectable but worn brown clerk's coat. The collar is set noticeably higher than it was made for, as a thin further layer of privacy.") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
  ],
  "BR2P5ActAldea": [
    { slug: "lenses", template: () => loot("Reading Lenses on Silver Cord", "Reading lenses on a fine silver cord, currently pushed up on her forehead. Used for close paleographic work.", "icons/sundries/gaming/glasses-half-moon.webp") },
    { slug: "old-ring", template: () => loot("Worn Silver Ring", "A small dark silver ring on her left hand bearing a worn device — possibly once a scroll-and-quill, too worn to be sure. The mark of a paleographic school whose name Aldea no longer uses.", "icons/equipment/finger/ring-band-thick-silver.webp") },
    { slug: "workshop-apron", template: () => clothing("Druid's Workshop Apron", "A heavy dark-brown leather apron, workshop-stained and well-cared-for. Worn over a plain grey wool dress when she works the wax samples.", "icons/equipment/chest/coat-leather-brown-old.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
    { slug: "herbalism", template: () => herbalismKit() },
    { slug: "feat-reader-hands", template: () => feat("Reader of Hands",
      "<p>Aldea identifies the era, region, and likely paleographic school of any document she has time to study (one hour minimum). She also identifies the recipe-family of any sealing wax she can examine in person.</p>") },
    { slug: "feat-fey-ancestry", template: () => feat("Fey Ancestry",
      "<p><strong>Advantage</strong> on saves against being charmed. Magic cannot put Aldea to sleep.</p>",
      { sourceId: "Compendium.dnd-players-handbook.classfeatures.Item.species-elf-fey-ancestry" }) },
  ],
  "BR2P5ActBrane": [
    { slug: "wheatsheaf-pin", template: () => loot("Yeomanry Councilor's Bronze Wheatsheaf Pin", "A small bronze pin in the shape of a wheatsheaf — the Yeomanry's mark of seated Council office. Worn at the lapel of his plain dark wool coat.") },
    { slug: "councilor-coat", template: () => clothing("Yeomanry Councilor's Coat", "A heavy dark grey-green wool councilor's coat with a high collar and brass buttons. No other ornament beyond the wheatsheaf pin.") },
  ],
  "BR2P5ActHalvern": [
    { slug: "shortsword", template: () => W.shortsword },
    { slug: "pewter-pin", template: () => loot("Southern-District Pewter Pin", "A small pewter pin in the shape of the southern district arms. Worn under the widow's cap.", "icons/sundries/misc/pin-bronze.webp") },
    { slug: "widows-dress", template: () => clothing("Widow's Cap and Plain Wool Dress", "A widow's cap of dark wool and a matching plain dress. Halvern has worn variations of this for the eleven years since her husband's death.") },
  ],
  "BR2P5ActVoss": [
    { slug: "scale-scroll", template: () => loot("Old Notarial Silver Scale-and-Scroll Badge", "Mairra's old notarial seal of office, kept past retirement. Worn at her throat over her notary's high-collared linen blouse. Functions as identification only; the seal-press is in storage.", "icons/sundries/scrolls/scroll-symbol-coin-blue.webp") },
    { slug: "lenses", template: () => loot("Reading Lenses on Black Silk Cord", "Fine reading lenses on a black silk cord around her neck.", "icons/sundries/gaming/glasses-half-moon.webp") },
    { slug: "library-volumes", template: () => loot("Notary's Library Reference Volumes", "A small stack of reference volumes Mairra keeps at her seat in the Council chamber — the most complete trade-clearing reference library in the Yeomanry outside the Audit Hall itself.", "icons/sundries/books/book-stack.webp") },
    { slug: "calligraphers", template: () => calligraphersSupplies() },
  ],
  "BR2P5ActThale": [
    { slug: "longsword", template: () => W.longsword },
    { slug: "heavy-crossbow", template: () => W.heavyCrossbow },
    { slug: "bolts", template: () => bolts(20) },
    { slug: "clasp-knife", template: () => W.claspKnife },
    { slug: "chain-mail", template: () => A.chainMail },
    { slug: "shield", template: () => A.shield },
    { slug: "gorget", template: () => loot("Marshal's Bronze Gorget", "A polished but unornamented bronze gorget at his throat — the rank insignia of a Yeomanry city-detachment marshal. Worn over his hauberk.", "icons/equipment/neck/collar-rounded-steel.webp") },
    { slug: "feat-multiattack", template: () => F.multiattack("Thale makes two attacks: one with his longsword and one shield bash, or two with his longsword.") },
    { slug: "feat-parry", template: () => F.parry(3) },
    { slug: "feat-subdue", template: () => feat("Subdue (1/short rest)",
      "<p>When Thale reduces a creature to 0 HP with a melee attack, he may choose to knock them <strong>unconscious</strong> instead of killing them, with no penalty to the attack. <strong>Recharges:</strong> short or long rest.</p>",
      { uses: { value: 1, max: "1", recovery: [{ period: "sr", type: "recoverAll" }], spent: 0 } }) },
  ],
  "BR2P5ActQuill": [
    { slug: "scimitar", template: () => W.scimitar },
    { slug: "dagger", template: () => W.dagger },
    { slug: "hand-crossbow", template: () => W.handCrossbow },
    { slug: "bolts", template: () => bolts(10) },
    { slug: "studded-leather", template: () => A.studdedLeather },
    { slug: "northern-coat", template: () => clothing("Northern Lawyer's Coat", "Long, plain, well-cut dark grey wool — the kind of coat a lawyer wears who does not want to be remembered.") },
    { slug: "whistle", template: () => loot("Whistle on Cord", "A thin silver whistle on a cord around his neck. Calls one Thug from a neighboring rooftop; the Thug arrives by round 3 of any combat. (Use SRD Thug stat block.)", "icons/sundries/misc/whistle-pipe-bronze.webp") },
    { slug: "feat-multiattack", template: () => F.multiattack("Quill makes two melee attacks (scimitar + dagger, or two scimitar) and one Hand Crossbow attack.") },
    { slug: "feat-parry", template: () => F.parry(2) },
  ],
};

// ============================================================================
// EMITTER
// ============================================================================

function makeItem(actorId, plan) {
  const id = itemId(actorId, plan.slug);
  const tmpl = plan.template();

  // Build the embedded item JSON.
  const out = {
    _key: `!actors.items!${actorId}.${id}`,
    _id: id,
    name: tmpl.name,
    type: tmpl.type,
    img: tmpl.img,
    system: tmpl.system,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: blankFlagsWithSourceId(tmpl.sourceId),
    _stats: blankStats(),
  };

  return out;
}

function populateActor(actorPath) {
  const json = JSON.parse(fs.readFileSync(actorPath, "utf8"));
  const actorId = json._id;
  const plan = ACTOR_PLAN[actorId];
  if (!plan) {
    return { id: actorId, status: "skipped (no plan)" };
  }
  const items = plan.map((p, idx) => {
    const item = makeItem(actorId, p);
    item.sort = (idx + 1) * 100;
    return item;
  });
  json.items = items;
  return { actorPath, json, id: actorId, count: items.length };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyId = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

  const actorDirs = ["phase-1-actors", "phase-2-actors", "phase-3-actors", "phase-4-actors", "phase-5-actors"];

  let totalActors = 0;
  let totalItems = 0;

  for (const dir of actorDirs) {
    const dirPath = path.join(SOURCE, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json"));
    for (const f of files) {
      const fp = path.join(dirPath, f);
      const json = JSON.parse(fs.readFileSync(fp, "utf8"));
      const actorId = json._id;
      if (onlyId && actorId !== onlyId) continue;
      const result = populateActor(fp);
      if (result.status === "skipped (no plan)") {
        console.log(`  SKIP ${actorId} (${f}) — no plan`);
        continue;
      }
      console.log(`  ${result.id} ← ${result.count} items`);
      if (!dryRun) {
        fs.writeFileSync(result.actorPath, JSON.stringify(result.json, null, 2) + "\n");
      }
      totalActors++;
      totalItems += result.count;
    }
  }

  console.log(`\n${totalActors} actors populated; ${totalItems} items total.`);
  if (dryRun) console.log("(dry-run; no files written)");
}

main();
