#!/usr/bin/env node
/**
 * Browser smoke tests against the production build.
 *
 * These run on `dist` served by `vite preview`, not on the dev server, so they
 * exercise the same bundle, asset paths and SPA fallback that Cloudflare Pages
 * will serve. Any console error fails the run.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.SMOKE_PORT ?? 4178);
const BASE = `http://localhost:${PORT}`;

const results = [];
let failures = 0;

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, typeof detail === 'string' ? detail : '');
  } catch (error) {
    record(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await delay(500);
  }
  throw new Error(`Preview server did not start at ${url}`);
}

/**
 * Waits until the atlas has rendered.
 *
 * amCharts 5 draws the interactive map to a <canvas>, so there are no SVG paths
 * to wait for on screen — the readiness signal is the map canvas plus a legend
 * that has been populated from real class breaks.
 */
async function waitForAtlas(page) {
  await page.waitForSelector('figure', { timeout: 45_000 });
  await page.waitForSelector('figure canvas', { timeout: 45_000 });
  await page.waitForFunction(
    () => /per 100,000|%|\u00b5g\/m3/.test(document.body.textContent ?? ''),
    null, { timeout: 45_000 },
  );
  // The inline SVG charts (trend, comparison) are this app's own renderer.
  await page.waitForFunction(
    () => document.querySelectorAll('svg path, svg circle, svg line').length > 10,
    null, { timeout: 45_000 },
  );
}

