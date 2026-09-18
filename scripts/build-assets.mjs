// Génère toutes les bannières (SVG + PNG) à partir d'un seul gabarit.
//
//   node scripts/build-assets.mjs
//
// Le rendu PNG passe par Playwright (Chromium). Si le paquet n'est pas
// installé dans ce repo, pointer PLAYWRIGHT_DIR vers un node_modules qui le contient :
//   PLAYWRIGHT_DIR=../autre-projet/node_modules node scripts/build-assets.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

// ---------------------------------------------------------------- contenu

const PROFILE = {
  name: 'Florent Bernar',
  title: 'Développeur IA',
  company: 'Les EntreCodeurs',
  city: 'Metz, Grand Est',
  stack: ['C#/.NET', 'TypeScript'],
};

const THEMES = {
  dark: {
    bg: ['#150F22', '#241A38'], text: '#FFFFFF', muted: '#B9AFCC', value: '#C9A7E8',
    glowA: 0.5, glowB: 0.4, grid: 'rgba(255,255,255,0.05)',
    card: 'rgba(255,255,255,0.04)', cardStroke: 'rgba(255,255,255,0.10)',
    pill: 'rgba(255,255,255,0.06)', pillStroke: 'rgba(255,255,255,0.14)', logoInk: 'white',
  },
  light: {
    bg: ['#FFFFFF', '#F3EFFA'], text: '#1B1033', muted: '#5B5170', value: '#8048A8',
    glowA: 0.2, glowB: 0.16, grid: 'rgba(27,16,51,0.05)',
    card: 'rgba(255,255,255,0.75)', cardStroke: 'rgba(27,16,51,0.10)',
    pill: 'rgba(128,72,168,0.06)', pillStroke: 'rgba(128,72,168,0.22)', logoInk: '#1B1033',
  },
};

const SANS = 'Segoe UI, Helvetica Neue, Arial, sans-serif';
const MONO = 'Consolas, Menlo, monospace';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Chemins du logo LEC (viewBox 227x106), l'encre blanche est retintée selon le thème.
const LOGO_PATHS = readFileSync(join(ASSETS, 'lec-logo-dark.svg'), 'utf8')
  .match(/<path[\s\S]*?\/>/g)
  .join('\n');
const LOGO_W = 227;
const LOGO_H = 106;

// ---------------------------------------------------------------- briques

function defs(t, w, h) {
  const grid = Math.round(Math.max(w, h) / 36);
  return `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${t.bg[0]}"/><stop offset="100%" stop-color="${t.bg[1]}"/></linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#8048A8"/><stop offset="100%" stop-color="#EA5153"/></linearGradient>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${t === THEMES.dark ? '#B57BE0' : '#8048A8'}"/><stop offset="100%" stop-color="#EA5153"/></linearGradient>
  <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#8048A8" stop-opacity="${t.glowA}"/><stop offset="100%" stop-color="#8048A8" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#EA5153" stop-opacity="${t.glowB}"/><stop offset="100%" stop-color="#EA5153" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M${grid} 0H0V${grid}" fill="none" stroke="${t.grid}" stroke-width="1"/></pattern>
</defs>`;
}

function background(w, h, glows) {
  const r = Math.max(w, h) * 0.24;
  const [a, b] = glows ?? [[w * 0.84, h * 0.1], [w * 0.97, h * 0.95]];
  return `<rect width="${w}" height="${h}" fill="url(#bg)"/>
<rect width="${w}" height="${h}" fill="url(#grid)"/>
<circle cx="${a[0]}" cy="${a[1]}" r="${r * 1.1}" fill="url(#glowA)"/>
<circle cx="${b[0]}" cy="${b[1]}" r="${r}" fill="url(#glowB)"/>`;
}

function logo(t, x, y, height) {
  const s = height / LOGO_H;
  return `<g transform="translate(${x}, ${y}) scale(${+s.toFixed(4)})">${LOGO_PATHS.replace(/fill="white"/g, `fill="${t.logoInk}"`)}</g>`;
}

const logoWidth = (height) => (LOGO_W * height) / LOGO_H;

// Largeur approximative d'un texte en police mono (Consolas ≈ 0.55em).
const monoWidth = (text, fs) => text.length * fs * 0.55;

function pills(t, x, y, s, align) {
  const fs = 16 * s, h = 36 * s, pad = 18 * s, gap = 12 * s;
  const widths = PROFILE.stack.map((p) => monoWidth(p, fs) + pad * 2);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let cx = align === 'end' ? x - total : align === 'middle' ? x - total / 2 : x;
  return PROFILE.stack.map((p, i) => {
    const w = widths[i];
    const out = `<rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${t.pill}" stroke="${t.pillStroke}"/>
<text x="${(cx + w / 2).toFixed(1)}" y="${(y + h / 2 + fs * 0.35).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="${fs}" fill="${t.value}">${esc(p)}</text>`;
    cx += w + gap;
    return out;
  }).join('\n');
}

