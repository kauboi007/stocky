# Stocky

#### Video Demo: https://www.youtube.com/watch?v=ntIr__JkwtI

#### Description:

Stocky is a stock research and screening web application built with Flask, Python, JavaScript, HTML, and CSS. The idea behind Stocky came from a personal frustration with existing stock research tools that are either too cluttered, paywalled, or just not minimal enough for someone who wants to quickly look up a stock and filter a list of tickers by basic fundamentals. Stocky solves that by giving you a clean interface to search any stock, view its key metrics and a 3 month price chart, screen a list of tickers by P/E ratio and market cap, and maintain a personal watchlist that persists across sessions.

The application pulls live market data using the yfinance library, which fetches data from Yahoo Finance under the hood. This means no API key is required and the data is always current. The backend is built on Flask and uses SQLite to store the watchlist locally. The frontend is plain HTML, CSS, and Vanilla JS

## How to Use Stocky

To run Stocky locally, install the dependencies with pip install flask yfinance, then run python app.py. Open your browser and go to http://127.0.0.1:5000.

It supports stocks that are listed in almost every stock exchange in the world , for US stocks just type the ticker symbol and for Indian stocks, append .NS to the ticker symbol for NSE listed stocks. For example, Reliance Industries is RELIANCE.NS, TCS is TCS.NS, Infosys is INFY.NS, HDFC Bank is HDFCBANK.NS, and Wipro is WIPRO.NS. BSE listed stocks use the .BO suffix instead, though .NS is generally more reliable.

For indices, use the caret symbol followed by the index code. The supported indices are as follows: Nifty 50 is ^NSEI, Sensex is ^BSESN, Nifty Bank is ^NSEBANK, the S&P 500 is ^GSPC, the Dow Jones Industrial Average is ^DJI, and the NASDAQ Composite is ^IXIC. Note that indices will not return fundamentals like P/E or EPS since those are company level metrics, but the price and 3 month chart will work correctly.

## File Structure and What Each File Does

### app.py

This is the Flask backend and the core of the application. It defines five routes.

The index route serves the main HTML page. The /api/stock/<ticker> route accepts a ticker symbol, fetches data from yfinance, and returns a JSON object containing the stock name, current price, P/E ratio, EPS, market cap, 52 week high and low, volume, sector, and 3 months of daily closing prices for the chart. There is a guard clause that returns a 400 error if yfinance returns no meaningful data, which handles invalid or unsupported tickers.

The /api/watchlist route handles both GET and POST requests. A GET request returns the list of saved tickers from the SQLite database. A POST request accepts a ticker in the request body and inserts it into the database using INSERT OR IGNORE, which skips duplicates without throwing an error. The /api/watchlist/<ticker> route handles DELETE requests to remove a specific ticker from the watchlist.

The /api/screen route is the screener. It accepts a comma separated list of tickers as a query parameter along with optional max pe and min cap filters. It loops through each ticker, fetches its fundamentals from yfinance, and skips any ticker that fails the filter conditions. The result is a filtered list returned as JSON.

SQLite is used over a full database like PostgreSQL because this is a single user local application. There is no need for concurrent access or a server side database. SQLite is built into Python and requires zero setup, which keeps the project simple and portable.

### templates/index.html

This is the only HTML file in the project. Flask uses the Jinja2 templating engine and looks for templates in the templates directory. The page is divided into four sections rendered as cards: the search bar, the stock detail card which is hidden by default and shown dynamically via JS, the screener, and the watchlist. Chart.js is loaded from a CDN to render the price chart on a canvas element.

The stock card is hidden on page load using inline style display none and is revealed by JS once a valid search result comes back.

### static/script.js

This file handles all frontend. The searchStock function fetches from /api/stock/<ticker> and populates the stock card with the returned data. It also calls renderChart which uses Chart.js to draw a line chart of the 3 month closing prices. The chart instance is stored in a variable so it can be destroyed and recreated cleanly on every new search, avoiding the Chart.js error that occurs when you try to draw on a canvas that already has a chart attached to it.

The screener function builds a URL with query parameters and fetches from /api/screen, then renders the results as an HTML table. Each row is clickable and loads that stock into the search card, which creates a natural flow from screening to researching.

The watchlist functions handle adding, removing, and loading tickers from the backend. loadWatchlist is called once on page load so the watchlist is always populated from the database when you open the app.

### static/style.css

The stylesheet uses a dark theme and card based layout. The accent color is yellow. The metrics section uses CSS Grid with three columns to display the six key fundamentals in a clean layout. No external CSS framework is used.

## Design Decisions

One deliberate decision was to not include user authentication. Since this is a singlE user local tool, adding login would add complexity without adding value. The watchlist is stored in a local SQLite file which is sufficient for personal use.

Another decision was to use yfinance instead of a paid financial data API. The tradeoff is that yfinance is unofficial and can occasionally return incomplete data for certain tickers, but for a project at this scope it works reliably for all major stocks and indices and requires no account or API key.

The screener was intentionally kept simple. Rather than building a massive database of all stocks and running queries against it, the screener takes a user provided list of tickers and filters them. This is more honest about what a free data source can realistically support and encourages the user to bring their own research to the tool rather than treating it as a magic stock picker :\)
