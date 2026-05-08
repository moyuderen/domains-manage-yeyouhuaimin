import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';
const OUT = '.trellis/tasks/05-08-backend-docs/screenshots';
const ACCESS_KEY = 'RAOysZY4e9FBCEgP83UaxoYTpCtaDx8J';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

// Login page
console.log('Login page...');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: `${OUT}/login.png` });
console.log('  login.png');

// Login
console.log('Logging in...');
await page.type('input[type="password"]', ACCESS_KEY);
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 2000));

// Logout - click aria-label="退出登录" button, capture the resulting login page
console.log('Logout...');
const logoutBtn = await page.$('button[aria-label="退出登录"]');
if (logoutBtn) {
  await logoutBtn.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
}
await page.screenshot({ path: `${OUT}/logout.png` });
console.log('  logout.png');

console.log('Done!');
await browser.close();
