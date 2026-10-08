import React from "react";

export default function HowItWorksView() {
  return (
    <div className="how-page">
      {/* ── HEADER ── */}
      <div className="how-header-wrap">
        <div className="section-eyebrow">
          <span className="eyebrow-dot"></span>Metodologi & Cara Kerja
        </div>
        <h1 className="section-title font-display">
          Dua Engine, <span className="hl-cyan">Satu Pipeline</span>
        </h1>
        <p className="section-sub" style={{ margin: 0, maxWidth: "640px" }}>
          Bagaimana data pasar modal IDX diolah menjadi sinyal UNP dan L1 setiap
          malam secara otomatis dan objektif.
        </p>
      </div>

      {/* ── STEPS TIMELINE ── */}
      <div className="steps-timeline">
        {/* STEP 01 */}
        <div className="step-item">
          <div className="step-dot c">
            <div className="step-dot-inner"></div>
          </div>
          <div className="step-card c">
            <div className="step-num-wrap">
              <span className="step-num c">Step 01</span>
            </div>
            <div className="step-title font-display">
              Ambil Data EOD dari Sectors API
            </div>
            <p className="step-desc">
              Setiap malam setelah bursa tutup (EOD), data harga penutupan dan
              volume 45 saham LQ45 diperbarui secara otomatis dari Sectors API.
              Riwayat history ke belakang dianalisis secara dinamis untuk
              menangkap siklus multi-periode.
            </p>
            <span className="step-tag c">
              Sectors EOD API · 45 Saham LQ45 · Otomatis
            </span>
          </div>
        </div>

        {/* STEP 02 */}
        <div className="step-item">
          <div className="step-dot c">
            <div className="step-dot-inner"></div>
          </div>
          <div className="step-card c">
            <div className="step-num-wrap">
              <span className="step-num c">Step 02</span>
            </div>
            <div className="step-title font-display">
              FFT — Temukan Frekuensi Dominan
            </div>
            <p className="step-desc">
              Engine matematika menjalankan Fast Fourier Transform (FFT) pada
              data deret waktu harga untuk mengekstrak frekuensi siklus dominan
              (tk) dan menyaring kebisingan pasar. Ini menghasilkan sidik jari
              spektral unik dari setiap emiten.
            </p>
            <span className="step-tag c">
              High-Speed Math Core · FFT Frequency Analysis · Siklus tk
            </span>
          </div>
        </div>

        {/* STEP 03 */}
        <div className="step-item">
          <div className="step-dot c">
            <div className="step-dot-inner"></div>
          </div>
          <div className="step-card c">
            <div className="step-num-wrap">
              <span className="step-num c">Step 03 — Engine 1</span>
            </div>
            <div className="step-title font-display">
              Unprecedented Detector (UNP)
            </div>
            <p className="step-desc">
              Pattern matching sliding window memindai seluruh histori untuk
              mengukur seberapa langka kondisi fase hari ini. Semakin sedikit
              preseden historis yang ditemukan, semakin tinggi skor UNP (0–100 /
              Unprecedented), menandakan anomali siklus yang berpotensi memicu
              pergerakan volatil.
            </p>
            <span className="step-tag c">
              UNP Score 0–100 · Unprecedented / Neutral / Familiar
            </span>
          </div>
        </div>

        {/* STEP 04 */}
        <div className="step-item">
          <div className="step-dot p">
            <div className="step-dot-inner"></div>
          </div>
          <div className="step-card p">
            <div className="step-num-wrap">
              <span className="step-num p">Step 04 — Engine 2</span>
            </div>
            <div className="step-title font-display">
              Phase Resonance L1 (Arah)
            </div>
            <p className="step-desc">
              Dari seluruh preseden historis yang serupa, dihitung persentase
              pergerakan yang berakhir menguat vs melemah dalam 1–5 hari ke
              depan. Apabila mencapai ambang batas ≥65%, Phase L1 mengeluarkan
              bias BUY atau SELL. Di bawah 65% diklasifikasikan sebagai Netral.
            </p>
            <span className="step-tag p">
              L1 BUY · L1 SELL · L1 Neutral · Ambang Batas 65%
            </span>
          </div>
        </div>

        {/* STEP 05 */}
        <div className="step-item">
          <div className="step-dot p">
            <div className="step-dot-inner"></div>
          </div>
          <div className="step-card p">
            <div className="step-num-wrap">
              <span className="step-num p">Step 05</span>
            </div>
            <div className="step-title font-display">
              Kombinasi Sinyal + Sectors Overlay
            </div>
            <p className="step-desc">
              Hasil UNP dan L1 dipadukan menjadi verdict sinyal (⚡ Strong
              Signal / ⚠️ Hati-hati / Normal / Skip). Data broker summary dari
              Sectors API dilapiskan sebagai validasi aliran modal nyata di
              pasar.
            </p>
            <span className="step-tag p">
              Combined Verdict · Foreign Net Flow · Broker Summary
            </span>
          </div>
        </div>
      </div>

      {/* ── ARSITEKTUR & STACK TEKNOLOGI ── */}
      <div className="tech-section-wrap">
        <div
          className="section-eyebrow"
          style={{ textAlign: "center", marginBottom: "8px" }}
        >
          Infrastruktur Sistem
        </div>
        <h3 className="tech-section-title font-display">
          Arsitektur & Stack Teknologi
        </h3>
        <p className="tech-section-sub">
          Fondasi komputasi berkecepatan tinggi yang memproses analisis spektral
          45 saham LQ45 secara otomatis.
        </p>

        <div className="tech-grid">
          <div className="tech-card">
            <div className="tech-card-title">
              <span className="tech-dot c"></span>Phase Engine (High-Performance
              Core)
            </div>
            <p className="tech-desc">
              Engine komputasi berkecepatan tinggi berbasis Rust memory-safe
              yang memproses FFT multi-dimensi dan pencocokan pola fase 45 saham
              dalam waktu di bawah 100ms.
            </p>
            <span className="tech-pill">
              Rust Core · Parallel Computing · SIMD
            </span>
          </div>

          <div className="tech-card">
            <div className="tech-card-title">
              <span className="tech-dot c"></span>Sectors API
            </div>
            <p className="tech-desc">
              Penyedia data pasar modal IDX harian — historical adjusted close,
              broker summary EOD, foreign flow net, dan valuasi fundamental.
            </p>
            <span className="tech-pill">REST API · EOD Feed · Data IDX</span>
          </div>

          <div className="tech-card">
            <div className="tech-card-title">
              <span className="tech-dot p"></span>Python Backend
            </div>
            <p className="tech-desc">
              Flask / FastAPI service — scheduler otomatis pasca jam bursa
              tutup, bridge komputasi engine, dan in-memory caching hasil dual
              screener.
            </p>
            <span className="tech-pill">
              Python · Flask / FastAPI · Scheduler
            </span>
          </div>

          <div className="tech-card">
            <div className="tech-card-title">
              <span className="tech-dot p"></span>React Frontend
            </div>
            <p className="tech-desc">
              SPA interaktif modern dengan Vite — dual score indicator, dual
              mode phase chart (Line & Candle), filter responsif, dan panel
              analisis mendalam.
            </p>
            <span className="tech-pill">React · Vite · HTML5 Canvas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
