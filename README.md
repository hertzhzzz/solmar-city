# solmar-city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hertzhzzz/solmar-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hertzhzzz/solmar-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMAR CITY** is a complete 2D top-down open-world crime game that runs offline in a desktop browser from static files. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

You are Danny Cole, fresh out of luck in a sun-soaked coastal city. Vic the fixer has three jobs for you: deliver a package to Marina Bay, run down five stashes of cash, then escape a three-star police chase and reach the Hideout Garage. Steal cars, dodge the cops, get paid, own the city.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or open `game/index.html` from any static file server. No build step, no network requests, no dependencies.

## How to play

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, or drive |
| Shift | Run |
| E | Get in / out of a car (steal traffic cars) |
| Space | Punch on foot, handbrake in a car |
| T | Start the next story job (or a $150 side job after the story) |
| P | Pause |
| H or ? | Help |
| M | Mute |
| R | Restart the day |

## What is in the game

- **Open city**: a 3200×3200 road grid with buildings, Palma Park, Solmar Tower, Solmar Stadium, Solmar University, a beach and Marina Bay.
- **On foot and by car**: walk, run, punch, steal parked and traffic cars, arcade driving with skids, crashes and sparks.
- **Traffic and pedestrians**: cars follow the roads and stop for you; pedestrians stroll the sidewalks and flee from speeding cars.
- **Wanted system**: hitting pedestrians, stealing cars and ramming police raise your wanted level (1–5 stars). Police cars chase and ram you; break line of sight to cool down, or get busted and pay a fine.
- **Missions and story**: three story jobs with briefings, gold target markers, a screen-edge arrow and cash rewards, plus repeatable side jobs.
- **Money**: job rewards and green cash bills on the street. Your money and job progress save automatically.
- **HUD and minimap**: money, wanted stars, clock, mission panel, speedometer, and a live minimap showing you, traffic, police, cash and the mission target.
- **Day and night**: a full day cycle with dawn, dusk, night street lamps and headlights.
- **Sound**: synthesised engine, sirens, crashes and jingles with WebAudio — no audio files.

## Files

- `game/index.html` — the page; `game/src/` holds one file per system (`world`, `entities`, `missions`, `render`, `hud`, `input`, `audio`, `save`, `shots`, `main`, `config`, `random`).
- `main.ts` — the make.fun entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — local preview server.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — four real renders of the game running in headless Chromium.

## Screenshots

The cover shows a dusk police chase in the delivery coupe; the others show walking downtown in daylight, a night run at the marina, and the cash-run job at golden hour.

---

<sub>Entered on [make.fun](https://make.fun/?ref=mark-he&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
