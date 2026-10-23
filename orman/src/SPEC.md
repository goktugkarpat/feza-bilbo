# Bilbo ve Saklı Toplar Ormanı — runtime contracts

## Standalone forest adventure — revision 2

This folder is the `orman/` adventure of Feza ve Bilbo'nun Maceraları (root ../). Six chapters (ZONES in 06_level.js: kamp, gol, mese, selale, gece, bataklik; contract ../BOLUMLER.md) each end with a chapter boss and (except the last) a magic door + camp moment (FOREST_PARTY.kampAni). Hero classes: warrior / wizard / hybrid (chosen on the title screen). Saves/preferences use the `orman_` prefix; there is no own service worker (root ../sw.js caches everything).

ITEMS retains the original API but its catalogue contains 19 new woodland objects (7 weapons, 6 hats, 6 clothes). No wand/lightsaber is obtainable. Legacy prototype gear migrates preserving uid, rarity, power and item level; the crocodile boss guarantees Timsahın Dostluk Kılıcı. SKILLS has three new abilities: Palamut Yağmuru (level1/CD4), Yaprak Kasırgası (level3/CD15), Ormanın Kucaklaması (level5/CD24); effects are pooled and simulation-time driven, not wall timers.

Start is the four friends’ camp: two tents, a small fire, picnic blanket/log seat, Bilbo’s bed/bowl and an eagle perch. Decoration stays batched; the central route is open. Father/eagle appear in both title and play, but buried-ball searching is play-only. There are exactly10 buried balls and5 checkpoints.

Shared enemy rigs normalize glow colour once to THREE.Color. All glow RGB values must be finite; windup/hurt/frozen/cheer/death must never overwrite the material’s base colours.

Child-friendly forest balance: Father/eagle/Bilbo attack weights are .60/.16/.30. Father attack duration is .56 s (contact .20 s) and recovery gap .80 s; eagle duration .88 s and recovery gap 4 s. hurtPlayer applies a .35 forest multiplier to all incoming hits, including boss/projectiles. New game and respawn give five potions; maximum remains5. Old pre-v3 saves gain five potions on migration without losing progress; snapshots carry forestBalance:1 so later saved potion usage remains meaningful.

### Forest ball discovery and father motion (2026-10-08)
- Bilbo's 2.1 s excavation expands a shared irregular soil mesh to scale (1.30, 1, 1.16). The revealed ball has radius .32 and rests at y .35 after a short reveal bounce.
- An exposed ball remains visible for at least 1.3 s and is collected only when Feza is within .62 m; digging alone never adds it to inventory. The enlarged excavation remains after collection and survives save/restore.
- Discovery and pickup have separate translated messages. All ten balls retain their unique IDs and single collection events.
- Father's axe rig includes a waist and two clavicle joints. Preparation, impact and recovery coordinate the chest, shoulders, elbows, wrists and planted feet; damage timing is .20 s in the .56 s attack. Model remains four draw calls.

### Forest helper balance refresh (2026-10-08)
- Forest incoming damage multiplier is .35 before existing armor/difficulty modifiers. Father hits for .60 of Feza's melee damage and rests .80 s after a .56 s swing; contact is .20 s. Eagle hits for .16 and rests 4 s after its .88 s dive. Boss helper damage retains the .62 multiplier.
- Father's continuous axe curves now have a stronger wind-up, torso twist, elbow extension and follow-through, without a held contact pose or additional draw calls.
- All ten buried balls use warm orange variants and cream stripes, retaining radius .32, contact-only pickup and persistent excavation.

### Father's silhouette refresh (2026-10-08)
- Father's scalp and temples are clean-shaven. Eyebrows and beard remain; overlapping charcoal, gray and ivory locks mix across the whole beard rather than separate blocks.
- Tapered torso, narrower waist, fitted jacket panels and a smaller satchel replace the rounded belly silhouette. The existing articulated axe rig and helper damage/cadence remain unchanged.

### Barbarian guardian father (2026-10-08)
- Bare, sculpted chest and broad shoulders taper to a narrower waist. Smaller eyes, a broader lower face, bald scalp and fine mixed silver/charcoal beard retain a friendly adult expression.
- A diagonal stitched leather baldric, fur-lined single shoulder, articulated bracers and overlapping leather belt/skirt panels replace the buttoned vest, green trousers and backpack. All surfaces use the existing four batched materials and 18-bone rig; helper combat balance is unchanged.
- Geometry is built once; torso contours and beard locks do not add per-frame allocations or draw calls.


## Final polish and Turkish-only release

