const puppeteer = require('puppeteer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const loginData = require('./login-data.json');
const DirForWatchlistJPG = 'output_jpg/watchlist/';
const DirForResult = 'result/';

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
    var dir = './' + DirForWatchlistJPG;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // view the first item of watchlist
    const firstItem = await page.$x('/html/body/div[2]/div[5]/div/div[1]/div[1]/div[1]/div[1]/div[2]/div/div[2]/div/div[2]/div/div[2]');
    await firstItem[0].click();

    // take screenshot
    await page.waitForTimeout(1000);
    // adjusting screenshot position
    await page.screenshot({ path: DirForWatchlistJPG + watchlistName[0] + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });

    // loop through the rest of watchlist
    for (var i = 1; i < watchlistLength; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: DirForWatchlistJPG + watchlistName[i] + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });
    }

    await browser.close();

    // create folder for result
    var dir = './' + DirForResult;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // create PDF doc
    const pageWidth = 1080;
    const pageHeight = 2400;
    const chartWidth = 1000;
    const chartHeight = 442;
    const marginX = 40;
    const marginY = 126.4;
    const textMargin = 40;
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight]
    });

    // add chart to PDF
    doc.fontSize(32);
    for (var i = 0; i < watchlistLength; i++) {
      if (i > 0 && i % 4 === 0) {
        // add new page every 4 charts
        doc.addPage({
          size: [pageWidth, pageHeight]
        });
      }
      doc
        .image(DirForWatchlistJPG + watchlistName[i] + '.jpg', marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4), {width: chartWidth})
        .text(watchlistName[i], marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4) - textMargin);
    }

    doc.end();
    doc.pipe( fs.createWriteStream(DirForResult + 'watchlist.pdf') );
  } catch (err) {
    console.log(err);
  }
}

scrapeList('https://www.tradingview.com/')
