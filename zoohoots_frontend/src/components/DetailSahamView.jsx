import React, { useState, useMemo, useEffect } from "react";
import PhaseActivityChart from "./PhaseActivityChart";
import { useStocksData } from "../hooks/useStocksData";

export default function DetailSahamView({
  selectedTicker,
  onSelectStock,
  setActiveTab,
  onBackToWatchlist,
}) {
  const [timeframe, setTimeframe] = useState("6M");

  // ── API DATA ──────────────────────────────────────────────────────────────
  const {
    stocks,
    loading,
    isLive,
    flowCache,
    fetchFlow,
    fundCache,
    fetchFundamentals,
  } = useStocksData();

  const stock = useMemo(() => {
    return stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

  // Fetch flow data saat ticker berubah
  useEffect(() => {
    if (stock?.ticker) {
      fetchFlow(stock.ticker);
    }
  }, [stock?.ticker]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stock?.ticker) {
      fetchFundamentals(stock.ticker);
    }
  }, [stock?.ticker]); // eslint-disable-line react-hooks/exhaustive-deps
  const fundEntry = stock ? fundCache[stock.ticker] : null;
  const fundData = fundEntry?.data || null;
  const fundLoading = fundEntry?.loading ?? false;

  // Ambil flow data dari cache (null selama loading)
  const flowEntry = stock ? flowCache[stock.ticker] : null;
  const flowData = flowEntry?.data || null;
  const flowLoading = flowEntry?.loading ?? false;

  // Guard saat loading
  if (!stock) {
    return (
      <div
        className="detail-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
        }}
      >
        <div style={{ color: "var(--text-3)", textAlign: "center" }}>
          Memuat detail saham…
        </div>
      </div>
    );
  }

  const isUp = stock.chg.startsWith("+");

  const l1BigCls = stock.l1 === "buy" ? "p" : stock.l1 === "sell" ? "r" : "d";
  const l1Bdg =
    stock.l1 === "buy"
      ? "badge-l1-buy"
      : stock.l1 === "sell"
        ? "badge-l1-sell"
        : "badge-l1-neu";
  const l1Lbl =
    stock.l1 === "buy"
      ? "L1 BUY"
      : stock.l1 === "sell"
        ? "L1 SELL"
        : "L1 Neutral";

  const historyMatches =
    stock.historyMatches?.length > 0 ? stock.historyMatches : [];

  return (
    <div className="detail-page">
      {/* TOP CONTROLS & BREADCRUMB */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="back-watchlist-nav-btn"
            onClick={() =>
              onBackToWatchlist
                ? onBackToWatchlist()
                : setActiveTab("dashboard")
            }
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Kembali ke Screener Watchlist</span>
          </button>

          <div className="breadcrumb">
            <button
              onClick={() =>
                onBackToWatchlist
                  ? onBackToWatchlist()
                  : setActiveTab("dashboard")
              }
            >
              Screener Watchlist
            </button>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "var(--cyan)", fontWeight: 700 }}>
              Detail Saham {stock.ticker}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-3)",
              fontWeight: 600,
            }}
          >
            Ganti Saham:
          </span>
          <select
            className="stock-selector-select"
            value={stock.ticker}
            onChange={(e) => onSelectStock(e.target.value)}
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STOCK HEADER */}
      <div className="detail-stock-header">
        <div className="detail-ticker-block">
          <div className="detail-ticker">
            {stock.ticker}
            {stock.combo === "strong" ? (
              <span
                className="badge badge-strong"
                style={{ fontSize: "11px", padding: "4px 12px" }}
              >
                ⚡ Strong Signal
              </span>
            ) : stock.combo === "caution" ? (
              <span
                className="badge badge-caution"
                style={{ fontSize: "11px", padding: "4px 12px" }}
              >
                ⚠️ Hati-hati
              </span>
            ) : null}
          </div>
          <div className="detail-ticker-name">
            {stock.name} · IDX:{stock.ticker} · {stock.sector}
          </div>
        </div>

        <div>
          <div className="big-price">Rp {stock.price}</div>
          <div className="price-meta">
            <span className={`price-change ${isUp ? "up" : "dn"}`}>
              {isUp ? "▲" : "▼"} {stock.chg}%
            </span>
            <span className="dimmed" style={{ fontSize: "12px" }}>
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              · Penutupan
              {!isLive && (
                <span style={{ color: "var(--yellow)", marginLeft: "6px" }}>
                  · cache
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* FULL DUAL PANEL */}
      <div className="full-dual-panel">
        <div className="fdp-card unp">
          <div className="fdp-header">
            <div className="fdp-engine">
              <div className="engine-chip engine-unp">
                <span className="engine-dot c"></span>SCREENER 1
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--cyan)",
                  letterSpacing: "0.06em",
                  marginTop: "4px",
                  opacity: 0.8,
                }}
              >
                Unprecedented Detector
              </div>
            </div>
            <span className="fdp-question">"Seberapa langka kondisi ini?"</span>
          </div>
          <div className="fdp-score-row">
            <div className="fdp-big c">{stock.unp}</div>
            <div className="fdp-score-meta">
              <div className="fdp-score-badge">
                <span className="badge badge-unp">
                  {stock.unpL === "unp"
                    ? "Unprecedented"
                    : stock.unpL === "neu"
                      ? "Neutral"
                      : "Familiar"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
                dari {stock.matches || 27} match historis
              </div>
            </div>
          </div>
          <div className="score-bar">
            <div
              className="score-fill c"
              style={{ width: `${stock.unp}%` }}
            ></div>
          </div>
          <p className="fdp-desc">
            Kondisi fase {stock.ticker} saat ini hanya terjadi{" "}
            {stock.matches || 27} kali dalam 21 Bulan Terakhir.
            {stock.unp >= 50
              ? " Kelangkaan ini menandakan fase yang benar-benar tidak biasa dan berpotensi memicu pergerakan volatil."
              : " Pola fase berada pada rentang frekuensi yang cukup umum dalam pergerakan historis."}
          </p>
          <div className="fdp-metrics">
            <div className="fdp-metric">
              <div className="fdp-metric-label">Phase Freq (tk)</div>
              <div className="fdp-metric-val" style={{ color: "var(--cyan)" }}>
                {stock.freqTk || 15.0}
              </div>
            </div>
            <div className="fdp-metric">
              <div className="fdp-metric-label">Pattern Matches</div>
              <div className="fdp-metric-val">{stock.matches || 27}</div>
            </div>
          </div>
        </div>

        <div className="fdp-card l1">
          <div className="fdp-header">
            <div className="fdp-engine">
              <div className="engine-chip engine-l1">
                <span className="engine-dot p"></span>SCREENER 2
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--purple)",
                  letterSpacing: "0.06em",
                  marginTop: "4px",
                  opacity: 0.8,
                }}
              >
                Phase Resonance L1
              </div>
            </div>
            <span className="fdp-question">"Ke mana arahnya?"</span>
          </div>
          <div className="fdp-score-row">
            <div className={`fdp-big ${l1BigCls}`}>{stock.l1p}%</div>
            <div className="fdp-score-meta">
              <div className="fdp-score-badge">
                <span className={`badge ${l1Bdg}`}>{l1Lbl}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
                bias{" "}
                {stock.l1 === "buy"
                  ? "naik"
                  : stock.l1 === "sell"
                    ? "turun"
                    : "netral"}{" "}
                dari {stock.matches || 27} match
              </div>
            </div>
          </div>
          <div className="score-bar">
            <div
              className={`score-fill ${stock.l1 === "buy" ? "p" : stock.l1 === "sell" ? "r" : "p"}`}
              style={{ width: `${stock.l1p}%` }}
            ></div>
          </div>
          <p className="fdp-desc">
            Dari {stock.matches || 27} preseden historis, {stock.l1p}% berakhir
            dengan pergerakan {stock.l1 === "buy" ? "kenaikan" : "penurunan"}{" "}
            dalam 1–5 hari ke depan. Phase L1 memberikan bias yang jelas untuk
            eksekusi.
          </p>
          <div className="fdp-metrics">
            <div className="fdp-metric">
              <div className="fdp-metric-label">% Dominan</div>
              <div
                className="fdp-metric-val"
                style={{
                  color: stock.l1 === "buy" ? "var(--green)" : "var(--red)",
                }}
              >
                {stock.l1p}%
              </div>
            </div>
            <div className="fdp-metric">
              <div className="fdp-metric-label">Min Threshold</div>
              <div className="fdp-metric-val">65%</div>
            </div>
          </div>
        </div>
      </div>

      {/* COMBINED VERDICT */}
      <div
        className={`verdict-card ${stock.combo === "strong" ? "strong-buy" : stock.combo === "caution" ? "caution" : "normal"}`}
      >
        <div className="verdict-icon">
          {stock.combo === "strong"
            ? "⚡"
            : stock.combo === "caution"
              ? "⚠️"
              : "📊"}
        </div>
        <div className="verdict-body">
          <div className="verdict-title">
            {stock.combo === "strong"
              ? "Strong Signal — UNP Tinggi + L1 BUY"
              : stock.combo === "caution"
                ? "Hati-hati — UNP Tinggi + L1 SELL"
                : "Normal — Tidak Ada Sinyal Ekstrem"}
          </div>
          <div className="verdict-desc">
            {stock.combo === "strong"
              ? `Kondisi langka (UNP ${stock.unp}) dikonfirmasi arah naik oleh L1 (${stock.l1p}%). Kombinasi ini adalah sinyal terkuat dalam metodologi ZOOHOOTS.`
              : stock.combo === "caution"
                ? `Kondisi langka (UNP ${stock.unp}) namun L1 menunjukkan bias penurunan (${stock.l1p}%). Disarankan menunggu konfirmasi atau menerapkan manajemen risiko ketat.`
                : `UNP (${stock.unp}) dan L1 (${stock.l1p}%) berada dalam batas wajar. Tidak ada anomali siklus fase yang terdeteksi.`}
          </div>
        </div>
        <span
          className={`badge ${stock.combo === "strong" ? "badge-strong" : stock.combo === "caution" ? "badge-caution" : "badge-fam"}`}
          style={{ flexShrink: 0 }}
        >
          {stock.combo === "strong"
            ? "Strong Signal"
            : stock.combo === "caution"
              ? "Caution"
              : "Neutral"}
        </span>
      </div>

      {/* PHASE ACTIVITY & RESONANCE CHART */}
      <div className="phase-card-box">
        <PhaseActivityChart
          stock={stock}
          defaultMode="candle"
          defaultTimeframe="1D"
          height={320}
        />
      </div>

      {/* SECTORS FLOW ROW */}
      <div className="sectors-row">
        <div className="sectors-card">
          <div className="sectors-title">
            Foreign vs Domestic Flow
            {flowLoading && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-3)",
                  marginLeft: "8px",
                }}
              >
                memuat…
              </span>
            )}
          </div>
          {flowData ? (
            <div className="flow-bar-wrap">
              <div className="flow-row">
                <span className="flow-label">Asing</span>
                <div className="flow-bar">
                  <div
                    className="flow-fill foreign"
                    style={{ width: `${flowData.foreignPct ?? 50}%` }}
                  ></div>
                </div>
                <span
                  className={`flow-val ${(flowData.foreignFlow || "+").startsWith("+") ? "up" : "dn"}`}
                >
                  {flowData.foreignFlow || "N/A"}
                </span>
              </div>
              <div className="flow-row">
                <span className="flow-label">Domestik</span>
                <div className="flow-bar">
                  <div
                    className="flow-fill domestic"
                    style={{ width: `${flowData.domesticPct ?? 50}%` }}
                  ></div>
                </div>
                <span
                  className={`flow-val ${(flowData.domesticFlow || "+").startsWith("+") ? "up" : "dn"}`}
                >
                  {flowData.domesticFlow || "N/A"}
                </span>
              </div>
            </div>
          ) : !flowLoading ? (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                padding: "16px 0",
              }}
            >
              Data tidak tersedia
            </div>
          ) : (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                padding: "16px 0",
              }}
            >
              <div
                className="loading-spinner"
                style={{
                  width: "14px",
                  height: "14px",
                  display: "inline-block",
                }}
              />
            </div>
          )}
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              marginTop: "10px",
            }}
          >
            Sectors API · Net Foreign Inflow · {flowData?.date || "—"}
          </div>
        </div>

        <div className="sectors-card">
          <div className="sectors-title">
            Top Broker Activity
            {flowLoading && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-3)",
                  marginLeft: "8px",
                }}
              >
                memuat…
              </span>
            )}
          </div>
          {flowData?.topBrokers?.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {flowData.topBrokers.map((b, i) => (
                <div key={i} className="flow-row">
                  <span
                    className="flow-label"
                    style={{ width: "40px", fontWeight: 600 }}
                  >
                    {b.code}
                    {b.side === "buy" ? (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "var(--green)",
                          marginLeft: "3px",
                        }}
                      >
                        ▲
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "var(--red)",
                          marginLeft: "3px",
                        }}
                      >
                        ▼
                      </span>
                    )}
                  </span>
                  <div className="flow-bar">
                    <div
                      className={`flow-fill ${b.side === "buy" ? "foreign" : "domestic"}`}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <span
                    className={`flow-val ${b.flow.startsWith("+") ? "up" : "dn"}`}
                  >
                    {b.flow}
                  </span>
                </div>
              ))}
            </div>
          ) : !flowLoading ? (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                padding: "16px 0",
              }}
            >
              Data tidak tersedia
            </div>
          ) : (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-3)",
                padding: "16px 0",
              }}
            >
              <div
                className="loading-spinner"
                style={{
                  width: "14px",
                  height: "14px",
                  display: "inline-block",
                }}
              />
            </div>
          )}
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              marginTop: "10px",
            }}
          >
            Sectors API · Top Buyers &amp; Sellers · {flowData?.date || "—"}
          </div>
        </div>

        <div className="sectors-card">
          <div className="sectors-title">Fundamental Key</div>
          {fundLoading && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-3)",
                padding: "8px 0",
              }}
            >
              memuat…
            </div>
          )}{" "}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {" "}
            {[
              {
                label: "Forward P/E",
                val: fundData?.pe || stock.fundamentals?.pe || "N/A",
              },
              {
                label: "P/BV",
                val: fundData?.pbv || stock.fundamentals?.pbv || "N/A",
              },
              {
                label: "Div Yield",
                val:
                  fundData?.divYield || stock.fundamentals?.divYield || "N/A",
                color: "var(--green)",
              },
              {
                label: "Market Cap",
                val: fundData?.mktCap || stock.fundamentals?.mktCap || "N/A",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                }}
              >
                {" "}
                <span className="muted">{label}</span>{" "}
                <span style={color ? { color } : {}}>{val}</span>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-3)",
              marginTop: "10px",
            }}
          >
            {" "}
            Sectors API ·{" "}
            {fundData
              ? fundData.mktCap !== "N/A"
                ? "Live"
                : "Partial"
              : "Coming Soon"}{" "}
          </div>
        </div>
      </div>

      {/* HISTORICAL TABLE */}
      {historyMatches.length > 0 && (
        <div className="table-wrap">
          <div className="table-head">
            Histori Phase Match — UNP + L1 ({stock.ticker})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>UNP Score</th>
                  <th>L1 Bias</th>
                  <th>Combo</th>
                  <th>Harga Masuk</th>
                  <th>+5 Hari</th>
                  <th>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {historyMatches.map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.date}</td>
                    <td>
                      <span
                        style={{
                          color: h.unp >= 50 ? "var(--cyan)" : "var(--yellow)",
                          fontWeight: 700,
                        }}
                      >
                        {h.unp}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${h.l1Bias.includes("BUY") ? "badge-l1-buy" : h.l1Bias.includes("SELL") ? "badge-l1-sell" : "badge-l1-neu"}`}
                        style={{ fontSize: "9px" }}
                      >
                        {h.l1Bias}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${h.combo.includes("Strong") ? "badge-strong" : h.combo.includes("Hati") ? "badge-caution" : "badge-fam"}`}
                        style={{ fontSize: "9px" }}
                      >
                        {h.combo}
                      </span>
                    </td>
                    <td>{h.entryPrice}</td>
                    <td
                      className={`price-change ${h.return5d.startsWith("+") ? "up" : "dn"}`}
                    >
                      {h.return5d}
                    </td>
                    <td>
                      <span
                        className={`badge ${h.isWin ? "badge-buy" : "badge-sell"}`}
                        style={{ fontSize: "9px" }}
                      >
                        {h.isWin ? "Naik ✓" : "Turun ✓"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
