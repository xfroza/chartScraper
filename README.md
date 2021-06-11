# Chart Scraper

## Environment
```
Node.js
NPM
Python 3.8 or above
PyCharm (venv)
```

## Setup (Node.js)
```
npm init -y
npm install puppeteer
npm install pdfkit
```

### Setup (FUTU)
```
Step 1: Install and login FutuOpenD
Step 2: Install Futu API library (cmd: pip install futu-api)
```

### Run
```
Option 1: Get watchlist from Tradingview and take screenshots
node scraper.js 1

Option 2: Get filtering results from Tradingview and take screenshots
node scraper.js 2

Option 3: Get watchlist from FUTU and take screenshots
venv\Scripts\python get_watchlist.py
node scraper.js 3
```

### Output file will be stored in 'result' folder
