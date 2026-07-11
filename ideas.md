# Spicy Ride — Feature Ideas

## 0. Controls

In 1-player mode you can fly with **W**, **↑ (arrow up)** or **SPACE** — whichever
feels best. In 2-player mode P1 uses W and P2 uses ↑.

## 1. Campaign Mode (10 Levels)

A level is beaten by surviving until the timer runs out. Each level lasts as many
minutes as its number:

| Level | Duration | Environment |
|-------|----------|-------------|
| 1     | 30 sec   | Ramen shop (matches the intro story) |
| 2     | 2 min    | City |
| 3     | 3 min    | Snow |
| 4     | 4 min    | Desert |
| 5     | 5 min    | Ocean |
| 6     | 6 min    | Lava |
| 7     | 7 min    | Acid |
| 8     | 4 min    | Space station |
| 9     | 9 min    | Space |
| 10    | 10 min   | Moon (+ boss fight) |

- Levels unlock in order: beat a level to unlock the next one.
- Each environment changes the background art and colors (and later maybe
  environment-specific obstacles, e.g. icicles in Snow, geysers in Lava).
- *Suggestion:* show a level timer in the HUD, and a "LEVEL COMPLETE!" screen with
  the coins collected in that run.

## 2. Difficulty Settings

Chosen before starting a level:

| Difficulty | Hearts |
|------------|--------|
| Easy       | 5      |
| Medium     | 3      |
| Hard       | 1      |

- *Suggestion:* Medium = the current game (3 lives already exists in the code), so
  only Easy and Hard need new values. Higher difficulty could also give bonus coins
  (e.g. ×1 Easy, ×1.5 Medium, ×2 Hard) so Hard is worth playing.

## 3. Final Boss — Level 10 (Moon)

- The first 5 minutes of level 10 play normally.
- Then a **giant fish with white angel wings** appears and starts **vomiting
  rainbows** at the player.
- The rainbow vomit is an attack to dodge (like a moving beam/arc).
- The boss is defeated by surviving the rest of the level (beating the level = win).
- Beating the campaign awards a **1,000-coin bonus** on top of the coins collected.
- Beating the boss plays an **ending cutscene**: the hero takes a piece of the
  fish's rainbow, pockets it, flies back to Earth and licks it off his arm —
  curing the fire at last.
- *Suggestion:* the boss slowly chases the player's height, telegraphs each rainbow
  attack with a warning sound + flash, and does a big explosion + victory screen
  when the timer ends. Beating it rolls the credits / unlocks something special
  (e.g. the Gold outfit at a discount, or a rainbow trail).

## 4. Endless Mode

- The current "fly forever" gameplay stays as its own mode.
- The player can **choose any map/environment** they have unlocked in the campaign
  and fly endlessly there.
- Keeps the current distance + coins scoring (and the 2-player mode).

## 5. Shop & Armour

Coins collected in any mode are saved and can be spent in a shop. The gear is
**armour**, not clothes — equipping a set puts a helmet, chestplate and shoulder
pads on the character in the set's colour:

| Armour | Price |
|--------|-------|
| Lava armour | 500 coins |
| Snow armour | 1,000 coins |
| Gold armour | 2,000 coins |

- *Suggestion:* armour could later add cosmetic particle effects (lava drips,
  snowflakes, golden sparkle trail). In 2-player mode each player picks their own
  set.
- Coins and owned armour need to be saved between sessions (`localStorage`).

## 6. Admin / Test Mode

- The game already has an admin mode on **F** (spawns ramen / sauce / pepper).
- Add: pressing **G** gives **infinite coins**, **infinite hearts** and **unlocks
  all campaign levels** — for testing the shop and levels.
- With testing mode on, **`,`** makes time 2× slower, **`.`** 2× faster and
  **`'`** back to normal.
- *Suggestion:* show a "TESTING MODE" badge on screen while it's active, and don't
  save admin-earned coins/unlocks to the real save file, so testing can't spoil a
  normal playthrough.

## Rough build order (suggestion)

1. Save system (coins, unlocks) with `localStorage`
2. Difficulty select (hearts already exist as `lives`)
3. Level/timer system + level-complete screen
4. Environment themes (start with 2–3, reuse the parallax background code)
5. Shop + outfits
6. Endless mode map select
7. Boss fight last — it's the most new code (boss sprite, attacks, patterns)
