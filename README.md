# Spicy Ride

A vanilla JavaScript jetpack game with ten campaign levels, a rainbow fish boss, endless play, outfits, and local two-player play.

Open `index.html` in a browser. No build or runtime dependencies are needed.

## New: run challenges and revives

The bottom-left card tracks three shared challenges per run:

- Ride for 30 seconds of active game time.
- Collect 20 coins (secret-vault coins excluded).
- Travel 100 distance units.

Each awards one reserve heart automatically, once per run. When a player runs out of regular lives, press **R** or click **Use a heart**. In co-op, the first eliminated player receives the revive. Revives restore one life and grant three seconds of protection; score, level time and challenge progress stay intact. Unspent reserve hearts expire when a new run starts. Coins already banked at game over cannot be banked twice after reviving.

## New: scheduled events

Press **G** to open the Event director. Opening it during gameplay pauses the run. Configure the local-clock anchor, interval, and duration; settings are saved in this browser.

Default interpretation of the original brief: noon–4 pm is normal play, then one-hour events begin at 4 pm, 8 pm, midnight, 4 am, and 8 am. Normal play resumes between events. The cycle restarts at noon. You can choose an interval of one hour for back-to-back hourly events.

Event types:

- **Coin shower:** frequent coin formations, no damaging obstacles or boss attacks. Fuel still matters.
- **Double coins:** pickups are worth two coins.
- **Endless spice:** continuously replenished flight fuel.

The event selection is seeded by its clock slot, so reloading does not reroll it. Scheduling uses the device's local clock, not a multiplayer server. Preview overrides are temporary; choose Follow schedule to return to automatic events. Existing obstacles are cleared when a coin shower begins.

G no longer immediately enables cheats. The explicit **Enable testing cheats** button retains infinite lives, unlocked levels, and the test coin bank. Test progress does not persist; reload to leave testing mode. Existing F admin controls remain available. In testing mode, comma slows time, period speeds it up, and apostrophe restores normal speed.

## New: secret vault (spoiler)

During the final **five seconds** of the level 10 boss fight, hold **K + F** together, in either order. This opens a 60-second bonus stage with dense coin formations, unlimited fuel, and no damage. Each pickup is worth 100 coins, capped at **10,000 total across both players**. Difficulty does not multiply this bonus. The countdown pauses with gameplay and follows the game's existing simulation speed. Afterward, the normal campaign victory sequence continues and the usual campaign bonus is awarded separately.

## Controls

- Menus: arrows and Enter; Escape goes back.
- Player 1: hold W to fly; in solo play Up or Space also works.
- Player 2: hold Up to fly.
- Escape: pause.
- R: spend a reserve revive heart.
- G: event director and explicit testing controls.
- F: existing item-spawn admin panel.

## Regression checks

Install Playwright as a development tool, then run:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/features.cjs
```

The browser test covers event boundaries, one-time challenge rewards, solo/co-op revives, incremental coin banking, secret activation boundaries, bonus caps, victory transition, event effects, and pause behavior. It also generates desktop and mobile previews in `test-results/`. These checks manipulate game state to reach boundary conditions; manual playtesting is still useful for balancing.
