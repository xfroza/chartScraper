const puppeteer = require('puppeteer');
const fs = require('fs');
const loginData = require('./login-data.json');

async function scrapeList(url) {
  try {
    const browser = await puppeteer.launch({ headless: true });

    // open page for sign in
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 800});
    await page.goto(url, { waitUntil: 'networkidle0' });

    // click sign in button
    await page.waitForSelector('.tv-header__dropdown-text > a');
    await page.click('.tv-header__dropdown-text > a');

    // click via email
    await page.waitForSelector('.i-clearfix');
    await page.click('.i-clearfix');

    // fill in info and sign in
    await page.waitForSelector('input[name=username], input[name=password]');
    await page.type('input[name=username]', loginData.username);
    await page.type('input[name=password]', loginData.password);
    await page.click('button[type=submit]');
    await page.waitForTimeout(1000);

    // click to open chart
    await page.click('.tv-mainmenu__item--chart');

    // *open watchlist (only necessary when watchlist do not show up by default)
    // await page.waitForSelector('[data-name="base"]');
    // await page.$eval('[data-name="base"]', el => el.click());

    // get watchlist info
    await page.waitForSelector('.symbol-EJ_LFrif');
    const watchlistLength = await page.$$eval('.symbol-EJ_LFrif', el => el.length);
    const watchlistName = await page.$$eval('.symbol-EJ_LFrif', el => el.map((a) => a.dataset.symbolShort));

    // create folder to store screenshot
    var dir = './chart';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // view the first item of watchlist
    const firstItem = await page.$x('/html/body/div[2]/div[5]/div/div[1]/div[1]/div[1]/div[1]/div[2]/div/div[2]/div/div[2]/div/div[2]');
    await firstItem[0].click();

    // take screenshot
    await page.waitForTimeout(1000);
    // adjusting screenshot position
    await page.screenshot({ path: 'chart/' + watchlistName[0] + '.jpg', clip: {x: 56, y:40, width: 1024, height: 800} });

    // loop through the rest of watchlist
    for (var i = 1; i < watchlistLength; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'chart/' + watchlistName[i] + '.jpg', clip: {x: 56, y:40, width: 1024, height: 800} });
    }

    await browser.close();
  } catch (err) {
    console.log(err)
  }
}

scrapeList('https://www.tradingview.com/')
