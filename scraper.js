const puppeteer = require('puppeteer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const loginData = require('./login-data.json');
const URL = 'https://www.tradingview.com/';
const dirForWatchlistJPG = 'output_jpg/watchlist/';
const dirForResult = 'result/';
const timeForLoading = 1000;

function createDir(dir) {
  if (!fs.existsSync('./' + dir)) {
    fs.mkdirSync('./' + dir, { recursive: true });
  }
}

function createPDF(imgName, imgDir, outputName) {
  console.log('>> Start creating PDF doc...')
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
  for (var i = 0; i < imgName.length; i++) {
    if (i > 0 && i % 4 === 0) {
      // add new page every 4 charts
      doc.addPage({
        size: [pageWidth, pageHeight]
      });
    }
    doc
      .image(imgDir + imgName[i] + '.jpg', marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4), {width: chartWidth})
      .text(imgName[i], marginX, marginY * ((i % 4) + 1) + chartHeight * (i % 4) - textMargin);
  }
  doc.end();

  // output PDF doc
  doc.pipe( fs.createWriteStream(dirForResult + outputName) );
  console.log('>> ' + outputName + ' has been created successfully!');
}

function caculateElapsedTime(startTime, endTime, funcName) {
  var elapsedTime = Math.round((endTime - startTime) / 1000);
  var elapsedTimeMin = Math.round(elapsedTime / 60);
  var elapsedTimeSec = Math.round(elapsedTime % 60);
  console.log('>> Elapsed time' + funcName + ': ' + elapsedTimeMin + ' m ' + elapsedTimeSec + ' s');
}

async function signIn(page) {
  await page.setViewport({width: 1920, height: 800});
  await page.goto(URL, { waitUntil: 'networkidle0' });

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
  await page.waitForTimeout(timeForLoading);
  try {
    await page.waitForSelector('[data-name="base"]', {timeout: timeForLoading * 5});
  } catch (err) {
    console.log('>> ERROR: Failed to login!')
    process.exit();
  }
  console.log('>> Successfully logged in...')
}

async function clickToOpenChart(page) {
  await page.waitForSelector('.tv-mainmenu__item--chart');
  await page.click('.tv-mainmenu__item--chart');
}

async function clickToOpenWatchlist(page) {
  // only necessary when watchlist do not show up by default
  await page.waitForSelector('[data-name="base"]');
  await page.$eval('[data-name="base"]', el => el.click());
}

async function takeScreenshot(page, dir, fileName) {
  await page.waitForTimeout(timeForLoading);
  await page.screenshot({ path: dir + fileName + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });
  console.log('>> [' + fileName + ']: Successful');
}

async function scrapeWatchlist() {
  try {
    var startTime = new Date();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // sign in
    await signIn(page);

    // click to open chart
    await clickToOpenChart(page);

    // create directory to store screenshot
    createDir(dirForWatchlistJPG);

    // create an array to store the name of all items
    var allItemName = [];

    // scroll watchlist to the top
    await page.waitForSelector('.symbol-EJ_LFrif');
    await page.$eval('.listContainer-3U2Wf-wc', el => {
      el.scrollTop = 0;
    });

    // select the 1st item of watchlist
    await page.waitForTimeout(timeForLoading);
    const firstItem = await page.$x('/html/body/div[2]/div[5]/div/div[1]/div[1]/div[1]/div[1]/div[2]/div/div[2]/div/div[2]/div/div[2]');
    await firstItem[0].click();
    console.log('>> Start scraping watchlist...')

    // get name of the 1st item
    await page.waitForSelector('.title-2ahQmZbQ');
    const firstItemName = await page.$eval('.title-2ahQmZbQ', el => el.innerText);
    allItemName.push(firstItemName);

    // take screenshot of the 1st item
    await takeScreenshot(page, dirForWatchlistJPG, firstItemName);

    // loop through the rest of watchlist
    var itemName;
    while (true) {
      // press arrow down to get next item
      await page.keyboard.press('ArrowDown');
      // wait for selector for timeForLoading, if doesn't exist, continue
      try {
        await page.waitForSelector('.daysCounter-2ahQmZbQ', {timeout: timeForLoading});
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
      await takeScreenshot(page, dirForWatchlistJPG, itemName);
    }
    console.log('>> Scraped ' + allItemName.length + ' items...')

    await browser.close();
    console.log('>> Closed browser...')

    // create directory for result
    createDir(dirForResult);

    // create PDF doc
    createPDF(allItemName, dirForWatchlistJPG, 'watchlist.pdf');

    // Caculate elapsed time
    var endTime = new Date();
    caculateElapsedTime(startTime, endTime, ' for scraping watchlist');
  } catch (err) {
    console.log(err);
  }
}

async function scrapeScreener() {
  try {
    var startTime = new Date();
    // Caculate elapsed time
    var endTime = new Date();
    caculateElapsedTime(startTime, endTime, ' for scraping screener');
  } catch (err) {
    console.log(err);
  }
}

if (process.argv.some(el => el === '1')) {
  console.log('>> Prepare to scrape watchlist...')
  scrapeWatchlist()
}

if (process.argv.some(el => el === '2')) {
  console.log('>> Prepare to scrape screener...')
  scrapeScreener()
}

if (!process.argv.some(el => el === '1' || el === '2')) {
  console.log('>> Please select at least one option:\n>> 1. watchlist\n>> 2. screener')
}
