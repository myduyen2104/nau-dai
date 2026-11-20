const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:4173/?page=home';
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE || 4);
const NETWORK_THROTTLE = process.env.NETWORK_THROTTLE !== '0';
const PROFILE_MODE = process.env.PROFILE_MODE || 'pixel4';
const OUTPUT_DIR = path.resolve('artifacts/performance');
const DEBUG_DIR = path.join(OUTPUT_DIR, 'debug');
const DEVICE = {
  name: 'Pixel 4',
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
  viewport: { width: 360, height: 760, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const scenarios = {
  'scroll-short': async (page) => {
    const result = { actions: [], timedOut: false };
    const getState = () => page.evaluate(() => { const main = document.querySelector('main'); return { scrollTop: main?.scrollTop ?? 0, scrollHeight: main?.scrollHeight ?? 0, clientHeight: main?.clientHeight ?? 0, memory: performance.memory?.usedJSHeapSize ?? null }; });
    const initial = await getState();
    const max = Math.max(0, initial.scrollHeight - initial.clientHeight);
    for (let i = 1; i <= 4; i += 1) {
      const y = Math.round(max * i / 4);
      const startedAt = Date.now();
      await page.evaluate((position) => { const main = document.querySelector('main'); if (main) main.scrollTop = position; }, y);
      await page.waitForFunction((position) => Math.abs((document.querySelector('main')?.scrollTop ?? 0) - position) < 2, { timeout: 1800 }, y).catch(() => { result.timedOut = true; });
      result.actions.push({ targetY: y, latencyMs: Date.now() - startedAt, state: await getState() });
      if (result.timedOut) break;
    }
    return { ...result, initial, final: await getState() };
  },
  'tabs-short': async (page) => {
    const actions = [];
    for (const label of ['Tủ lạnh', 'Khám phá', 'Đã lưu', 'Hôm nay']) {
      const start = Date.now();
      const entries = await page.$$eval('nav.bottom-nav button', (els) => els.map((el) => ({ text: el.innerText.trim(), active: el.classList.contains('nav-active') })));
      const button = (await page.$$('nav.bottom-nav button'))[entries.findIndex((e) => e.text === label)];
      if (!button) { actions.push({ label, error: 'button missing', before: entries }); break; }
      const clickResult = await Promise.race([button.click().then(() => 'clicked'), delay(4000).then(() => 'click-timeout')]);
      if (clickResult !== 'clicked') {
        const after = await Promise.race([page.evaluate(() => ({ active: document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() ?? null, mainText: document.querySelector('main')?.innerText.slice(0, 240) ?? '', nodeCount: document.getElementsByTagName('*').length, memory: performance.memory?.usedJSHeapSize ?? null })), delay(1000).then(() => null)]);
        actions.push({ label, latencyMs: Date.now() - start, reached: after?.active === label, timedOut: true, timeoutAt: 'click', after, before: entries });
        break;
      }
      let observedWithinDeadline = false;
      try { observedWithinDeadline = await Promise.race([page.waitForFunction((expected) => document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() === expected, { timeout: 5500 }, label).then(() => true), delay(4000).then(() => false)]); } catch {}
      const activeLatencyMs = Date.now() - start;
      const after = await Promise.race([page.evaluate(() => ({ active: document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() ?? null, mainText: document.querySelector('main')?.innerText.slice(0, 240) ?? '', nodeCount: document.getElementsByTagName('*').length, memory: performance.memory?.usedJSHeapSize ?? null })), delay(1000).then(() => null)]);
      const reached = after?.active === label;
      const timedOut = !observedWithinDeadline;
      actions.push({ label, activeLatencyMs, observationTotalMs: Date.now() - start, reached, timedOut, after });
      if (!reached || timedOut) break;
    }
    return { actions, finalPage: actions.at(-1)?.after?.active ?? 'unknown' };
  },
  'saved-home-short': async (page) => {
    const actions = [];
    const snapshot = () => page.evaluate(() => ({
      active: document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() ?? null,
      mainText: document.querySelector('main')?.innerText.slice(0, 160) ?? '',
      nodes: document.getElementsByTagName('*').length,
      recipeCards: document.querySelectorAll('.recipe-card, .recipe-list > *, .recent-recipe-list > *').length,
      memory: performance.memory?.usedJSHeapSize ?? null,
    }));
    const activate = async (label, timeoutMs = 8000) => {
      const before = await snapshot();
      const started = Date.now();
      const dispatchMs = await page.evaluate((target) => {
        const button = [...document.querySelectorAll('nav.bottom-nav button')].find((item) => item.innerText.trim() === target);
        if (!button) throw new Error(`Navigation button not found: ${target}`);
        const start = performance.now();
        button.click();
        return performance.now() - start;
      }, label);
      let reached = false;
      try {
        reached = await Promise.race([
          page.waitForFunction((target) => document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() === target && Boolean(document.querySelector('main')?.innerText.trim()), { timeout: timeoutMs }, label).then(() => true),
          delay(timeoutMs).then(() => false),
        ]);
      } catch {}
      const after = await snapshot();
      const action = { from: before.active, to: label, dispatchMs: +dispatchMs.toFixed(1), observedLatencyMs: Date.now() - started, reached, before, after };
      actions.push(action);
      return reached;
    };
    // Enter Explore first so the initial source-data load is recorded separately from warm tab switches.
    await activate('Khám phá', 12000);
    const exploreReady = await page.waitForFunction(() => {
      const loaded = (path) => performance.getEntriesByType('resource').some((entry) => new URL(entry.name).pathname === path && entry.responseEnd > 0 && entry.encodedBodySize > 0);
      return loaded('/data/mnnm/index.json') && loaded('/data/knorr/recipes.json')
        && document.querySelectorAll('main .recipe-card, main .recipe-list > *').length > 0;
    }, { timeout: 15000 }).then(() => true).catch(() => false);
    if (!exploreReady) throw new Error('Explore catalogs did not finish loading before the Saved/Home loops');
    for (let cycle = 0; cycle < 4; cycle += 1) {
      if (!await activate('Đã lưu')) break;
      if (!await activate('Hôm nay')) break;
      if (cycle < 3 && !await activate('Khám phá')) break;
    }
    return { exploreReady, actions, finalPage: actions.at(-1)?.after?.active ?? 'unknown' };
  },
  'detail-short': async (page) => {
    const name = await page.$eval('button.home-feature-image', (el) => el.getAttribute('aria-label'));
    const start = Date.now();
    await page.$eval('button.home-feature-image', (el) => el.click());
    let opened = false;
    try { await page.waitForSelector('.recipe-modal', { visible: true, timeout: 5000 }); opened = true; } catch {}
    const openLatencyMs = Date.now() - start;
    const modalText = await page.evaluate(() => document.querySelector('.recipe-modal')?.innerText.slice(0, 200) ?? '');
    let closed = false;
    if (opened) {
      await page.keyboard.press('Escape');
      try { await page.waitForFunction(() => !document.querySelector('.recipe-modal'), { timeout: 3000 }); closed = true; } catch {}
    }
    return { actions: [{ open: name, openLatencyMs, opened, modalText }, { closeViaEscape: closed }], finalPage: closed ? 'home' : opened ? 'recipe detail' : 'home' };
  },
  scroll: async (page) => {
    const metrics = await page.evaluate(() => { const main = document.querySelector('main'); return { height: main?.scrollHeight ?? 0, viewport: main?.clientHeight ?? 0 }; });
    const height = metrics.height;
    const steps = 12;
    for (let index = 1; index <= steps; index += 1) {
      const y = Math.round((Math.max(0, height - metrics.viewport) * index) / steps);
      await page.evaluate((position) => { const main = document.querySelector('main'); if (main) main.scrollTop = position; }, y);
      await delay(100);
    }
    await page.evaluate(() => { const main = document.querySelector('main'); if (main) main.scrollTop = main.scrollHeight; });
    await delay(150);
    const scrollState = await page.evaluate(() => { const main = document.querySelector('main'); return { y: main?.scrollTop ?? 0, viewport: main?.clientHeight ?? 0, height: main?.scrollHeight ?? 0 }; });
    const reachedBottom = scrollState.y + scrollState.viewport >= scrollState.height - 2;
    const scrollableHeight = Math.max(0, height - metrics.viewport);
    if (scrollableHeight > 0 && !reachedBottom) throw new Error(`Scroll did not reach document bottom: ${JSON.stringify(scrollState)}`);
    for (let index = steps - 1; index >= 0; index -= 1) {
      const y = Math.round((Math.max(0, height - metrics.viewport) * index) / steps);
      await page.evaluate((position) => { const main = document.querySelector('main'); if (main) main.scrollTop = position; }, y);
      await delay(100);
    }
    const finalScrollY = await page.evaluate(() => document.querySelector('main')?.scrollTop ?? 0);
    if (finalScrollY !== 0) throw new Error(`Scroll did not return to top: ${finalScrollY}`);
    return { actions: scrollableHeight > 0 ? steps * 2 : 0, scrollHeight: height, viewportHeight: metrics.viewport, scrollableHeight, reachedBottom, finalScrollY, finalPage: 'home' };
  },
  tabs: async (page) => {
    const labels = ['Tủ lạnh', 'Khám phá', 'Đã lưu', 'Hôm nay'];
    const actions = [];
    for (const label of labels) {
      const button = await page.$$('nav.bottom-nav button');
      const target = await Promise.all(button.map(async (element) => ({ element, text: await element.evaluate((node) => node.innerText.trim()) })));
      const match = target.find((entry) => entry.text === label);
      if (!match) throw new Error(`Navigation button not found: ${label}; available=${target.map((entry) => entry.text).join('|')}`);
      await match.element.click();
      await page.waitForFunction((expected) => document.querySelector('nav.bottom-nav button.nav-active')?.innerText.trim() === expected, { timeout: 20000 }, label);
      await page.waitForFunction(() => Boolean(document.querySelector('main')?.innerText.trim()), { timeout: 10000 });
      const active = await page.$eval('nav.bottom-nav button.nav-active', (element) => element.innerText.trim());
      if (!active.includes(label)) throw new Error(`Tab action failed: expected ${label}, got ${active}`);
      const pageState = await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 250));
      if (!pageState) throw new Error(`Tab ${label} changed active state but main content is empty`);
      actions.push(label);
    }
    return { actions, finalPage: 'home' };
  },
  detail: async (page) => {
    await page.waitForSelector('button.home-feature-image', { visible: true });
    const recipeName = (await page.$eval('button.home-feature-image', (el) => el.getAttribute('aria-label')?.replace(/^Mở món\s*/, ''))) || 'featured recipe';
    await page.$eval('button.home-feature-image', (element) => element.click());
    await page.waitForSelector('.recipe-modal', { visible: true, timeout: 20000 });
    return { actions: [`open detail: ${recipeName}`], finalPage: 'recipe detail' };
  },
};

