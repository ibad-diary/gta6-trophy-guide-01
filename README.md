# Leonida Platinum — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/ibad-diary/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/ibad-diary/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden on PSN): every trophy with its official name, description and grade, a guide in our own words that cites its sources, a 5-stage roadmap to the platinum, and all **28 missable trophies** flagged — built from the official descriptions.

## Features

- **Tracker** — checklist saved in the browser (localStorage), with export to a JSON file and import back
- **Filters** — by kind (story, story missions, stranger strands, collectibles, activities, stunts & races, combat, robbery, economy, exploration, secrets, online), by grade, by earned/remaining, by missable-only, plus full-text search
- **Spoiler-free mode** — hides the names and descriptions of hidden story trophies until they are earned
- **Roadmap to the platinum** — 5 stages in order, with a pre-finale checklist of things to do before the final mission
- **Missables page** — every missable trophy with the reason it can be missed
- **Cited guides** — each trophy's guide names its sources (Exophase and PSNProfiles); counts such as 42 Shooting Range challenges, 14 drone race locations, 18 meditation spots, 52 areas, 9 gangs and 8 garages are PSN's progress targets as PSNProfiles lists them
- **Fully offline** — static files only, no network requests at run time; no Rockstar logo or official artwork

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` through any static file server with `app/` at its root.

## Hand in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-frontend.ts`.

## Sources

- [Exophase — GTA VI trophies](https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/)
- [PSNProfiles — GTA VI trophies](https://psnprofiles.com/trophies/43531-grand-theft-auto-vi)

Unofficial fan-made guide. Grand Theft Auto and GTA are trademarks of Rockstar Games.

---

Built for the make.fun bounty [gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01). Use referral code `s67gjd7a` on make.fun.