- `FEZA_LANG` is a small Turkish-only compatibility facade: t/html preserve text, choose resolves immediately, and language is always tr. No second-language narration, language picker or second manifest is loaded. `AUD` uses only VOICE_MP3 / VOICE_DUR and Turkish LINES.
- Forest skill icons and attack/weapon symbols use fixed, illustrated SVGs created once on slot unlock. Touch targets, cooldown layers and keyboard bindings are unchanged.
- Palamut caps and spinning leaves reuse shared bark/leaf normal maps. Yaprak Kasırgası uses soft tapered wind wisps. Ormanın Kucaklaması has eight tapered, staggered roots in one InstancedMesh (one draw instead of eight) and gently moving elongated petals; damage, unlocks and cooldowns are unchanged.
- Forest water uses the same two noise texture reads, with shallow-edge tint, restrained shoreline ripples and coherent animated normals. Camp embers/smoke share existing GPU point batches and add no lights.
- Father's limb winding and shoulder attachment are corrected; the leather sash follows the chest and back. Eagle wings, head, tail and feet follow dive/recovery with delayed secondary motion. Animal attacks blend preparation into release and return; animal-specific happy gestures remain restrained. Mesh/bone budgets and combat balance stay unchanged.
- Runtime scripts are classic local files. Save keys are prefixed `orman_`; caching is done by the root ../sw.js. Death/save preserves equipment, XP and collected balls; no original game's state is touched.

## Six chapters (BOLGE, 2026-10-23)
- `ZONES` (06_level.js) holds only the six forest chapters, in order: `kamp`, `gol`, `mese`, `selale`, `gece`, `bataklik` (all `theme:'forest'`, `expansion:true`; only `bataklik` is `final`). Each has `rooms` (5–6 incl. start and boss arena), `side` (0/1 discovery loop), `balls` (2,2,2,1,1,2), `enemies`/`elites`/`pack`, gentle `hpMult`/`dmgMult` rising 0.72→1.1 / 0.6→0.95, `boss`, `bossYedek` (stand-in while the chapter boss type is missing), `lvl` (Feza's level when jumping there from the map without a save), `music: 'orman_<id>'` (falls back to `uzunorman`).
- Globals from 06: `zoneBoss(Z)`, `zoneEnemies(Z)`, `zoneElites(Z)` resolve HAYVAN's types, falling back via `ENEMY_YEDEK`.
- Look per chapter: `ZLOOK[id]` inside LEVEL (lighting/fog over THEME.forest, floor tints and surfaces over FLOOR.forest — uniform/texture values only, one floor program; tree species weights and leaf palettes; tuft tint). Landmarks are planned in `reserveForestPonds` (`B.fz`) and drawn in `buildForestAdventure`: lake + jetty + ducks (gol), treehouse/hollows/bear den/acorns (mese), cliffs + waterfalls + rainbows + eagle nest (selale), glow mushrooms + lanterns + fireflies + owl tree (gece, pooled torch lights only), shallow lily channels, mud, roots (bataklik), beaver dam (kamp). Every chapter starts at a small camp (full camp in `kamp`).
- Balls: global ids `orman-top-01..10` in chapter order (`L.buriedBalls`, numbering = sum of earlier chapters' `balls`). 07 keeps the trip's set (`ballsGot`), restores found balls into each chapter's FOREST_PARTY, rewrites `forestBall`/`forestCollection` events to `{have (of 10), need:10, zoneHave, zoneNeed, id}`.
- Flow (07): chapter boss cheers up → once the chapter's balls are found (any left are brought by Bilbo: `orman_top_getirdi`) the portal opens and the chapter is recorded done → Feza enters → `GAME.state='kamp'`, `FOREST_PARTY.kampAni(id, done, ctx)` (40 s safety; skipped if missing or `?kampyok`) → `emit('zoneDone',{index,id})` → portal transition → next chapter. Final: boss cheers → balls → kampAni('bataklik') → `victory()` (+ `FEZA_BILBO_TAMAM('orman')`).
- Progress: `orman_bilboSakliToplar.bolumler.v1` = `{v:1, acik, bitti:[ids]}` (saved automatically; only opened chapters). Game state still only via Kaydet in `orman_bilboSakliToplar.save.v1`; `forest` block v2 = `{v:2, zid, balls, party, seed, districts, checkpoint, position}`. An old single-forest save (`zid:'uzunorman'`) continues at chapter 1 keeping its collected balls, level and bag.
- GAME API: `mapUnlocked()` (true), `zonesOpen()`, `zoneInfo(i)` → `{index,id,ad,open,done,balls,ballsMax}`, `ballsInfo()`, `travelTo(i,{heroClass,difficulty})` (false for a closed chapter), `newGame({zone,heroClass})`, `ballsGot`, test hooks `GAME._test.{bossDown, bringBalls, kampBitir, state}`. Events: `zone {index,id,name,title}`, `kamp {on,id}`, `zoneDone {index,id}`.
- Chapter bosses: HAYVAN's `FOREST_ANIMALS.bossKits` / `bossAI(ctx)` are merged into BOSS_KIT / BOSS_AI at load (guarded); `bossCfg` uses `BOSS_KIT[type].cfg` first.