async function runScenario(name) {
  const scenario = scenarios[name];
  if (!scenario) throw new Error(`Unknown scenario "${name}". Choose: ${Object.keys(scenarios).join(', ')}`);
  if (!Number.isFinite(CPU_THROTTLE) || CPU_THROTTLE < 1) throw new Error('CPU_THROTTLE must be a number >= 1');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const traceLabel = process.env.TRACE_LABEL ? `-${process.env.TRACE_LABEL}` : '';
  const tracePath = path.join(OUTPUT_DIR, `${name}${traceLabel}-cpu${PROFILE_MODE === 'pixel4' ? CPU_THROTTLE : 1}x-trace.json`);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  console.log(`[profile] launched ${PROFILE_MODE} CPU ${PROFILE_MODE === 'pixel4' ? CPU_THROTTLE : 1}x; scenario=${name}`);
  let tracing = false;
  let page;
  try {
    page = await browser.newPage();
    if (PROFILE_MODE === 'pixel4') await page.emulate(DEVICE);
    await page.setCacheEnabled(false);
    await page.setDefaultNavigationTimeout(60000);
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    if (PROFILE_MODE === 'pixel4' && NETWORK_THROTTLE) {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (1.5 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        latency: 40,
      });
    }
    if (PROFILE_MODE === 'pixel4') await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

    const pageErrors = [];
    const failedRequests = [];
    const abortedRequests = [];
    const externalFailures = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const entry = `console: ${message.text()}`;
        if (/fonts\.googleapis\.com|ERR_NETWORK_CHANGED|Failed to load resource: net::ERR_FAILED/.test(entry)) externalFailures.push(entry);
        else pageErrors.push(entry);
      }
    });
    page.on('requestfailed', (request) => {
      const entry = `${request.url()}: ${request.failure()?.errorText}`;
      if (request.failure()?.errorText === 'net::ERR_ABORTED') abortedRequests.push(entry);
      else if (/fonts\.googleapis\.com/.test(request.url()) && request.failure()?.errorText === 'net::ERR_NETWORK_CHANGED') externalFailures.push(entry);
      else if (/monngonmoingay\.com\/wp-content\/uploads\//.test(request.url())) externalFailures.push(entry);
      else failedRequests.push(entry);
    });
    const traceCategories = process.env.TRACE_CPU_PROFILE === '0'
      ? ['devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'latencyInfo']
      : undefined;
    await page.tracing.start({ path: tracePath, screenshots: false, ...(traceCategories ? { categories: traceCategories } : {}) });
    tracing = true;
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    console.log(`[profile] navigation status=${response?.status() ?? 'none'} url=${page.url()}`);
    if (!response || response.status() >= 400) throw new Error(`Navigation failed: HTTP ${response?.status() ?? 'no response'}`);
    try {
      await page.waitForSelector('[data-testid="bottom-navigation"]', { visible: true, timeout: 8000 });
    } catch (error) {
      const diagnostic = await Promise.race([page.evaluate(() => ({ title: document.title, rootText: document.querySelector('#root')?.innerText.slice(0, 500), scripts: [...document.scripts].map((script) => script.src) })), delay(1000).then(() => ({ state: 'renderer-unresponsive' }))]);
      throw new Error(`App readiness failed at ${page.url()}: ${JSON.stringify({ diagnostic, pageErrors, failedRequests, abortedRequests })}`, { cause: error });
    }
    const result = await scenario(page);
    console.log('[profile] scenario actions completed');
    if (pageErrors.length || failedRequests.length) {
      throw new Error(`Browser errors: ${JSON.stringify({ pageErrors, failedRequests })}`);
    }
    console.log(JSON.stringify({ scenario: name, url: page.url(), httpStatus: response.status(), device: PROFILE_MODE === 'pixel4' ? DEVICE.name : 'Desktop', cpuThrottle: PROFILE_MODE === 'pixel4' ? CPU_THROTTLE : 1, abortedRequests, externalFailures, ...result, tracePath }, null, 2));
  } finally {
    if (tracing && page) await page.tracing.stop().catch(() => {});
    if (tracing) console.log('[profile] trace stopped');
    await browser.close();
  }
}

