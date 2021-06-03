const puppeteer = require('puppeteer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const loginData = require('./login-data.json');
const URL = 'https://www.tradingview.com/';
const DirForWatchlistJPG = 'output_jpg/watchlist/';
const DirForResult = 'result/';
const TimeForLoading = 1000;

async function scrapeWatchlist(url) {
  try {
    var startTime = new Date();
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
    await page.waitForTimeout(TimeForLoading);

    // click to open chart
    await page.waitForSelector('.tv-mainmenu__item--chart');
    await page.click('.tv-mainmenu__item--chart');
    console.log('Successfully logged in...')

    // create folder to store screenshot
    var dir = './' + DirForWatchlistJPG;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // *open watchlist (only necessary when watchlist do not show up by default)
    // await page.waitForSelector('[data-name="base"]');
    // await page.$eval('[data-name="base"]', el => el.click());

    // create an array to store the name of all items
    var allItemName = [];

    // scroll watchlist to the top
    await page.waitForSelector('.symbol-EJ_LFrif');
    await page.$eval('.listContainer-3U2Wf-wc', el => {
      el.scrollTop = 0;
    })

    // select the 1st item of watchlist
    await page.waitForTimeout(TimeForLoading);
    const firstItem = await page.$x('/html/body/div[2]/div[5]/div/div[1]/div[1]/div[1]/div[1]/div[2]/div/div[2]/div/div[2]/div/div[2]');
    await firstItem[0].click();
    console.log('Start scraping watchlist...')

    // get name of the 1st item
    await page.waitForSelector('.title-2ahQmZbQ');
    const firstItemName = await page.$eval('.title-2ahQmZbQ', el => el.innerText);
    allItemName.push(firstItemName);

    // take screenshot of the 1st item
    await page.waitForTimeout(TimeForLoading);
    await page.screenshot({ path: DirForWatchlistJPG + firstItemName + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });
    console.log('[' + firstItemName + ']: Successful')

    // get close date
    const closeDate = await page.$eval('.lastPriceTimeWithIcon-1wcMUg0D', el => el.innerText.substr(1, 6).replace(' ', '_'));

    // loop through the rest of watchlist
    var itemName;
    while (true) {
      // press arrow down to get next item
      await page.keyboard.press('ArrowDown');
      // wait for selector for 3s, if doesn't exist, continue
      try {
        await page.waitForSelector('.daysCounter-2ahQmZbQ', {timeout: TimeForLoading});
      } catch (err) {
        // selector doesn't exist, continue...
      }
      // get name of current item
      itemName = await page.$eval('.title-2ahQmZbQ', el => el.innerText);
      // compare name of current item with name of the 1st item
      if (itemName === firstItemName) {
        // break loop if two name matches
        break;
      }
      allItemName.push(itemName);
      // take screenshot of current item
      await page.waitForTimeout(TimeForLoading);
      await page.screenshot({ path: DirForWatchlistJPG + itemName + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });
      console.log('[' + itemName + ']: Successful')
    }
    console.log('Scraped ' + allItemName.length + ' items...')

    await browser.close();
    console.log('Closed browser...')

    // create folder for result
    var dir = './' + DirForResult;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // create PDF doc
    console.log('Start creating PDF doc...')
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
    for (var i = 0; i < allItemName.length; i++) {
      if (i > 0 && i % 4 === 0) {
        // add new page every 4 charts
        doc.addPage({
          size: [pageWidth, pageHeight]
        });
      }
      doc
        .image(DirForWatchlistJPG + allItemName[i] + '.jpg', marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4), {width: chartWidth})
        .text(allItemName[i], marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4) - textMargin);
    }

    // close PDF doc
    doc.end();

    // output PDF doc
    doc.pipe( fs.createWriteStream(DirForResult + closeDate + '_watchlist.pdf') );

    // Caculate elapsed time
    var endTime = new Date();
    var elapsedTime = Math.round((endTime - startTime) / 1000);
    var elapsedTimeMin = Math.round(elapsedTime / 60);
    var elapsedTimeSec = Math.round(elapsedTime % 60);
    console.log('Watchlist PDF has been created successfully! [elapsed time: ' + elapsedTimeMin + ' m ' + elapsedTimeSec + ' s]')
  } catch (err) {
    console.log(err);
  }
}

async function scrapeScreener(url) {
  console.log('scrapeScreener coming soon...')
}

if (process.argv.some(el => el === '1')) {
  console.log('Prepare to scrape watchlist...')
  scrapeWatchlist(URL)
}

if (process.argv.some(el => el === '2')) {
  console.log('Prepare to scrape screener...')
  scrapeScreener(URL)
}

if (!process.argv.some(el => el === '1' || el === '2')) {
  console.log('Please select at least one option:\n1. watchlist\n2. screener')
}