// Bloc identité : barre d'accent, nom, titre, entreprise, pastilles de stack.
// `y` = haut du bloc. Hauteur totale à l'échelle 1 : BLOCK_H.
const BLOCK_H = 222;
function identity(t, x, y, s, align = 'start', { withPills = true, sub = `${PROFILE.company} · ${PROFILE.city}` } = {}) {
  const anchor = align === 'start' ? '' : ` text-anchor="${align}"`;
  const barW = 72 * s;
  const barX = align === 'end' ? x - barW : align === 'middle' ? x - barW / 2 : x;
  return `<rect x="${barX.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${5 * s}" rx="${2.5 * s}" fill="url(#accent)"/>
<text x="${x}" y="${(y + 64 * s).toFixed(1)}"${anchor} font-family="${SANS}" font-size="${54 * s}" font-weight="700" fill="${t.text}">${esc(PROFILE.name)}</text>
<text x="${x}" y="${(y + 108 * s).toFixed(1)}"${anchor} font-family="${SANS}" font-size="${32 * s}" font-weight="600" fill="url(#ink)">${esc(PROFILE.title)}</text>
<text x="${x}" y="${(y + 146 * s).toFixed(1)}"${anchor} font-family="${SANS}" font-size="${20 * s}" font-weight="500" fill="${t.muted}">${esc(sub)}</text>
${withPills ? pills(t, x, y + 176 * s, s, align) : ''}`;
}

// Carte « code » façon éditeur.
const CARD_W = 400;
const CARD_H = 196;
function card(t, x, y, s) {
  const fs = 17 * s, line = 28 * s, ix = x + 20 * s, kx = ix + 22 * s;
  const rows = [
    ['role', `"${PROFILE.title}"`],
    ['stack', `["C#/.NET", "TS"]`],
    ['team', `"${PROFILE.company}"`],
  ];
  const y0 = y + 76 * s;
  return `<rect x="${x}" y="${y}" width="${CARD_W * s}" height="${CARD_H * s}" rx="${16 * s}" fill="${t.card}" stroke="${t.cardStroke}"/>
<circle cx="${x + 24 * s}" cy="${y + 24 * s}" r="${5.5 * s}" fill="#EA5153"/>
<circle cx="${x + 44 * s}" cy="${y + 24 * s}" r="${5.5 * s}" fill="#F0B429"/>
<circle cx="${x + 64 * s}" cy="${y + 24 * s}" r="${5.5 * s}" fill="#8048A8"/>
<text x="${ix}" y="${y0 - line}" font-family="${MONO}" font-size="${fs}" fill="#EA5153">{</text>
${rows.map(([k, v], i) => `<text x="${kx}" y="${(y0 + i * line).toFixed(1)}" font-family="${MONO}" font-size="${fs}" fill="${t.muted}">"${k}": <tspan fill="${t.value}">${esc(v)}</tspan>${i < rows.length - 1 ? ',' : ''}</text>`).join('\n')}
<text x="${ix}" y="${(y0 + rows.length * line).toFixed(1)}" font-family="${MONO}" font-size="${fs}" fill="#EA5153">}</text>`;
}

function svg(w, h, t, body, { rounded = 0 } = {}) {
  const label = `${PROFILE.name} - ${PROFILE.title} chez ${PROFILE.company}`;
  const bar = Math.max(6, Math.round(h / 66));
  const content = `${background(w, h, body.glows)}
${body.svg}
<rect y="${h - bar}" width="${w}" height="${bar}" fill="url(#accent)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(label)}">
${defs(t, w, h)}
${rounded ? `<clipPath id="round"><rect width="${w}" height="${h}" rx="${rounded}"/></clipPath>\n<g clip-path="url(#round)">\n${content}\n</g>` : content}
</svg>
`;
}

// ---------------------------------------------------------------- mises en page

// Texte à gauche, carte code à droite (README, Open Graph, GitHub).
function splitLayout(w, h, t, { s, padX, logoH, card: withCard = true }) {
  const blockH = BLOCK_H * s;
  const gap = 36 * s;
  const top = (h - (logoH + gap + blockH)) / 2;
  const cardS = s * 1.02;
  return {
    svg: `${logo(t, padX, top, logoH)}
${identity(t, padX, top + logoH + gap, s)}
${withCard ? card(t, w - padX - CARD_W * cardS, (h - CARD_H * cardS) / 2, cardS) : ''}`,
  };
}

// Logo en haut à gauche, identité alignée à droite : le coin bas-gauche reste
// libre pour la photo de profil (LinkedIn, X, Facebook).
function rightLayout(w, h, t, { s, right, logoH, logoX, logoY, cy = h / 2 }) {
  const blockH = BLOCK_H * s;
  return {
    svg: `${logo(t, logoX, logoY, logoH)}
${identity(t, right, cy - blockH / 2, s, 'end')}`,
  };
}

// Tout centré (YouTube, Instagram).
function centerLayout(w, h, t, { s, cy, logoH, withCard = false, cardGap = 56 }) {
  const blockH = BLOCK_H * s;
  const gap = 40 * s;
  const cardS = s * 1.1;
  const cardBlock = withCard ? cardGap * s + CARD_H * cardS : 0;
  const total = logoH + gap + blockH + cardBlock;
  const top = cy - total / 2;
  const blockTop = top + logoH + gap;
  return {
    glows: [[w * 0.85, h * 0.12], [w * 0.1, h * 0.92]],
    svg: `${logo(t, (w - logoWidth(logoH)) / 2, top, logoH)}
${identity(t, w / 2, blockTop, s, 'middle')}
${withCard ? card(t, (w - CARD_W * cardS) / 2, blockTop + blockH + cardGap * s, cardS) : ''}`,
  };
}