async function diagnose(mode) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    if (mode === 'pixel4') await page.emulate(DEVICE);
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    if (mode === 'pixel4') {
      await client.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 40 });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const evidence = { mode, pageErrors: [], consoleErrors: [], unhandledRejections: [], failedRequests: [], badResponses: [] };
    page.on('pageerror', (error) => evidence.pageErrors.push(error.stack || error.message));
    page.on('console', (message) => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()); });
    page.on('requestfailed', (request) => evidence.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on('response', (response) => { if (response.status() >= 400) evidence.badResponses.push({ url: response.url(), status: response.status() }); });
    await page.evaluateOnNewDocument(() => addEventListener('unhandledrejection', (event) => {
      const value = event.reason;
      (window).__profilerRejections = [...((window).__profilerRejections || []), String(value?.stack || value)];
    }));
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    evidence.navigationStatus = response?.status() ?? null;
    evidence.url = page.url();
    evidence.immediate = await page.evaluate(() => ({
      readyState: document.readyState,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 5000),
      bodyHtml: document.body.innerHTML.slice(0, 12000),
      domNodeCount: document.getElementsByTagName('*').length,
      root: { exists: Boolean(document.querySelector('#root')), childCount: document.querySelector('#root')?.childElementCount ?? 0, text: document.querySelector('#root')?.innerText.slice(0, 2000) ?? '' },
      scripts: [...document.scripts].map((script) => script.src),
    }));
    await page.screenshot({ path: path.join(DEBUG_DIR, `${mode}-full-page.png`), fullPage: true });
    try { await page.waitForSelector('[data-testid="bottom-navigation"]', { visible: true, timeout: 12000 }); }
    catch { evidence.readyFailure = 'bottom navigation did not become visible within 12s'; }
    evidence.afterWait = await page.evaluate(() => ({ readyState: document.readyState, title: document.title, bodyText: document.body.innerText.slice(0, 5000), nodeCount: document.getElementsByTagName('*').length, rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 12000) ?? '' }));
    evidence.unhandledRejections = await page.evaluate(() => (window).__profilerRejections || []);
    evidence.ready = !evidence.readyFailure;
    fs.writeFileSync(path.join(DEBUG_DIR, `${mode}.json`), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ mode, ready: evidence.ready, navigationStatus: evidence.navigationStatus, url: evidence.url, immediateRoot: evidence.immediate.root, pageErrors: evidence.pageErrors, consoleErrors: evidence.consoleErrors, failedRequests: evidence.failedRequests, badResponses: evidence.badResponses }, null, 2));
    await context.close();
  } finally { await browser.close(); }
}

const scenarioName = process.argv[2];
if (scenarioName === 'diagnose-desktop' || scenarioName === 'diagnose-pixel4') {
  diagnose(scenarioName === 'diagnose-desktop' ? 'desktop' : 'pixel4').catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
} else if (!scenarioName) {
  console.error(`Usage: node scripts/profile-performance.cjs <${[...Object.keys(scenarios), 'diagnose-desktop', 'diagnose-pixel4'].join('|')}>`);
  process.exitCode = 2;
} else {
  runScenario(scenarioName).catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
