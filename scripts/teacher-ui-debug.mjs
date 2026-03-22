import { chromium } from 'playwright';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = 'http://127.0.0.1:4175';
const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const messages = [];
page.on('console', (msg) => messages.push({ type: 'console', text: msg.text() }));
page.on('pageerror', (error) => messages.push({ type: 'pageerror', text: error.message }));

await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
await page.fill('#loginAccountInput', 'cls');
await page.fill('#loginPasswordInput', '666666');
await page.click('#loginSubmitButton');
await page.waitForURL(/teacher\.html/, { timeout: 15000 });
await page.waitForTimeout(1500);

const before = await page.locator('#createClassDialog').evaluate((node) => ({ openAttr: node.getAttribute('open'), hasOpen: node.hasAttribute('open') }));
await page.click('#openCreateClassButton');
await page.waitForTimeout(1000);
const after = await page.locator('#createClassDialog').evaluate((node) => ({ openAttr: node.getAttribute('open'), hasOpen: node.hasAttribute('open'), openProp: node.open }));
const buttonInfo = await page.locator('#openCreateClassButton').evaluate((node) => ({ disabled: node.disabled, text: node.textContent }));
console.log(JSON.stringify({ before, after, buttonInfo, messages }, null, 2));
await browser.close();
