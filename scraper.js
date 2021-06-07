const puppeteer = require('puppeteer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const loginData = require('./login-data.json');
const URL = 'https://www.tradingview.com/';
const dirForWatchlistJPG = 'output_jpg/watchlist/';
const dirForScreenerJPG = 'output_jpg/screener/';
const dirForResult = 'result/';
const timeForLoading = 1000;

function createDir(dir) {
  if (!fs.existsSync('./' + dir)) {
    fs.mkdirSync('./' + dir, { recursive: true });
  }
}

function createPDF(imgName, imgDir, outputName) {
  console.log('>> Start creating PDF doc...');
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

function createJSON(item, name) {
  const writerStream = fs.createWriteStream(name + '.json');
  writerStream.write(JSON.stringify(item, null, 2));
  writerStream.end();
  writerStream.on('finish', function() {
    console.log('>> ' + name + '.json has been created successfully!');
  });
  writerStream.on('error', function(err) {
    console.log(err.stack);
  });
}

function caculateElapsedTime(startTime, endTime, func) {
  var elapsedTime = Math.round((endTime - startTime) / 1000);
  var elapsedTimeMin = Math.round(elapsedTime / 60);
  var elapsedTimeSec = Math.round(elapsedTime % 60);
  console.log('>> Elapsed time' + func + ': ' + elapsedTimeMin + ' m ' + elapsedTimeSec + ' s');
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
    console.log('>> ERROR: Failed to login!');
    process.exit();
  }
  console.log('>> Successfully logged in...');
}

async function clickToOpenChart(page) {
  await page.waitForSelector('a[href="/chart/"]');
  await page.$eval('a[href="/chart/"]', el => el.click());
  console.log('>> Enter chart page...');
}

async function clickToOpenScreener(page) {
  await page.waitForSelector('a[href="/screener/"]');
  await page.$eval('a[href="/screener/"]', el => el.click());
  console.log('>> Enter screener page...');
}

async function clickToOpenWatchlist(page) {
  // only necessary when watchlist do not show up by default
  await page.waitForSelector('[data-name="base"]');
  await page.$eval('[data-name="base"]', el => el.click());
}

async function clickToOpenSearchBox(page) {
  await page.waitForSelector('#header-toolbar-symbol-search');
  await page.click('#header-toolbar-symbol-search');
}

async function searchItem(page, item) {
  await page.waitForSelector('.input-3n5_2-hI');
  await page.type('.input-3n5_2-hI', item);
  await page.keyboard.press('Enter');
}

async function takeScreenshot(page, dir, fileName) {
  await page.waitForTimeout(timeForLoading);
  await page.screenshot({ path: dir + fileName + '.jpg', clip: {x: 56, y:40, width: 1540, height: 680} });
}

async function scrollTableToBottom(page) {
  var currentTableHeight, newTableHeight;
  await page.waitForSelector('.tv-data-table__row');
  currentTableHeight = await page.$eval('.tv-screener__content-pane > table > tbody', el => el.offsetHeight);
  console.log('>> Scrolling to the bottom...');
  // loop until no more new content
  while (currentTableHeight) {
    await page.evaluate(distance => {
      window.scrollBy(0, distance);
    }, currentTableHeight);
    await page.waitForTimeout(timeForLoading * 5);
    newTableHeight = await page.$eval('.tv-screener__content-pane > table > tbody', el => el.offsetHeight);
    if (newTableHeight === currentTableHeight) {
      // break loop if no change on table height
      console.log('>> Reached bottom...');
      break;
    }
    currentTableHeight = newTableHeight;
  }
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

    // create an array to store all items
    var allItem = [];

    // scroll watchlist to the top
    await page.waitForSelector('.symbol-EJ_LFrif');
    await page.$eval('.listContainer-3U2Wf-wc', el => {
      el.scrollTop = 0;
    });

    // select the first item of watchlist
    await page.waitForTimeout(timeForLoading);
    const firstItemBox = await page.$x('/html/body/div[2]/div[5]/div/div[1]/div[1]/div[1]/div[1]/div[2]/div/div[2]/div/div[2]/div/div[2]');
    await firstItemBox[0].click();
    console.log('>> Start scraping watchlist...');

    // get the first item
    await page.waitForSelector('.title-2ahQmZbQ');
    const firstItem = await page.$eval('.title-2ahQmZbQ', el => el.innerText);
    allItem.push(firstItem);

    // take screenshot of the 1st item
    await takeScreenshot(page, dirForWatchlistJPG, firstItem);
    console.log('>> [' + firstItem + ']: Successful');

    // loop through the rest of watchlist
    var currentItem, previousItem;
    while (true) {
      // press arrow down to get next item
      await page.keyboard.press('ArrowDown');
      // wait for selector for timeForLoading, if doesn't exist, continue
      try {
        await page.waitForSelector('.daysCounter-2ahQmZbQ', {timeout: timeForLoading});
      } catch (err) {
        // selector doesn't exist, continue...
      }
      // get current item
      currentItem = await page.$eval('.title-2ahQmZbQ', el => el.innerText);
      // exit if current item matches previous item (error occurred)
      if (currentItem === previousItem) {
        console.log('>> ERROR: Failed to get the next item!');
        process.exit();
      }
      // break loop if current item matches the first item (finish looping watchlist)
      if (currentItem === firstItem) {
        break;
      }
      allItem.push(currentItem);
      // take screenshot of current item
      await takeScreenshot(page, dirForWatchlistJPG, currentItem);
      console.log('>> [' + currentItem + ']: Successful');
      previousItem = currentItem;
    }
    console.log('>> Scraped ' + allItem.length + ' items...');

    await browser.close();
    console.log('>> Closed browser...');

    // create JSON file
    createJSON(allItem, 'watchlist');

    // create directory for result
    createDir(dirForResult);

    // create PDF doc
    createPDF(allItem, dirForWatchlistJPG, (new Date()).toISOString().slice(0,10).replace(/-/g,"") + '_watchlist.pdf');

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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // sign in
    await signIn(page);

    // click to open screener
    await clickToOpenScreener(page);

    // scroll table to the bottom
    await scrollTableToBottom(page);

    // get filtering results
    await page.waitForSelector('.tv-data-table__row');
    const matchedItem = await page.$$eval('.tv-data-table__row', el => el.map((a) => a.dataset.symbol));
    // get short symbol of matched item (exclude characters before ':')
    const matchedItemShortSymbol = await page.$$eval('.tv-data-table__row', el => el.map((a) => a.dataset.symbol.slice(a.dataset.symbol.lastIndexOf(':') + 1)));
    console.log('>> ' + matchedItem.length + ' matched items found...');

    // create directory to store screenshot
    createDir(dirForScreenerJPG);

    // click to open chart
    await clickToOpenChart(page);

    // take screenshot of all matched items
    console.log('>> Start scraping filtering results...');
    for (var i = 0; i < matchedItem.length; i++) {
      // click to open search box
      await clickToOpenSearchBox(page);
      // search item
      await searchItem(page, matchedItem[i]);
      // take screenshot of current item
      await takeScreenshot(page, dirForScreenerJPG, matchedItemShortSymbol[i]);
      console.log('>> (' + i + '/' + matchedItem.length + ') [' + matchedItemShortSymbol[i] + ']: Successful');
    }
    console.log('>> Scraped ' + matchedItem.length + ' items...');

    await browser.close();
    console.log('>> Closed browser...');

    // create JSON file
    createJSON(matchedItemShortSymbol, 'screener');

    // create directory for result
    createDir(dirForResult);

    // create PDF doc
    createPDF(matchedItemShortSymbol, dirForScreenerJPG, (new Date()).toISOString().slice(0,10).replace(/-/g,"") + '_screener.pdf');

    // Caculate elapsed time
    var endTime = new Date();
    caculateElapsedTime(startTime, endTime, ' for scraping screener');
  } catch (err) {
    console.log(err);
  }
}

async function main() {
  if (process.argv.some(el => el === '1')) {
    console.log('>> Prepare to scrape watchlist...');
    await scrapeWatchlist();
  }

  if (process.argv.some(el => el === '2')) {
    console.log('>> Prepare to scrape screener...');
    await scrapeScreener();
  }

  if (!process.argv.some(el => el === '1' || el === '2')) {
    console.log('>> Please select at least one option:\n>> 1. watchlist\n>> 2. screener');
  }
}

main();
