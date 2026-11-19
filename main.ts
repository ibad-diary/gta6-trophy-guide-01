// Leonida Platinum — gta6-trophy-guide-01 entry program (Node 22, stdlib only).
// The guide itself is plain static files under app/ (index.html, style.css,
// app.js and app/data/trophies.json), so the app opens offline in desktop
// Chrome with no build step. This program hands the entry in: it copies
// app/ and screenshots/ from beside this file into the output directory and
// writes /output/dossier.json with the vendored make.fun library.
// vendor/makefun-frontend.ts is the kit's copy, unchanged — the scorer
// rebuilds the dossier with its own copy and compares byte for byte.
//
// Run locally with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps (competition reference/gate.json): at most 4 screenshots,
// each at most 256 KiB; app/ at most 993 files and directories and 48 MiB;
// the dossier text at most 163,840 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
