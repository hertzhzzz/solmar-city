// SOLMAR CITY — main.ts
// The entry program for make.fun's gta6-01 bounty.
// It copies game/ and screenshots/ into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 standard library only; no network, no install step.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname);
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function copyTree(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    const src = join(srcDir, entry);
    const dest = join(destDir, entry);
    if (statSync(src).isDirectory()) copyTree(src, dest);
    else cpSync(src, dest);
  }
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const gameDir = join(ROOT, 'game');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/ is missing from the repository');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing from the repository');

  copyTree(gameDir, join(OUT, 'game'));
  copyTree(shotsDir, join(OUT, 'screenshots'));

  const dossier = buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  console.log('SOLMAR CITY dossier written to ' + join(OUT, 'dossier.json'));
}

main();
