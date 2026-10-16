import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  const browserPath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].find(p => fs.existsSync(p));

  console.log('Using browser at:', browserPath);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const urls = [
    { name: 'screenshot-saas-classic.png', url: 'http://localhost:3000' },
    { name: 'screenshot-saas-pro.png', url: 'http://localhost:3000/pro' },
    { name: 'screenshot-saas-agent.png', url: 'http://localhost:3000/agent' },
    { name: 'screenshot-saas-docs.png', url: 'http://localhost:3000/docs' },
  ];

  for (const item of urls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const outPath = path.resolve(process.cwd(), item.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot ${item.name} -> ${outPath}`);
    await page.close();
  }

  // Also test clicking Settings button to capture the unified modal
  const modalPage = await browser.newPage();
  await modalPage.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await modalPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  await modalPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="open-providers-settings-button"]') as HTMLElement | null;
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const modalOutPath = path.resolve(process.cwd(), 'screenshot-saas-settings-modal.png');
  await modalPage.screenshot({ path: modalOutPath, fullPage: false });
  console.log(`Saved screenshot settings modal -> ${modalOutPath}`);
  await modalPage.close();

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