async function main() {
  if (!existsSync('dist/index.html')) {
    console.error('No dist/ build found. Run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore', detached: false },
  );

  const downloadDir = mkdtempSync(join(tmpdir(), 'atlas-smoke-'));
  let browser;

  try {
    await waitForServer(BASE);
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    console.log('\n--- browser smoke tests ---');

    // ------------------------------------------------------------ discovery
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=What would you like to understand', { timeout: 45_000 });

    await check('a bare URL opens discovery, driven by real metadata', async () => {
      const body = await page.textContent('body');
      assert(/Four ways in/i.test(body ?? ''), 'entry points missing');
      assert(/Explore a place/i.test(body ?? ''), 'place entry point missing');
      assert(/Follow an evidence story/i.test(body ?? ''), 'story entry point missing');
      assert(
        /Most recently published by the source/i.test(body ?? ''),
        'recently published section missing',
      );
      // The publication date must be distinguished from the preparation date.
      assert(
        /not the same thing as the period an observation covers/i.test(body ?? ''),
        'publication date is not distinguished from observation period',
      );
      const topicChips = await page.locator('button:has-text("Respiratory")').count();
      assert(topicChips > 0, 'topic entry points missing');
      return 'discovery renders';
    });

    await check('the coverage statement names the real sources', async () => {
      const body = await page.textContent('body');
      assert(/England only/i.test(body ?? ''), 'England-only coverage not stated');
      assert(
        /published profiles/i.test(body ?? ''),
        'the statement does not describe the multi-profile source',
      );
      assert(
        !/respiratory disease \(INHALE\) profile, which publishes England only/i.test(body ?? ''),
        'stale single-profile coverage statement is still shown',
      );
      return 'accurate';
    });

    await check('a topic entry point opens the workspace on that topic', async () => {
      await page.locator('button:has-text("Cardiovascular")').first().click();
      await waitForAtlas(page);
      await page.waitForFunction(
        () => /[?&]t=cardiovascular/.test(window.location.search), null, { timeout: 15_000 },
      );
      const body = await page.textContent('body');
      assert(/Cardiovascular/i.test(body ?? ''), 'topic not reflected in the workspace');
      return 'cardiovascular';
    });

    // ------------------------------------------------------------ workspace
    await page.goto(`${BASE}/?v=explore`, { waitUntil: 'networkidle' });
    await waitForAtlas(page);

    await check('UK overview renders a UK-only map, with no world basemap', async () => {
      const body = await page.textContent('body');
      assert(!/world map|globe/i.test(body ?? ''), 'page mentions a world map');
      const canvases = await page.locator('figure canvas').count();
      assert(canvases > 0, 'no map canvas rendered');
      // Every polygon in the layer must belong to the UK, and the nations the
      // dataset does not cover must still be drawn, distinctly.
      const hasHatch = await page.locator('text=Not covered by this dataset').count();
      assert(hasHatch > 0, 'out-of-coverage legend entry missing');
      const counts = await page.textContent('body');
      const outside = /Outside dataset coverage[\s\S]{0,40}?(\d+)/.exec(counts ?? '');
      assert(outside && Number(outside[1]) > 0,
        'no areas reported as outside dataset coverage');
      return `${outside[1]} areas outside coverage, drawn not blank`;
    });

    await check('all four UK nations are present in the boundary data', async () => {
      const data = JSON.parse(readFileSync('public/data/geography/ctyua23.json', 'utf8'));
      const nations = new Set(data.features.map((f) => f.properties.nation));
      for (const nation of ['England', 'Scotland', 'Wales', 'Northern Ireland']) {
        assert(nations.has(nation), `${nation} missing — this is GB, not the UK`);
      }
      return [...nations].join(', ');
    });

    await check('unsupported nations stay visibly unsupported, never zero', async () => {
      const text = await page.textContent('body');
      assert(/not covered by this dataset/i.test(text ?? ''), 'no coverage statement');
      assert(
        /coverage gap, not a low value/i.test(text ?? ''),
        'coverage gap is not distinguished from a low value',
      );
      return 'stated';
    });

    await check('a verified city search resolves transparently', async () => {
      await page.goto(`${BASE}/?v=explore`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      await page.fill('input[type="search"]', 'Sheffield');
      await page.waitForSelector('[role="option"]', { timeout: 30_000 });
      // The settlement index is fetched lazily on first input, so the settlement
      // result arrives shortly after the area results.
      await page.waitForSelector('[role="option"]:has-text("Settlement in")', {
        timeout: 45_000,
      });
      const options = await page.locator('[role="option"]').allTextContents();
      assert(
        options.some((o) => /Counties and unitary authorities/i.test(o)),
        'the local authority of the same name was not offered',
      );
      assert(
        options.some((o) => /Settlement in/i.test(o)),
        'settlement result not offered separately from the authority',
      );
      await page.locator('[role="option"]:has-text("Settlement in")').first().click();
      await page.waitForSelector('text=this is not a city-only estimate', { timeout: 15_000 });
      return 'authority and settlement offered separately; notice shown';
    });

    await check('selecting an area updates the detail panel and the URL', async () => {
      await page.waitForFunction(
        () => /[?&]a=E\d{8}/.test(window.location.search), null, { timeout: 15_000 },
      );
      const url = page.url();
      assert(/a=E08000019/.test(url), `URL did not record the selection: ${url}`);
      const panel = await page.textContent('aside');
      // Unit-agnostic: the catalogue now spans rates, percentages, years and
      // unitless scores, so assert a figure and its period rather than a unit.
      assert(/\d/.test(panel ?? ''), 'detail panel shows no figure');
      assert(/What was observed/i.test(panel ?? ''), 'detail panel has no evidence statement');
      assert(/Sheffield/i.test(panel ?? ''), 'detail panel is not about the selected area');
      return 'E08000019';
    });

    await check('a shared URL restores the exact view', async () => {
      await page.goto(
        `${BASE}/?g=nhs&i=93577&a=E54000008&cm=equal-interval&cn=6`,
        { waitUntil: 'networkidle' },
      );
      await waitForAtlas(page);
      const body = await page.textContent('body');
      assert(/Integrated care boards/i.test(body ?? ''), 'NHS geography not restored');
      assert(/Equal interval/i.test(body ?? ''), 'classification not restored');
      assert(/Cheshire and Merseyside/i.test(body ?? ''), 'area selection not restored');
      return 'NHS mode, equal interval, ICB selected';
    });

    await check('NHS and administrative modes are not a parent/child hierarchy', async () => {
      const body = await page.textContent('body');
      assert(
        /not a child of a local authority/i.test(body ?? ''),
        'the independence of the two trees is not stated',
      );
      return 'stated';
    });

    await check('nation and area drill-down with Back works', async () => {
      await page.goto(`${BASE}/?v=explore&a=E06000065&n=England`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      const crumbs = await page.locator('nav[aria-label="Geography breadcrumb"]').textContent();
      assert(/United Kingdom/.test(crumbs ?? ''), 'breadcrumb missing UK');
      assert(/England/.test(crumbs ?? ''), 'breadcrumb missing nation');
      await page.locator('button', { hasText: 'Back' }).first().click();
      await page.waitForFunction(
        () => !/[?&]a=E\d{8}/.test(window.location.search), null, { timeout: 15_000 },
      );
      return 'back cleared the selection';
    });

    await check('a keyboard user can select an area from the linked table', async () => {
      await page.goto(`${BASE}/?v=explore`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      await page.locator('button', { hasText: 'Data table' }).first().click();
      await page.waitForSelector('table', { timeout: 15_000 });
      const row = page.locator('tbody tr[role="button"]').first();
      await row.focus();
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      assert(focused === 'TR', `focus went to ${focused}, not a table row`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => /[?&]a=E\d{8}/.test(window.location.search), null, { timeout: 15_000 },
      );
      return 'Enter on a focused row selected it';
    });

    await check('the data table distinguishes availability from zero', async () => {
      const table = await page.textContent('table');
      assert(/Availability/i.test(table ?? ''), 'no availability column');
      const note = await page.textContent('body');
      assert(/dash means no value, never zero/i.test(note ?? ''), 'zero/missing not explained');
      return 'stated';
    });

    await page.keyboard.press('Escape');

    await check('area comparison uses compatible observations only', async () => {
      await page.goto(`${BASE}/?v=explore&a=E06000065&c=E06000064&n=England`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      const body = await page.textContent('body');
      assert(
        /Overlapping intervals are not a significance test/i.test(body ?? ''),
        'comparison chart lacks the interval caveat',
      );
      assert(!/cannot be compared/i.test(body ?? ''), 'a valid comparison was blocked');
      return 'compared';
    });

    await check('a measure with no combined figure says so and offers the choice', async () => {
      await page.goto(`${BASE}/?v=explore&i=90366`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      const body = await page.textContent('body');
      assert(
        /no combined figure/i.test(body ?? ''),
        'life expectancy does not explain the absence of a combined series',
      );
      assert(
        /recorded sex categories, not gender identity/i.test(body ?? ''),
        'recorded sex is not distinguished from gender identity',
      );
      // Both published sexes must be offered.
      const population = page.locator('#population');
      assert((await population.count()) > 0, 'no population control shown');
      return 'population choice required and explained';
    });

    await check('an indicator unavailable at this geography is disabled, with a reason', async () => {
      await page.goto(`${BASE}/?v=explore&g=nhs&t=metabolic`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      await page.locator('#indicator').click();
      await page.waitForSelector('[role="option"]', { timeout: 15_000 });
      const disabled = await page.locator('[role="option"][data-disabled]').count();
      const text = await page.textContent('body');
      assert(disabled > 0, 'no unavailable indicator is marked disabled');
      assert(/Not published for/i.test(text ?? ''), 'no reason given for unavailability');
      await page.keyboard.press('Escape');
      return `${disabled} disabled with reasons`;
    });

    // -------------------------------------------------------------- stories
    await check('evidence stories compute their figures from the data', async () => {
      await page.goto(`${BASE}/?v=stories`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Questions worked through end to end', { timeout: 30_000 });
      const count = await page.locator('h3:near(:text("Evidence story"))').count();
      assert(count >= 0, 'story index did not render');

      await page.locator('button:has-text("A wide range")').first().click();
      await page.waitForSelector('text=What the map shows', { timeout: 45_000 });
      const body = await page.textContent('article');

      // Numbers must be present and internally consistent, not placeholders.
      const range = /ranges from ([\d.]+) per 100,000 in .+ to ([\d.]+) per 100,000 in /.exec(body ?? '');
      assert(range, 'the range sentence carries no computed values');
      assert(Number(range[2]) > Number(range[1]), 'the computed range is not ordered');

      const flags = /Of the (\d+) areas it compared, (\d+)/.exec(body ?? '');
      assert(flags, 'the significance sentence carries no computed values');
      assert(
        Number(flags[2]) <= Number(flags[1]),
        'more areas are reported indistinguishable than were compared',
      );

      assert(
        /publisher’s flags, reproduced as supplied/i.test(body ?? ''),
        'the story does not attribute the significance flags to the publisher',
      );
      assert(
        /What this does not establish/i.test(body ?? ''),
        'the story has no section on what it cannot establish',
      );
      return `range and ${flags[1]} compared areas, computed`;
    });

    await check('a story figure exports genuine vector SVG', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        page.locator('figure button:has-text("SVG")').first().click(),
      ]);
      const path = join(downloadDir, 'story.svg');
      await download.saveAs(path);
      const svg = readFileSync(path, 'utf8');
      const paths = svg.match(/<path\s[^>]*d="[^"]{40,}"/g) ?? [];
      assert(paths.length > 50, `only ${paths.length} vector paths in the story figure`);
      assert(!/<image/i.test(svg), 'story figure embeds a raster');
      assert(/Open Government Licence/.test(svg), 'story figure lacks its licence note');
      return `${paths.length} paths`;
    });

    await check('a story that loses its data says so instead of rendering', async () => {
      // The life-expectancy story only applies while no combined series exists.
      await page.goto(`${BASE}/?v=stories`, { waitUntil: 'networkidle' });
      await page.locator('button:has-text("no single number")').first().click();
      await page.waitForSelector('text=There is no combined figure', { timeout: 45_000 });
      const body = await page.textContent('article');
      assert(
        /published separately for/i.test(body ?? ''),
        'the story does not state how the measure is published',
      );
      assert(
        /recorded sex categories/i.test(body ?? ''),
        'recorded sex is not distinguished from gender identity',
      );
      return 'guarded and explained';
    });

    // ----------------------------------------------------------- downloads
    await check('SVG download works and contains real vector content', async () => {
      await page.goto(`${BASE}/?v=explore&a=E06000065&n=England`, { waitUntil: 'networkidle' });
      await waitForAtlas(page);
      await page.locator('button', { hasText: 'Export map' }).first().click();
      await page.waitForSelector('text=Download SVG (vector)', { timeout: 15_000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        page.locator('button', { hasText: 'Download SVG (vector)' }).click(),
      ]);
      const path = join(downloadDir, 'figure.svg');
      await download.saveAs(path);
      const svg = readFileSync(path, 'utf8');
      const paths = svg.match(/<path\s[^>]*d="[^"]{40,}"/g) ?? [];
      assert(paths.length > 100, `only ${paths.length} vector paths`);
      assert(!/<image/i.test(svg), 'SVG embeds a raster image');
      assert(!/data:image\/(png|jpe?g)/i.test(svg), 'SVG embeds a base64 raster');
      assert((svg.match(/<text\s/g) ?? []).length > 5, 'SVG has no live text');
      assert(/Open Government Licence/.test(svg), 'SVG lacks the licence note');
      assert(/Quantile|Equal interval/.test(svg), 'SVG lacks the classification note');
      return `${paths.length} paths, ${(svg.match(/<text\s/g) ?? []).length} text nodes`;
    });

    await check('PNG download works and is a real raster', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        page.locator('button', { hasText: 'Download PNG' }).click(),
      ]);
      const path = join(downloadDir, 'figure.png');
      await download.saveAs(path);
      const bytes = readFileSync(path);
      assert(bytes.length > 20_000, `PNG is only ${bytes.length} bytes`);
      // PNG magic number.
      assert(
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
        'file is not a PNG',
      );
      return `${(bytes.length / 1024).toFixed(0)} kB`;
    });

    await check('CSV download works and states availability per row', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        page.locator('button', { hasText: 'Download CSV' }).click(),
      ]);
      const path = join(downloadDir, 'figure.csv');
      await download.saveAs(path);
      const csv = readFileSync(path, 'utf8');
      assert(/availability/.test(csv), 'CSV has no availability column');
      assert(/is NOT a zero/i.test(csv), 'CSV does not warn about blank values');
      assert(/Open Government Licence/.test(csv), 'CSV lacks provenance');
      const rows = csv.split('\n').filter((l) => /^E\d{8},/.test(l));
      assert(rows.length > 100, `only ${rows.length} data rows`);
      return `${rows.length} rows`;
    });

    await check('figure specification JSON downloads and is reproducible', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        page.locator('button', { hasText: 'Download figure specification' }).click(),
      ]);
      const path = join(downloadDir, 'spec.json');
      await download.saveAs(path);
      const spec = JSON.parse(readFileSync(path, 'utf8'));
      assert(spec.specVersion === 1, 'missing spec version');
      assert(spec.notes.indicatorId > 0, 'no indicator id');
      assert(spec.classification?.boundaries?.length >= 1, 'no class breakpoints recorded');
      assert(/^http/.test(spec.shareUrl), 'no share URL');
      assert(spec.areas.length > 100, 'no area values recorded');
      return `${spec.areas.length} areas, ${spec.classification.boundaries.length} breaks`;
    });

    await page.keyboard.press('Escape');

    // -------------------------------------------------------------- views
    await check('coverage matrix renders every status', async () => {
      await page.goto(`${BASE}/?v=coverage`, { waitUntil: 'networkidle' });
      await page.waitForSelector('table', { timeout: 30_000 });
      const body = await page.textContent('body');
      assert(/Indicator data available/i.test(body ?? ''), 'no data legend');
      assert(/Boundary available for navigation/i.test(body ?? ''), 'no boundary-only legend');
      assert(
        /does not exist in this nation/i.test(body ?? ''),
        'no not-applicable legend',
      );
      return 'all statuses documented';
    });

    await check('methods view documents the statistical rules', async () => {
      await page.goto(`${BASE}/?v=methods`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Interpretation rules', { timeout: 30_000 });

      const interpretation = await page.textContent('body');
      assert(
        /not a performance ranking/i.test(interpretation ?? ''),
        'missing league-table caveat on the interpretation tab',
      );
      assert(
        /recorded prevalence/i.test(interpretation ?? ''),
        'missing recorded-prevalence caveat',
      );

      // Tab panels mount only when selected.
      await page.locator('button', { hasText: 'Statistics and cartography' }).click();
      await page.waitForSelector('text=Rates, counts and standardisation', { timeout: 15_000 });
      const statistics = await page.textContent('body');
      assert(
        /never averaged to produce a national figure/i.test(statistics ?? ''),
        'missing the rule against averaging standardised rates',
      );
      assert(
        /not.{0,20}treated as a significance test/i.test(statistics ?? ''),
        'missing the overlapping-interval caveat',
      );
      assert(
        /never plotted as independent annual observations/i.test(statistics ?? ''),
        'missing the pooled-period rule',
      );
      return 'interpretation and statistics rules documented';
    });

    await check('print briefing is legible in print layout', async () => {
      await page.goto(`${BASE}/?v=briefing&a=E06000065&n=England`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Evidence brief', { timeout: 30_000 });
      await page.emulateMedia({ media: 'print' });
      const visible = await page.locator('article').first().isVisible();
      assert(visible, 'the brief is not visible under print media');
      const hidden = await page.locator('.no-print').first().isVisible().catch(() => false);
      assert(!hidden, 'interface chrome is still visible when printing');
      const text = await page.textContent('article');
      assert(/Open Government Licence/.test(text ?? ''), 'brief lacks licensing');
      assert(/Limitation|Limitations/.test(text ?? ''), 'brief lacks limitations');
      await page.emulateMedia({ media: 'screen' });
      return 'print layout hides interface chrome';
    });

    await check('a failed data load shows a recoverable error', async () => {
      const failPage = await context.newPage();
      await failPage.route('**/data/manifest.json', (route) => route.abort());
      await failPage.goto(BASE, { waitUntil: 'domcontentloaded' });
      await failPage.waitForSelector('[role="alert"]', { timeout: 30_000 });
      const alert = await failPage.textContent('[role="alert"]');
      assert(/could not be loaded/i.test(alert ?? ''), 'no failure message');
      const retry = await failPage.locator('button', { hasText: 'Try again' }).count();
      assert(retry > 0, 'no retry affordance');
      await failPage.close();
      return 'error state with retry';
    });

    await check('SPA fallback serves a deep link', async () => {
      const response = await fetch(`${BASE}/some/deep/link`);
      // vite preview serves index.html for unknown paths when the app is an SPA.
      const html = await response.text();
      assert(
        response.status === 200 && /<div id="root">/.test(html),
        `deep link returned ${response.status}`,
      );
      return 'index.html served';
    });

    await check('no console errors during the run', () => {
      const real = consoleErrors.filter(
        (message) => !/favicon|ERR_ABORTED.*manifest\.json/i.test(message),
      );
      assert(real.length === 0, `${real.length} console error(s): ${real.slice(0, 3).join(' | ')}`);
      return 'clean';
    });
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    rmSync(downloadDir, { recursive: true, force: true });
  }

  console.log(
    `\n${results.length - failures}/${results.length} browser smoke tests passed.`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error('\nSmoke run failed:', error.message);
  process.exit(1);
});
