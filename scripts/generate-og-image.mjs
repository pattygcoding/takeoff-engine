// Renders public/og-preview.svg to public/og-preview.png.
//
// Social scrapers (Facebook, LinkedIn, X) do not render SVG, so the OpenGraph preview image must
// be a raster format. Run with `npm run og:image` after editing the source SVG.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(projectRoot, 'public', 'og-preview.svg');
const outPath = path.join(projectRoot, 'public', 'og-preview.png');

const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(svgPath).href);
  await page.screenshot({
    path: outPath,
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
} finally {
  await browser.close();
}

console.log(`Wrote ${outPath} (${WIDTH}x${HEIGHT})`);
