import { useEffect, useState, useRef } from "react";
import "./App.css";

const DEFAULT_RATES = {
  USD: { symbol: "$", rate: 1, label: "USD — Dollar" },
  INR: { symbol: "₹", rate: 96.5, label: "INR — Rupee" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP — Pound" },
};

// Direct cancel URLs for known services
const CANCEL_URLS = {
  "Netflix": "https://www.netflix.com/cancelplan",
  "Spotify": "https://www.spotify.com/account/subscription/cancel",
  "Spotify Premium": "https://www.spotify.com/account/subscription/cancel",
  "Notion": "https://www.notion.so/profile/billing",
  "Canva": "https://www.canva.com/settings/purchase-history",
  "Adobe": "https://account.adobe.com/plans",
  "Amazon": "https://www.amazon.com/mc/pipelines/cancellation",
  "YouTube Premium": "https://www.youtube.com/paid_memberships",
  "Google One": "https://one.google.com/storage",
  "LinkedIn Premium": "https://www.linkedin.com/premium/products/",
  "Grammarly": "https://account.grammarly.com/subscription",
};

function getCancelUrl(serviceName) {
  if (!serviceName) return null;
  const key = Object.keys(CANCEL_URLS).find(k =>
    serviceName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CANCEL_URLS[key] : null;
}

function convertPrice(priceStr, currency, currencies) {
  if (!priceStr) return null;
  const match = priceStr.match(/[\d.]+/);
  if (!match) return priceStr;
  const usd = parseFloat(match[0]);
  const c = currencies[currency];
  const converted = (usd * c.rate).toFixed(currency === "INR" ? 0 : 2);
  return c.symbol + converted + "/mo";
}

function getDaysLeft(trialEndDate) {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function extractUSD(priceStr) {
  if (!priceStr) return 0;
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
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

function CurrencyDropdown({ currency, onChange, currencies }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <div className="currency-wrap" ref={ref}>
      <div className="currency-trigger" onClick={() => setOpen(!open)}>
        <span>{currencies[currency].symbol} {currency}</span>
        <span className="chevron">▾</span>
      </div>
      {open && (
        <div className="currency-dropdown">
          {Object.entries(currencies).map(([code, c]) => (
            <div key={code} className={`curr-opt ${currency === code ? "selected" : ""}`}
              onClick={() => { onChange(code); setOpen(false); }}>
              <span className="curr-symbol">{c.symbol}</span>{c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CancelButton({ serviceName }) {
  const directUrl = getCancelUrl(serviceName);
  return (
    <button className="cancel-btn" onClick={() =>
      window.open(
        directUrl || `https://www.google.com/search?q=cancel+${serviceName}+subscription`,
        "_blank"
      )
    }>
      {directUrl ? "Cancel" : "Cancel ↗"}
    </button>
  );
}

function AlertsPage({ subscriptions, currency, currencies }) {
  const expiring = subscriptions.filter(s => {
    const d = getDaysLeft(s.trialEndDate);
    return d !== null && d <= 7 && d >= 0;
  });
  const autoRenewing = subscriptions.filter(s => s.autoRenew);
  return (
    <div className="page-content">
      <div className="alerts-section">
        <div className="section-header">
          <span className="section-title">⚠ EXPIRING SOON</span>
          <span className="section-count red">{expiring.length}</span>
        </div>
        {expiring.length === 0 ? (
          <div className="alert-empty">No trials expiring in the next 7 days</div>
        ) : (
          expiring.map(sub => {
            const d = getDaysLeft(sub.trialEndDate);
            return (
              <div className="alert-card urgent" key={sub.id}>
                <div className="alert-left">
                  <div className="alert-service">{sub.service}</div>
                  <div className="alert-msg">Trial expires in <span className="red">{d} day{d !== 1 ? "s" : ""}</span></div>
                </div>
                <div className="alert-right">
                  <div className="alert-price">{convertPrice(sub.price, currency, currencies) || "—"}</div>
                  <CancelButton serviceName={sub.service} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="alerts-section">
        <div className="section-header">
          <span className="section-title">🔄 AUTO-RENEWING</span>
          <span className="section-count orange">{autoRenewing.length}</span>
        </div>
        {autoRenewing.length === 0 ? (
          <div className="alert-empty">No auto-renewing subscriptions</div>
        ) : (
          autoRenewing.map(sub => (
            <div className="alert-card" key={sub.id}>
              <div className="alert-left">
                <div className="alert-service">{sub.service}</div>
                <div className="alert-msg">Will automatically renew</div>
              </div>
              <div className="alert-right">
                <div className="alert-price">{convertPrice(sub.price, currency, currencies) || "—"}</div>
                <CancelButton serviceName={sub.service} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SpendTrendsPage({ subscriptions, currency, currencies }) {
  const [chartType, setChartType] = useState("bar");
  const c = currencies[currency];
  const services = subscriptions.filter(s => s.price).map((s) => ({
    name: s.service,
    usd: extractUSD(s.price),
    converted: extractUSD(s.price) * c.rate,
  }));
  const total = services.reduce((a, b) => a + b.converted, 0);
  const maxVal = Math.max(...services.map(s => s.converted), 1);
  const colors = ["#FFA500", "#00FF88", "#3B82F6", "#A78BFA", "#FF5555", "#FCD34D"];
  return (
    <div className="page-content">
      <div className="chart-toolbar">
        <div className="chart-switcher">
          {["bar", "line", "pie"].map(type => (
            <button key={type} className={`chart-btn ${chartType === type ? "active" : ""}`} onClick={() => setChartType(type)}>
              {type === "bar" ? "▬ Bar" : type === "line" ? "↗ Line" : "◉ Pie"}
            </button>
          ))}
        </div>
        <div className="chart-total">Total: <span>{c.symbol}{total.toFixed(currency === "INR" ? 0 : 2)}/mo</span></div>
      </div>
      {services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">↗</div>
          <div className="empty-title">No spend data yet</div>
          <div className="empty-sub">Scan Gmail to detect subscriptions with prices</div>
        </div>
      ) : (
        <div className="chart-container">
          {chartType === "bar" && (
            <div className="bar-chart">
              {services.map((s, i) => (
                <div className="bar-row" key={s.name}>
                  <div className="bar-label">{s.name}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(s.converted / maxVal) * 100}%`, background: colors[i % colors.length] }} />
                  </div>
                  <div className="bar-value">{c.symbol}{s.converted.toFixed(currency === "INR" ? 0 : 2)}</div>
                </div>
              ))}
            </div>
          )}
          {chartType === "line" && (
            <div className="line-chart">
              <div className="line-title">Monthly Spend by Service</div>
              <svg viewBox="0 0 500 200" className="line-svg">
                {services.map((s, i) => {
                  const x = 60 + (i / Math.max(services.length - 1, 1)) * 380;
                  const y = 180 - (s.converted / maxVal) * 150;
                  const nextS = services[i + 1];
                  const nx = nextS ? 60 + ((i + 1) / Math.max(services.length - 1, 1)) * 380 : null;
                  const ny = nextS ? 180 - (nextS.converted / maxVal) * 150 : null;
                  return (
                    <g key={s.name}>
                      {nx && <line x1={x} y1={y} x2={nx} y2={ny} stroke="#FFA500" strokeWidth="2" opacity="0.6" />}
                      <circle cx={x} cy={y} r="5" fill={colors[i % colors.length]} />
                      <text x={x} y={y - 10} fill="rgba(255,255,255,0.5)" fontSize="8" textAnchor="middle">{s.name}</text>
                      <text x={x} y="195" fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="middle">{c.symbol}{s.converted.toFixed(0)}</text>
                    </g>
                  );
                })}
                <line x1="50" y1="180" x2="490" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            </div>
          )}
          {chartType === "pie" && (
            <div className="pie-chart">
              <svg viewBox="0 0 200 200" className="pie-svg">
                {(() => {
                  let startAngle = 0;
                  return services.map((s, i) => {
                    const slice = (s.converted / total) * 360;
                    const start = startAngle;
                    startAngle += slice;
                    const r = 80, cx = 100, cy = 100;
                    const startRad = (start - 90) * Math.PI / 180;
                    const endRad = (start + slice - 90) * Math.PI / 180;
                    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                    const large = slice > 180 ? 1 : 0;
                    return <path key={s.name} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={colors[i % colors.length]} opacity="0.85" stroke="#080810" strokeWidth="2" />;
                  });
                })()}
              </svg>
              <div className="pie-legend">
                {services.map((s, i) => (
                  <div className="legend-item" key={s.name}>
                    <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
                    <span className="legend-name">{s.name}</span>
                    <span className="legend-val">{c.symbol}{s.converted.toFixed(currency === "INR" ? 0 : 2)}</span>
                    <span className="legend-pct">{((s.converted / total) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScanHistoryPage({ subscriptions }) {
  const sorted = [...subscriptions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div className="page-content">
      <div className="section-header" style={{ marginBottom: 16 }}>
        <span className="section-title">⊘ DETECTED SUBSCRIPTIONS</span>
        <span className="section-count orange">{subscriptions.length}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⊘</div>
          <div className="empty-title">No scan history yet</div>
          <div className="empty-sub">Scan Gmail to see results here</div>
        </div>
      ) : (
        <div className="history-table">
          <div className="history-header">
            <div className="hth">Service</div>
            <div className="hth">Classification</div>
            <div className="hth">Confidence</div>
            <div className="hth">Detected</div>
            <div className="hth">Subject</div>
          </div>
          {sorted.map(sub => (
            <div className="history-row" key={sub.id}>
              <div className="htd bold">{sub.service}</div>
              <div className="htd"><Badge type={sub.classification} /></div>
              <div className="htd mono">{sub.confidence ? `${sub.confidence}%` : "—"}</div>
              <div className="htd mono dim">{new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div className="htd dim truncate">{sub.subject}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const [reminderDays, setReminderDays] = useState(3);
  const [autoScan, setAutoScan] = useState(false);
  const [saved, setSaved] = useState(false);
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  return (
    <div className="page-content">
      <div className="settings-group">
        <div className="settings-label">NOTIFICATIONS</div>
        <div className="settings-item">
          <div>
            <div className="settings-title">Reminder Days</div>
            <div className="settings-sub">Send email reminder X days before trial ends</div>
          </div>
          <select className="settings-select" value={reminderDays} onChange={e => setReminderDays(Number(e.target.value))}>
            <option value={1}>1 day before</option>
            <option value={2}>2 days before</option>
            <option value={3}>3 days before</option>
            <option value={5}>5 days before</option>
            <option value={7}>7 days before</option>
          </select>
        </div>
        <div className="settings-item">
          <div>
            <div className="settings-title">Auto-scan Gmail</div>
            <div className="settings-sub">Automatically scan for new subscriptions daily</div>
          </div>
          <div className={`toggle ${autoScan ? "on" : ""}`} onClick={() => setAutoScan(!autoScan)}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-label">ACCOUNT</div>
        <div className="settings-item">
          <div>
            <div className="settings-title">Connected Account</div>
            <div className="settings-sub">Gmail account used for scanning</div>
          </div>
          <div className="settings-val green">● Connected</div>
        </div>
        <div className="settings-item">
          <div>
            <div className="settings-title">AI Provider</div>
            <div className="settings-sub">Model used for email classification</div>
          </div>
          <div className="settings-val orange">Gemini 2.5 Flash</div>
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-label">DATA</div>
        <div className="settings-item">
          <div>
            <div className="settings-title">Clear All Data</div>
            <div className="settings-sub">Remove all detected subscriptions from database</div>
          </div>
          <button className="danger-btn" onClick={() => {
            if (window.confirm("Are you sure? This will delete all subscriptions.")) {
              fetch("http://localhost:5000/subscriptions/clear", { method: "DELETE", credentials: "include" })
                .then(() => window.location.reload())
                .catch(err => console.error(err));
            }
          }}>Clear Data</button>
        </div>
      </div>
      <button className="save-btn" onClick={handleSave}>{saved ? "✓ Saved" : "Save Settings"}</button>
    </div>
  );
}

function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [currencies, setCurrencies] = useState(DEFAULT_RATES);
  const [currency, setCurrency] = useState("USD");
  const [scanning, setScanning] = useState(false);
  const [time, setTime] = useState("");
  const [page, setPage] = useState("overview");
  const [isPolling, setIsPolling] = useState(false);
  const [userName, setUserName] = useState("User");

  // Live clock
  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
      const date = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
      setTime(`${date} · ${formatted} IST`);
    }
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live exchange rates
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(res => res.json())
      .then(data => {
        setCurrencies({
          USD: { symbol: "$", rate: 1, label: "USD — Dollar" },
          INR: { symbol: "₹", rate: data.rates.INR, label: "INR — Rupee" },
          GBP: { symbol: "£", rate: data.rates.GBP, label: "GBP — Pound" },
        });
      })
      .catch(() => console.log("Using fallback exchange rates"));
  }, []);

  // Fetch logged in user name
  useEffect(() => {
    fetch("http://localhost:5000/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => { if (data.name) setUserName(data.name); })
      .catch(() => {});
  }, []);

  // Fetch subscriptions + poll if just scanned
useEffect(() => {
  fetchSubscriptions();
  const justScanned = window.location.search.includes("scanned");
  if (justScanned) {
    setIsPolling(true);
    let prevCount = 0;
    let stableCount = 0;

    const interval = setInterval(() => {
      fetchSubscriptions();
      const currentCount = subscriptions.length;
      if (currentCount === prevCount) {
        stableCount++;
        if (stableCount >= 3) {
          clearInterval(interval);
          setIsPolling(false);
        }
      } else {
        stableCount = 0;
        prevCount = currentCount;
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
    }, 60000);
  }
}, []);

  function fetchSubscriptions() {
    fetch("http://localhost:5000/subscriptions", { credentials: "include" })
      .then(res => res.json())
      .then(data => setSubscriptions(data))
      .catch(err => console.error("Failed to fetch:", err));
  }

  function handleScan() { setScanning(true); window.location.href = "http://localhost:5000/auth/google"; }

  const c = currencies[currency];
  const totalUSD = subscriptions.reduce((acc, sub) => acc + extractUSD(sub.price), 0);
  const totalConverted = (totalUSD * c.rate).toFixed(currency === "INR" ? 0 : 2);
  const trials = subscriptions.filter(s => s.trialDetected).length;
  const expiring = subscriptions.filter(s => { const d = getDaysLeft(s.trialEndDate); return d !== null && d <= 7 && d >= 0; }).length;

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
          <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <div className="user-name">{userName}</div>
            <div className="user-role">FREE TIER</div>
          </div>
        </div>
        <nav className="nav-body">
          <div className="nav-group-label">Monitor</div>
          <div className={`nav-item ${page === "overview" ? "active" : ""}`} onClick={() => setPage("overview")}><span className="nav-item-label">⊞ Overview</span></div>
          <div className={`nav-item ${page === "subscriptions" ? "active" : ""}`} onClick={() => setPage("subscriptions")}>
            <span className="nav-item-label">⊟ Subscriptions</span>
            {subscriptions.length > 0 && <span className="nav-count orange">{subscriptions.length}</span>}
          </div>
          <div className={`nav-item ${page === "alerts" ? "active" : ""}`} onClick={() => setPage("alerts")}>
            <span className="nav-item-label">◎ Alerts</span>
            {expiring > 0 && <span className="nav-dot" />}
          </div>
          <div className="nav-group-label">Analyse</div>
          <div className={`nav-item ${page === "trends" ? "active" : ""}`} onClick={() => setPage("trends")}><span className="nav-item-label">↗ Spend Trends</span></div>
          <div className={`nav-item ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>
            <span className="nav-item-label">⊘ Scan History</span>
            {subscriptions.length > 0 && <span className="nav-count">{subscriptions.length}</span>}
          </div>
          <div className="nav-group-label">System</div>
          <div className={`nav-item ${page === "settings" ? "active" : ""}`} onClick={() => setPage("settings")}><span className="nav-item-label">⚙ Settings</span></div>
        </nav>
        <div className="status-block">
          <div className="status-row"><span className="status-label">Gmail</span><span className="status-val green"><span className="status-dot" />Connected</span></div>
          <div className="status-row"><span className="status-label">Status</span><span className="status-val" style={{ color: isPolling ? "rgba(255,165,0,0.8)" : "rgba(0,255,136,0.6)" }}>{isPolling ? "⟳ Scanning..." : "Live"}</span></div>
          <div className="status-row"><span className="status-label">Auto-scan</span><span className="status-val dim">Off</span></div>
        </div>
        <button className="scan-btn" onClick={handleScan} disabled={scanning}>◎ {scanning ? "SCANNING..." : "SCAN GMAIL"}</button>
      </aside>

      <main className="main">
        <div className="top-bar">
          <div className="top-title">
            {page === "overview" && "Subscription Intelligence"}
            {page === "subscriptions" && "All Subscriptions"}
            {page === "alerts" && "Alerts & Warnings"}
            {page === "trends" && "Spend Trends"}
            {page === "history" && "Scan History"}
            {page === "settings" && "Settings"}
          </div>
          <div className="top-right">
            <div className="top-time">{time}</div>
            <CurrencyDropdown currency={currency} onChange={setCurrency} currencies={currencies} />
          </div>
        </div>

        {page === "alerts" && <AlertsPage subscriptions={subscriptions} currency={currency} currencies={currencies} />}
        {page === "trends" && <SpendTrendsPage subscriptions={subscriptions} currency={currency} currencies={currencies} />}
        {page === "history" && <ScanHistoryPage subscriptions={subscriptions} />}
        {page === "settings" && <SettingsPage />}

        {(page === "overview" || page === "subscriptions") && (
          <>
            {page === "overview" && (
              <div className="stats-row">
                <div className="stat"><div className="stat-label">Total Subs</div><div className="stat-val white">{subscriptions.length}</div><div className="stat-change">all time</div></div>
                <div className="stat"><div className="stat-label">Monthly</div><div className="stat-val orange">{c.symbol}{totalConverted}</div><div className="stat-change">estimated spend</div></div>
                <div className="stat"><div className="stat-label">Expiring</div><div className={`stat-val ${expiring > 0 ? "red" : "white"}`}>{expiring}</div><div className="stat-change">within 7 days</div></div>
                <div className="stat"><div className="stat-label">Active Trials</div><div className="stat-val green">{trials}</div><div className="stat-change">detected</div></div>
              </div>
            )}
            <div className="table-header">
              <div className="th">Service</div><div className="th">Status</div><div className="th">Price</div>
              <div className="th">Days</div><div className="th">Conf.</div><div className="th">Action</div>
            </div>
            {subscriptions.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <div className="empty-title">{isPolling ? "Scanning your Gmail..." : "No subscriptions detected"}</div>
                <div className="empty-sub">{isPolling ? "New subscriptions will appear automatically" : "Click Scan Gmail to scan your inbox"}</div>
              </div>
            )}
            {subscriptions.map(sub => {
              const daysLeft = getDaysLeft(sub.trialEndDate);
              const price = convertPrice(sub.price, currency, currencies);
              return (
                <div className="card" key={sub.id}>
                  <div className="card-info"><div className="card-name">{sub.service}</div><div className="card-subject">{sub.subject}</div></div>
                  <div><Badge type={sub.classification} /></div>
                  <div className="card-price">{price || "—"}</div>
                  <div className={`card-days ${daysLeft !== null && daysLeft <= 3 ? "urgent" : daysLeft !== null && daysLeft > 3 ? "ok" : ""}`}>
                    {daysLeft === null ? "—" : daysLeft <= 0 ? "EXPIRED" : `${daysLeft}d`}
                  </div>
                  <div className="card-conf">{sub.confidence ? `${sub.confidence}%` : "—"}</div>
                  <CancelButton serviceName={sub.service} />
                </div>
              );
            })}
            <div className="bottom-bar">
              <div className="bottom-stat">AUTO-RENEW <span>{subscriptions.filter(s => s.autoRenew).length} ACTIVE</span></div>
              <div className="bottom-stat">STATUS <span>{isPolling ? "SCANNING" : "LIVE"}</span></div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
