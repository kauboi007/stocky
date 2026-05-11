let currentTicker = null;
let chartInstance = null;

async function searchStock() {
    const ticker = document.getElementById("tickerInput").value.trim().toUpperCase();
    if (!ticker) return;

    const res = await fetch(`/api/stock/${ticker}`);
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    currentTicker = ticker;

    document.getElementById("stockCard").style.display = "block";
    document.getElementById("stockName").textContent = data.name;
    document.getElementById("stockTicker").textContent = data.ticker;
    document.getElementById("stockSector").textContent = data.sector || "N/A";
    document.getElementById("stockPrice").textContent = data.price ? `$${data.price}` : "N/A";
    document.getElementById("mPE").textContent = data.pe ? data.pe.toFixed(2) : "N/A";
    document.getElementById("mEPS").textContent = data.eps ? data.eps.toFixed(2) : "N/A";
    document.getElementById("mCap").textContent = data.market_cap ? formatCap(data.market_cap) : "N/A";
    document.getElementById("mHigh").textContent = data.week_high ?? "N/A";
    document.getElementById("mLow").textContent = data.week_low ?? "N/A";
    document.getElementById("mVol").textContent = data.volume ? data.volume.toLocaleString() : "N/A";

    renderChart(data.history);
}

function formatCap(cap) {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap}`;
}

function renderChart(history) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: "Close Price",
                data: history.map(h => h.close),
                borderColor: "#eab308",
                backgroundColor: "rgba(234,179,8,0.1)",
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxTicksLimit: 6, color: "#888" }, grid: { color: "#222" } },
                y: { ticks: { color: "#888" }, grid: { color: "#222" } }
            }
        }
    });
}

async function addToWatchlist() {
    if (!currentTicker) return;
    await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: currentTicker })
    });
    loadWatchlist();
}

async function loadWatchlist() {
    const res = await fetch("/api/watchlist");
    const tickers = await res.json();
    const container = document.getElementById("watchlistItems");

    if (tickers.length === 0) {
        container.innerHTML = `<p style="color:#555">No stocks in watchlist yet.</p>`;
        return;
    }

    container.innerHTML = tickers.map(t => `
        <div class="watchlist-item">
            <span style="cursor:pointer" onclick="loadFromWatchlist('${t}')">${t}</span>
            <button class="del-btn" onclick="removeFromWatchlist('${t}')">Remove</button>
        </div>
    `).join("");
}

function loadFromWatchlist(ticker) {
    document.getElementById("tickerInput").value = ticker;
    searchStock();
}

async function removeFromWatchlist(ticker) {
    await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
    loadWatchlist();
}

async function runScreener() {
    const tickers = document.getElementById("screenTickers").value.trim();
    const maxPE = document.getElementById("screenPE").value;
    const minCap = document.getElementById("screenCap").value;

    if (!tickers) { alert("Enter at least one ticker"); return; }

    let url = `/api/screen?tickers=${tickers}`;
    if (maxPE) url += `&max_pe=${maxPE}`;
    if (minCap) url += `&min_cap=${minCap * 1e9}`;

    const res = await fetch(url);
    const results = await res.json();
    const container = document.getElementById("screenResults");

    if (!results.length) { container.innerHTML = `<p style="color:#555">No stocks matched.</p>`; return; }

    container.innerHTML = `
        <table>
            <thead><tr><th>Ticker</th><th>Name</th><th>Price</th><th>P/E</th><th>Market Cap</th></tr></thead>
            <tbody>
                ${results.map(r => `
                    <tr style="cursor:pointer" onclick="loadFromWatchlist('${r.ticker}')">
                        <td>${r.ticker}</td>
                        <td>${r.name}</td>
                        <td>${r.price ?? "N/A"}</td>
                        <td>${r.pe ? r.pe.toFixed(2) : "N/A"}</td>
                        <td>${r.market_cap ? formatCap(r.market_cap) : "N/A"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

loadWatchlist();