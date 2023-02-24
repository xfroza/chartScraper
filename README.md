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
(Install and login FutuOpenD)

Step 1: pip install virtualenv
Step 2: python -m venv venv
Step 3: venv/scripts/python.exe -m pip install futu-api
```

### Run
```
Option 1: Get watchlist from Tradingview and take screenshots
node scraper.js 1

Option 2: Get filtering results from Tradingview and take screenshots
node scraper.js 2

Option 3: Get watchlist from FUTU and take screenshots
venv\Scripts\python get_list.py [list_name]
node scraper.js 3
```

### Output file will be stored in 'result' folder

### Git push using GitHub token on the command line
```
git push https://<GITHUB_ACCESS_TOKEN>@github.com/xfroza/chartScraper.git
```
