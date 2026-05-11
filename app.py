from flask import Flask, render_template, jsonify, request
import yfinance as yf
import sqlite3

app = Flask(__name__)

def getdb():
    conn = sqlite3.connect("watchlist.db")
    conn.row_factory = sqlite3.Row
    return conn

def initdb():
    conn = getdb()
    conn.execute("""CREATE TABLE IF NOT EXISTS watchlist
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                 ticker TEXT UNIQUE NOT NULL)""")
    conn.commit()
    conn.close()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/stock/<ticker>")
def getstock(ticker):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        if not info or (info.get("currentPrice") is None and info.get("regularMarketPrice") is None):
            return jsonify({"error": "Ticker not found or no data available"}), 400
        hist = stock.history(period="3mo")
        prices = [
            {"date": str(date.date()), "close": round(row["Close"], 2)}
            for date, row in hist.iterrows()
        ]
        data = {
            "name": info.get("longName", ticker),
            "ticker": ticker.upper(),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "pe": info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "market_cap": info.get("marketCap"),
            "week_high": info.get("fiftyTwoWeekHigh"),
            "week_low": info.get("fiftyTwoWeekLow"),
            "volume": info.get("volume"),
            "sector": info.get("sector"),
            "history": prices
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/watchlist", methods=["GET"])
def getwatchlist():
    conn = getdb()
    rows = conn.execute("SELECT ticker FROM watchlist").fetchall()
    conn.close()
    return jsonify([row["ticker"] for row in rows])

@app.route("/api/watchlist", methods=["POST"])
def addwatchlist():
    ticker = request.json.get("ticker", "").upper()
    if not ticker:
        return jsonify({"error": "ticker not found"}), 400
    try:
        conn = getdb()
        conn.execute("INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)", (ticker,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/watchlist/<ticker>", methods=["DELETE"])
def removewatchlist(ticker):
    conn = getdb()
    conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker.upper(),))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/screen")
def screen():
    maxpe = request.args.get("max_pe", type=float)
    mincap = request.args.get("min_cap", type=float)
    tickers = request.args.get("tickers", "")
    if not tickers:
        return jsonify({"error": "provide tickers"}), 400
    res = []
    for t in tickers.split(","):
        t = t.strip()
        try:
            info = yf.Ticker(t).info
            pe = info.get("trailingPE")
            cap = info.get("marketCap")
            if maxpe and pe and pe > maxpe:
                continue
            if mincap and cap and cap < mincap:
                continue
            res.append({
                "ticker": t.upper(),
                "name": info.get("longName", t),
                "pe": pe,
                "market_cap": cap,
                "price": info.get("currentPrice") or info.get("regularMarketPrice")
            })
        except:
            continue
    return jsonify(res)

if __name__ == "__main__":
    initdb()
    app.run(debug=True)