// ---------------------------------------------------------------- formats

const d = THEMES.dark;

const FORMATS = [
  // README GitHub (bords arrondis, thèmes clair et sombre)
  ...['dark', 'light'].map((theme) => ({
    file: `banner-${theme}`, svgDir: ASSETS, pngDir: join(ASSETS, 'png'), pngName: `banner-${theme}@2x`, scale: 2,
    w: 1200, h: 320, rounded: 24, theme: THEMES[theme],
    layout: (w, h, t) => splitLayout(w, h, t, { s: 0.92, padX: 72, logoH: 56 }),
  })),
  {
    file: 'linkedin-banner', w: 1584, h: 396,
    layout: (w, h, t) => rightLayout(w, h, t, { s: 1.02, right: w - 72, logoH: 64, logoX: 72, logoY: 44 }),
  },
  {
    // Même ratio pour Bluesky et Mastodon.
    file: 'x-header', w: 1500, h: 500,
    layout: (w, h, t) => rightLayout(w, h, t, { s: 1.12, right: w - 96, logoH: 64, logoX: 72, logoY: 56, cy: h * 0.48 }),
  },
  {
    // Sur mobile Facebook rogne les côtés : on reste dans les ~1100 px centraux.
    file: 'facebook-cover', w: 1640, h: 624,
    layout: (w, h, t) => rightLayout(w, h, t, { s: 1.25, right: w - 300, logoH: 72, logoX: 300, logoY: 72, cy: h * 0.5 }),
  },
  {
    // Zone visible sur tous les écrans : 1546 x 423 au centre.
    file: 'youtube-banner', w: 2560, h: 1440,
    layout: (w, h, t) => centerLayout(w, h, t, { s: 1.25, cy: h / 2, logoH: 70 }),
  },
  {
    file: 'github-social-preview', w: 1280, h: 640,
    layout: (w, h, t) => splitLayout(w, h, t, { s: 1.12, padX: 88, logoH: 84 }),
  },
  {
    file: 'og-image', w: 1200, h: 630,
    layout: (w, h, t) => splitLayout(w, h, t, { s: 1.06, padX: 80, logoH: 84 }),
  },
  {
    file: 'instagram-post', w: 1080, h: 1080,
    layout: (w, h, t) => centerLayout(w, h, t, { s: 1.35, cy: h / 2, logoH: 110, withCard: true }),
  },
  {
    // Marges haut/bas de 250 px laissées libres pour l'interface Stories.
    file: 'instagram-story', w: 1080, h: 1920,
    layout: (w, h, t) => centerLayout(w, h, t, { s: 1.5, cy: h / 2, logoH: 130, withCard: true, cardGap: 80 }),
  },
];

// ---------------------------------------------------------------- rendu

const SOCIAL = join(ASSETS, 'social');
mkdirSync(join(SOCIAL, 'src'), { recursive: true });
mkdirSync(join(ASSETS, 'png'), { recursive: true });

const jobs = FORMATS.map((f) => {
  const t = f.theme ?? d;
  const body = f.layout(f.w, f.h, t);
  const out = svg(f.w, f.h, t, body, { rounded: f.rounded });
  const svgPath = join(f.svgDir ?? join(SOCIAL, 'src'), `${f.file}.svg`);
  writeFileSync(svgPath, out);
  return { svg: out, w: f.w, h: f.h, scale: f.scale ?? 1, png: join(f.pngDir ?? SOCIAL, `${f.pngName ?? f.file}.png`) };
});

// Avatar et logos : on réexporte les sources existantes.
const avatar = readFileSync(join(ASSETS, 'avatar.svg'), 'utf8');
for (const size of [400, 800, 1000]) {
  jobs.push({ svg: avatar.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`), w: size, h: size, scale: 1, png: join(ASSETS, 'png', `avatar-${size}.png`) });
}
for (const theme of ['dark', 'light']) {
  jobs.push({ svg: readFileSync(join(ASSETS, `lec-logo-${theme}.svg`), 'utf8'), w: LOGO_W, h: LOGO_H, scale: 2, png: join(ASSETS, 'png', `lec-logo-${theme}@2x.png`) });
}

const req = createRequire(process.env.PLAYWRIGHT_DIR ? join(resolve(process.env.PLAYWRIGHT_DIR), 'x.js') : import.meta.url);
const { chromium } = req('playwright');
const browser = await chromium.launch();
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: job.scale });
  await page.setContent(`<html><body style="margin:0;background:transparent">${job.svg}</body></html>`);
  await page.screenshot({ path: job.png, clip: { x: 0, y: 0, width: job.w, height: job.h }, omitBackground: true });
  await page.close();
  console.log('✓', job.png.slice(ROOT.length + 1));
}
await browser.close();
