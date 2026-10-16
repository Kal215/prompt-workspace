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

  const deskPath = path.resolve(process.cwd(), 'screenshot-desktop-firecrawl.png');
  const mobPath = path.resolve(process.cwd(), 'screenshot-mobile-firecrawl.png');

  // Desktop Screenshot (1440px)
  const pageDesk = await browser.newPage();
  await pageDesk.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await pageDesk.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  const deskStyles = await pageDesk.evaluate(() => {
    const body = window.getComputedStyle(document.body);
    const heroH1 = document.querySelector('#hero h1');
    const h1Style = heroH1 ? window.getComputedStyle(heroH1) : null;
    const ctaBtn = document.querySelector('#hero a, #hero button');
    const btnStyle = ctaBtn ? window.getComputedStyle(ctaBtn) : null;
    return {
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
      h1Color: h1Style?.color,
      h1FontSize: h1Style?.fontSize,
      btnBg: btnStyle?.backgroundColor,
      btnColor: btnStyle?.color,
    };
  });
  console.log('DESKTOP COMPUTED STYLES:', deskStyles);

  await pageDesk.screenshot({ path: deskPath, fullPage: false });
  console.log('Desktop screenshot saved:', deskPath);

  // Mobile Screenshot (390px)
  const pageMob = await browser.newPage();
  await pageMob.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await pageMob.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  const mobStyles = await pageMob.evaluate(() => {
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    return {
      hasBottomNav: !!bottomNav,
      bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : null,
    };
  });
  console.log('MOBILE COMPUTED STYLES:', mobStyles);

  await pageMob.screenshot({ path: mobPath, fullPage: false });
  console.log('Mobile screenshot saved:', mobPath);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
