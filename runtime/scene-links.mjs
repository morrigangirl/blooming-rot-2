// Blooming Rot 2 — scene links that open the map
//
// Foundry's own behaviour for a Scene content link (@UUID[...Scene...]) is to
// open the scene's Scene Notes journal if it has one, otherwise its
// configuration sheet — never the map (foundryvtt/foundryvtt #10422, #14795).
// Every scene in this module has its notes set to its encounter page, and that
// page is usually where the link sits, so clicking the link reopens the journal
// you are already reading and appears to do nothing.
//
// For the GM, a click on a link to one of THIS module's compendium scenes now:
//   click         view the scene, importing it into the world first if needed
//   Shift-click   the same, then activate it for the players
//   Alt-click     Foundry's default (the scene's notes, or its configuration)
//
// An existing world copy is found by its compendium source, or by the same id
// when it was imported with "Keep Document IDs"; it is never imported twice.
// Players, other modules' scenes, world scenes, and anything that is not a
// click on a link to that exact scene keep Foundry's default. Any error falls
// back to the default too, so the worst case is today's behaviour.

const MODULE_ID = "blooming-rot-2";

function isModuleCompendiumScene(scene) {
  return scene?.compendium?.metadata?.packageName === MODULE_ID;
}

// The uuid of the content link that was clicked, read from the anchor itself
// (event.currentTarget is gone by the time Foundry's async handler gets here).
function clickedLinkUuid(event) {
  return event?.target?.closest?.("a[data-uuid]")?.dataset?.uuid ?? null;
}

function findWorldCopy(packScene) {
  const source = packScene.uuid;
  return game.scenes.find((s) => (s._stats?.compendiumSource ?? s.flags?.core?.sourceId) === source)
    ?? game.scenes.get(packScene.id)
    ?? null;
}

async function openModuleScene(packScene, { activate = false } = {}) {
  let scene = findWorldCopy(packScene);
  if (!scene) {
    scene = await game.scenes.importFromCompendium(packScene.compendium, packScene.id, {}, { keepId: true });
    ui.notifications.info(`Blooming Rot 2: imported "${scene.name}" into this world.`
      + (scene.notes.size ? ` If its map pins don't open their pages, run the macro "BR2 — Relink Scene Notes (after import)".` : ""));
  }
  return activate ? scene.activate() : scene.view();
}

Hooks.once("setup", () => {
  const SceneClass = CONFIG.Scene.documentClass;
  const original = SceneClass.prototype._onClickDocumentLink;
  if (typeof original !== "function") {
    console.warn(`${MODULE_ID} | Scene#_onClickDocumentLink not found; scene links keep Foundry's default behaviour.`);
    return;
  }
  SceneClass.prototype._onClickDocumentLink = function (event) {
    if (!game.user?.isGM || event?.altKey || !isModuleCompendiumScene(this) || clickedLinkUuid(event) !== this.uuid) {
      return original.call(this, event);
    }
    return openModuleScene(this, { activate: Boolean(event.shiftKey) }).catch((err) => {
      console.error(`${MODULE_ID} | could not open scene "${this.name}" from its link`, err);
      ui.notifications.warn(`Blooming Rot 2: couldn't open "${this.name}" from its link (details in the console).`);
      return original.call(this, event);
    });
  };
});
