import { useEffect, useState, useRef } from "react";
import "./App.css";

const CURRENCIES = {
  USD: { symbol: "$", rate: 1, label: "USD — Dollar" },
  INR: { symbol: "₹", rate: 83, label: "INR — Rupee" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP — Pound" },
};

function convertPrice(priceStr, currency) {
  if (!priceStr) return null;
  const match = priceStr.match(/[\d.]+/);
  if (!match) return priceStr;
  const usd = parseFloat(match[0]);
  const c = CURRENCIES[currency];
  const converted = (usd * c.rate).toFixed(currency === "INR" ? 0 : 2);
  return c.symbol + converted + "/mo";
}

function getDaysLeft(trialEndDate) {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function Badge({ type }) {
  const map = {
    ACTIVE_TRIAL: { label: "TRIAL", cls: "badge-trial" },
    ACTIVE_SUBSCRIPTION: { label: "ACTIVE", cls: "badge-active" },
    BILLING_NOTICE: { label: "BILLING", cls: "badge-billing" },
    UNKNOWN: { label: "UNKNOWN", cls: "badge-unknown" },
  };
  const b = map[type] || map.UNKNOWN;
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

function CurrencyDropdown({ currency, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="currency-wrap" ref={ref}>
      <div className="currency-trigger" onClick={() => setOpen(!open)}>
        <span>{CURRENCIES[currency].symbol} {currency}</span>
        <span className="chevron">▾</span>
      </div>
      {open && (
        <div className="currency-dropdown">
          {Object.entries(CURRENCIES).map(([code, c]) => (
            <div
              key={code}
              className={`curr-opt ${currency === code ? "selected" : ""}`}
              onClick={() => { onChange(code); setOpen(false); }}
            >
              <span className="curr-symbol">{c.symbol}</span>
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [currency, setCurrency] = useState("USD");
  const [scanning, setScanning] = useState(false);
  const [time, setTime] = useState("");
  const [page, setPage] = useState("overview");

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      });
      const date = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).toUpperCase();
      setTime(`${date} · ${formatted} IST`);
    }
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/subscriptions")
      .then(res => res.json())
      .then(data => setSubscriptions(data))
      .catch(err => console.error("Failed to fetch:", err));
  }, []);

  function handleScan() {
    setScanning(true);
    window.location.href = "http://localhost:5000/auth/google";
  }

  const totalUSD = subscriptions.reduce((acc, sub) => {
    if (!sub.price) return acc;
    const match = sub.price.match(/[\d.]+/);
    return acc + (match ? parseFloat(match[0]) : 0);
  }, 0);

  const c = CURRENCIES[currency];
  const totalConverted = (totalUSD * c.rate).toFixed(currency === "INR" ? 0 : 2);
  const trials = subscriptions.filter(s => s.trialDetected).length;
  const expiring = subscriptions.filter(s => {
    const d = getDaysLeft(s.trialEndDate);
    return d !== null && d <= 7 && d >= 0;
  }).length;

  return (
    <div className="app">
      <div className="orb orb1" />
      <div className="orb orb2" />

      <aside className="sidebar">
        <div className="logo-block">
          <div className="logo-top">
            <div className="logo-icon">◎</div>
            <div className="logo-text">SubTracker</div>
          </div>
          <div className="logo-tagline">// subscription intelligence</div>
        </div>

        <div className="user-block">
          <div className="user-avatar">N</div>
          <div>
            <div className="user-name">Namrata</div>
            <div className="user-role">FREE TIER</div>
          </div>
        </div>

        <nav className="nav-body">
          <div className="nav-group-label">Monitor</div>

          <div
            className={`nav-item ${page === "overview" ? "active" : ""}`}
            onClick={() => setPage("overview")}
          >
            <span className="nav-item-label">⊞ Overview</span>
          </div>

          <div
            className={`nav-item ${page === "subscriptions" ? "active" : ""}`}
            onClick={() => setPage("subscriptions")}
          >
            <span className="nav-item-label">⊟ Subscriptions</span>
            {subscriptions.length > 0 && (
              <span className="nav-count orange">{subscriptions.length}</span>
            )}
          </div>

          <div
            className={`nav-item ${page === "alerts" ? "active" : ""}`}
            onClick={() => setPage("alerts")}
          >
            <span className="nav-item-label">◎ Alerts</span>
            {expiring > 0 && <span className="nav-dot" />}
          </div>

          <div className="nav-group-label">Analyse</div>

          <div
            className={`nav-item ${page === "trends" ? "active" : ""}`}
            onClick={() => setPage("trends")}
          >
            <span className="nav-item-label">↗ Spend Trends</span>
          </div>

          <div
            className={`nav-item ${page === "history" ? "active" : ""}`}
            onClick={() => setPage("history")}
          >
            <span className="nav-item-label">⊘ Scan History</span>
            <span className="nav-count">10</span>
          </div>

          <div className="nav-group-label">System</div>

          <div
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <span className="nav-item-label">⚙ Settings</span>
          </div>
        </nav>

        <div className="status-block">
          <div className="status-row">
            <span className="status-label">Gmail</span>
            <span className="status-val green">
              <span className="status-dot" />
              Connected
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Last Scan</span>
            <span className="status-val orange">—</span>
          </div>
          <div className="status-row">
            <span className="status-label">Auto-scan</span>
            <span className="status-val dim">Off</span>
          </div>
        </div>

        <button className="scan-btn" onClick={handleScan} disabled={scanning}>
          ◎ {scanning ? "SCANNING..." : "SCAN GMAIL"}
        </button>
      </aside>

      <main className="main">
        <div className="top-bar">
          <div className="top-title">
            {page === "overview" && "Subscription Intelligence"}
            {page === "subscriptions" && "All Subscriptions"}
            {page === "alerts" && "Alerts"}
            {page === "trends" && "Spend Trends"}
            {page === "history" && "Scan History"}
            {page === "settings" && "Settings"}
          </div>
          <div className="top-right">
            <div className="top-time">{time}</div>
            <CurrencyDropdown currency={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* ── COMING SOON pages ── */}
        {(page === "alerts" || page === "trends" || page === "history" || page === "settings") && (
          <div className="empty-state">
            <div className="empty-icon">⊘</div>
            <div className="empty-title">Coming soon</div>
            <div className="empty-sub">This feature is under construction</div>
          </div>
        )}

        {/* ── OVERVIEW + SUBSCRIPTIONS pages ── */}
        {(page === "overview" || page === "subscriptions") && (
          <>
            {page === "overview" && (
              <div className="stats-row">
                <div className="stat">
                  <div className="stat-label">Total Subs</div>
                  <div className="stat-val white">{subscriptions.length}</div>
                  <div className="stat-change">all time</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Monthly</div>
                  <div className="stat-val orange">{c.symbol}{totalConverted}</div>
                  <div className="stat-change">estimated spend</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Expiring</div>
                  <div className={`stat-val ${expiring > 0 ? "red" : "white"}`}>{expiring}</div>
                  <div className="stat-change">within 7 days</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Active Trials</div>
                  <div className="stat-val green">{trials}</div>
                  <div className="stat-change">detected</div>
                </div>
              </div>
            )}

            <div className="table-header">
              <div className="th">Service</div>
              <div className="th">Status</div>
              <div className="th">Price</div>
              <div className="th">Days</div>
              <div className="th">Conf.</div>
              <div className="th">Action</div>
            </div>

            {subscriptions.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <div className="empty-title">No subscriptions detected</div>
                <div className="empty-sub">Click Scan Gmail to scan your inbox</div>
              </div>
            )}

            {subscriptions.map(sub => {
              const daysLeft = getDaysLeft(sub.trialEndDate);
              const price = convertPrice(sub.price, currency);
              return (
                <div className="card" key={sub.id}>
                  <div className="card-info">
                    <div className="card-name">{sub.service}</div>
                    <div className="card-subject">{sub.subject}</div>
                  </div>
                  <div><Badge type={sub.classification} /></div>
                  <div className="card-price">{price || "—"}</div>
                  <div className={`card-days ${daysLeft !== null && daysLeft <= 3 ? "urgent" : daysLeft !== null && daysLeft > 3 ? "ok" : ""}`}>
                    {daysLeft === null ? "—" : daysLeft <= 0 ? "EXPIRED" : `${daysLeft}d`}
                  </div>
                  <div className="card-conf">{sub.confidence ? `${sub.confidence}%` : "—"}</div>
                  <button
                    className="cancel-btn"
                    onClick={() => window.open(
                      `https://www.google.com/search?q=cancel+${sub.service}+subscription`,
                      "_blank"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              );
            })}

            <div className="bottom-bar">
              <div className="bottom-stat">
                AUTO-RENEW <span>{subscriptions.filter(s => s.autoRenew).length} ACTIVE</span>
              </div>
              <div className="bottom-stat">STATUS <span>LIVE</span></div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;