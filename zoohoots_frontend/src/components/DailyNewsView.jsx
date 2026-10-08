import React, { useState, useMemo, useEffect } from 'react';

// Data berita pasar finansial komprehensif (Global, IDX / LQ45, dan Forex/Makro)
// Dilengkapi ringkasan AI, analisis sentimen, dampak pasar, dan estimasi waktu baca
const TOP_STORIES = [
  {
    id: 1,
    ticker: 'AI',
    badgeType: 'ai',
    badgeText: 'AI',
    category: 'Global Market',
    time: '11 hours ago',
    source: 'TradingView News',
    title: 'Anthropic Eyes November IPO as Investors Drool Over $2 Trillion Valuation',
    summary: 'Valuasi Anthropic berpotensi menyentuh angka spektakuler $2 Triliun menjelang persiapan IPO bulan November, memicu gelombang optimisme likuiditas dan reli masif pada ekosistem saham kecerdasan buatan (AI) global.',
    takeaways: [
      'Menjadi katalisator kuat bagi reli saham AI, chip semikonduktor, dan hyperscaler cloud.',
      'Valuasi pasar modal AS kembali mencatat rotasi modal besar ke sektor teknologi frontier.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Bullish Bias',
    impact: 'High',
    readTime: '3 min baca',
    url: 'https://www.tradingview.com/news/',
    tag: 'IPO & AI Boom',
    isFeatured: true,
    isIdx: false
  },
  {
    id: 2,
    ticker: 'DXY',
    badgeType: 'dollar',
    badgeText: '$',
    category: 'Forex & Makro',
    time: '11 hours ago',
    source: 'MarketWatch',
    title: 'DXY: Dollar Holds Near 17-Month High Despite Falling Yields. Nonfarm Payrolls Up Next.',
    summary: 'Indeks Dolar AS (DXY) bertahan kokoh di dekat level tertinggi 17 bulan. Pelaku pasar global bersiap mengantisipasi rilis data ketenagakerjaan Nonfarm Payrolls (NFP) yang akan menentukan laju pemangkasan suku bunga The Fed.',
    takeaways: [
      'Kekuatan dolar AS memberikan tekanan temporer bagi pergerakan mata uang emerging markets termasuk Rupiah.',
      'Data upah dan tenaga kerja AS diproyeksikan menentukan volatilitas pasar obligasi global.'
    ],
    sentiment: 'bearish',
    sentimentLabel: 'Bearish untuk EM',
    impact: 'High',
    readTime: '2 min baca',
    url: 'https://www.marketwatch.com/investing/index/dxy',
    tag: 'Macro Currency',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 3,
    ticker: 'SPX',
    badgeType: 'spx',
    badgeText: '500',
    category: 'Global Market',
    time: '11 hours ago',
    source: 'CNBC',
    title: 'SPX: S&P 500 Futures Edge Higher as Traders Expect Jobs Report to Boost Sentiment',
    summary: 'Kontrak berjangka indeks S&P 500 merangkak naik menjelang pembukaan pasar Wall Street didukung ekspektasi solidnya kinerja laba korporasi kuartal ketiga dan stabilitas makroekonomi AS.',
    takeaways: [
      'Investor institusi mempertahankan porsi eksposur ekuitas defensif-agresif.',
      'Sentimen risk-on global berpeluang memberi limpahan positif pada bursa Asia Pasifik.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Bullish Momentum',
    impact: 'Medium',
    readTime: '2 min baca',
    url: 'https://www.cnbc.com/markets/',
    tag: 'US Equities',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 4,
    ticker: 'BBCA',
    badgeType: 'bca',
    badgeText: 'BCA',
    category: 'IHSG & LQ45',
    time: '2 jam yang lalu',
    source: 'CNBC Indonesia',
    title: 'BBCA: Bank Central Asia Tbk Cetak Rekor Laba Bersih, Asing Terus Akumulasi Saham',
    summary: 'PT Bank Central Asia Tbk kembali membukukan rekor laba bersih kuartalan baru didorong oleh ekspansi kredit korporasi dan pertumbuhan CASA yang kokoh; investor institusi asing membukukan akumulasi net buy signifikan.',
    takeaways: [
      'Margin bunga bersih (NIM) terjaga prima di tengah tren suku bunga acuan tinggi.',
      'Rasio NPL tetap berada di batas ultra-sehat di bawah 1.8%, mempertegas status defensif BBCA.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Strong Bullish',
    impact: 'High',
    readTime: '3 min baca',
    url: 'https://www.cnbcindonesia.com/market',
    tag: 'LQ45 Perbankan',
    isFeatured: true,
    isIdx: true
  },
  {
    id: 5,
    ticker: 'NKE',
    badgeType: 'nike',
    badgeText: '✔',
    category: 'Global Market',
    time: 'yesterday',
    source: 'Bloomberg',
    title: 'NKE: Nike Earnings to Put Turnaround on Trial as China and Margins Set to Stay Weak',
    summary: 'Laporan keuangan kuartalan Nike menghadapi ujian berat akibat penurunan belanja ritel di wilayah Greater China serta tekanan kompetisi ketat dari merek apparel inovatif independen.',
    takeaways: [
      'Manajemen baru mulai merevisi strategi distribusi dan mempercepat siklus inovasi produk.',
      'Margin operasional diprediksi membutuhkan 2-3 kuartal untuk pulih ke level historis.'
    ],
    sentiment: 'bearish',
    sentimentLabel: 'Bearish Watch',
    impact: 'Medium',
    readTime: '2 min baca',
    url: 'https://www.bloomberg.com/quote/NKE:US',
    tag: 'Consumer Earnings',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 6,
    ticker: 'IHSG',
    badgeType: 'idx',
    badgeText: 'IDX',
    category: 'IHSG & LQ45',
    time: '3 jam yang lalu',
    source: 'Bisnis.com',
    title: 'IHSG: Indeks Menguat ke Level 7.700 Didorong Aliran Dana Masuk Asing & Saham Finansial',
    summary: 'IHSG bergerak agresif menembus level psikologis 7.700, ditopang derasnya capital inflow investor asing ke saham perbankan big-caps dan rebound saham infrastruktur energi.',
    takeaways: [
      'Net foreign buy harian menembus +Rp 842 Miliar dalam 1 sesi perdagangan.',
      'Area resisten berikutnya dipetakan pada kisaran level 7.740-7.780.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Bullish Breakout',
    impact: 'High',
    readTime: '3 min baca',
    url: 'https://market.bisnis.com/',
    tag: 'Market Composite',
    isFeatured: false,
    isIdx: true
  },
  {
    id: 7,
    ticker: 'MU',
    badgeType: 'micron',
    badgeText: 'MU',
    category: 'Global Market',
    time: 'yesterday',
    source: 'Reuters',
    title: 'MU: Micron Crushes Estimates but Shares Barely Move. What Happened?',
    summary: 'Meskipun kinerja finansial Micron melampaui seluruh estimasi Wall Street berkat permintaan chip HBM untuk AI, harga saham tertahan oleh aksi ambil untung jangka pendek pasca kenaikan beruntun.',
    takeaways: [
      'Kapasitas produksi HBM3e dilaporkan telah terjual habis hingga akhir tahun 2026.',
      'Koreksi harga dianggap peluang akumulasi teknikal bagi investor institusi jangka panjang.'
    ],
    sentiment: 'neutral',
    sentimentLabel: 'Netral / Konsolidasi',
    impact: 'Medium',
    readTime: '2 min baca',
    url: 'https://www.reuters.com/technology/',
    tag: 'Semiconductors',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 8,
    ticker: 'BREN',
    badgeType: 'bren',
    badgeText: 'BREN',
    category: 'IHSG & LQ45',
    time: '5 jam yang lalu',
    source: 'Kontan Investasi',
    title: 'BREN: Saham Energi Hijau Menguat Tajam Pasca Masuk Radar Indeks Global FTSE',
    summary: 'Saham energi panas bumi PT Barito Renewables Energy Tbk (BREN) melonjak tinggi disertai peningkatan volume transaksi setelah kembali dipertimbangkan dalam evaluasi bobot indeks acuan FTSE Russell.',
    takeaways: [
      'Potensi passive inflow dari rebalancing fund manager global mencapai ratusan miliar rupiah.',
      'Sentimen sektor energi hijau di BEI ikut terdorong naik secara merata.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'High Momentum',
    impact: 'High',
    readTime: '2 min baca',
    url: 'https://investasi.kontan.co.id/',
    tag: 'Energi Terbarukan',
    isFeatured: false,
    isIdx: true
  },
  {
    id: 9,
    ticker: 'IXIC',
    badgeType: 'nasdaq',
    badgeText: 'N',
    category: 'Global Market',
    time: 'yesterday',
    source: 'Yahoo Finance',
    title: 'IXIC: Nasdaq Wraps Up Q3 with a Gain as Traders Enter Q4 with Mixed Feelings',
    summary: 'Indeks Nasdaq menutup kuartal ketiga dengan torehan keuntungan positif. Memasuki kuartal keempat, pelaku pasar mengantisipasi potensi rotasi dari saham Mega-Cap ke saham Small-Cap bernilai valuasi wajar.',
    takeaways: [
      'Volatilitas diperkirakan meningkat menjelang pemilihan umum AS dan rapat FOMC The Fed.',
      'Sektor cloud enterprise dan cybersecurity diproyeksikan memimpin performa Q4.'
    ],
    sentiment: 'neutral',
    sentimentLabel: 'Netral / Konsolidasi',
    impact: 'Medium',
    readTime: '3 min baca',
    url: 'https://finance.yahoo.com/quote/%5EIXIC/',
    tag: 'Tech Index',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 10,
    ticker: 'TLKM',
    badgeType: 'telko',
    badgeText: 'TLKM',
    category: 'IHSG & LQ45',
    time: '6 jam yang lalu',
    source: 'Bloomberg Technoz',
    title: 'TLKM: Pacu Ekosistem AI Data Center & Cloud, Asing Catat Net Buy Rp 184M',
    summary: 'PT Telkom Indonesia Tbk terus mempercepat monetisasi aset data center NeutraDC dan memperluas kolaborasi infrastruktur AI regional, memicu aliran beli bersih investor asing senilai Rp 184 Miliar.',
    takeaways: [
      'Proyek data center hyperscale di Cikarang dan Batam menarik minat kemitraan teknologi global.',
      'Valuasi PBV TLKM di area historis rendah menarik minat value investor lokal dan luar negeri.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Bullish Rebound',
    impact: 'High',
    readTime: '2 min baca',
    url: 'https://www.bloombergtechnoz.com/',
    tag: 'Telco & AI',
    isFeatured: false,
    isIdx: true
  },
  {
    id: 11,
    ticker: 'EUR/USD',
    badgeType: 'forex',
    badgeText: '€$',
    category: 'Forex & Makro',
    time: '2 days ago',
    source: 'TradingView',
    title: 'EUR/USD: Euro Tests 16-Month Low at $1.1310 as Descending Channel Provides Support',
    summary: 'Mata uang tunggal Euro tertekan mendekati level terendah 16 bulan di kisaran $1.1310 seiring penguatan imbal hasil obligasi AS dan kekhawatiran perlambatan manufaktur di Jerman dan Perancis.',
    takeaways: [
      'Peluang pemangkasan suku bunga lanjutan oleh ECB dinilai lebih cepat daripada Federal Reserve AS.',
      'Area support teknikal $1.1280 menjadi garis batas kritis penentu tren jangka menengah.'
    ],
    sentiment: 'bearish',
    sentimentLabel: 'Bearish Trend',
    impact: 'Medium',
    readTime: '2 min baca',
    url: 'https://www.tradingview.com/symbols/EURUSD/',
    tag: 'Forex Major',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 12,
    ticker: 'BI-Rate',
    badgeType: 'bi',
    badgeText: 'BI',
    category: 'Forex & Makro',
    time: '8 jam yang lalu',
    source: 'Bank Indonesia',
    title: 'BI-Rate: Bank Indonesia Pertahankan Suku Bunga Acuan 6% Jaga Stabilitas Nilai Tukar Rupiah',
    summary: 'Rapat Dewan Gubernur (RDG) Bank Indonesia memutuskan untuk mempertahankan BI-Rate di level 6,00% guna memperkuat stabilitas nilai tukar Rupiah sekaligus menjaga momentum pertumbuhan ekonomi nasional.',
    takeaways: [
      'Fokus kebijakan moneter diarahkan pada stabilitas (pro-stability) di tengah volatilitas global.',
      'Likuiditas perbankan tetap dijaga akomodatif melalui instrumen Sekuritas Rupiah Bank Indonesia (SRBI).'
    ],
    sentiment: 'neutral',
    sentimentLabel: 'Netral Pro-Stabilitas',
    impact: 'High',
    readTime: '3 min baca',
    url: 'https://www.bi.go.id/id/publikasi/ruang-media/news/Pages/default.aspx',
    tag: 'Central Bank Policy',
    isFeatured: false,
    isIdx: false
  },
  {
    id: 13,
    ticker: 'GOTO',
    badgeType: 'goto',
    badgeText: 'GOTO',
    category: 'IHSG & LQ45',
    time: 'Kemarin',
    source: 'Bisnis.com',
    title: 'GOTO: Konsolidasi Ekosistem Digital & E-Commerce, Sinyal Phase Menguji Area Support 68',
    summary: 'Saham PT GoTo Gojek Tokopedia Tbk menguji area support psikologis level 68 di tengah percepatan efisiensi operasional dan pertumbuhan pendapatan e-commerce service fee dari kemitraan Tokopedia-TikTok.',
    takeaways: [
      'EBITDA yang disesuaikan diproyeksikan konsisten positif pada kuartal mendatang.',
      'Volume transaksi harian menunjukkan pola akumulasi moderat oleh beberapa broker ritel dan institusi.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Rebound Bias',
    impact: 'Medium',
    readTime: '2 min baca',
    url: 'https://market.bisnis.com/',
    tag: 'Tech Digital',
    isFeatured: false,
    isIdx: true
  },
  {
    id: 14,
    ticker: 'ANTM',
    badgeType: 'gold',
    badgeText: 'AU',
    category: 'IHSG & LQ45',
    time: 'Kemarin',
    source: 'Kontan Investasi',
    title: 'ANTM: Harga Emas Global Tembus Rekor Baru, Saham Tambang Logam Catat Lonjakan Volume',
    summary: 'Reli harga emas spot dunia yang berhasil menembus all-time high baru memicu lonjakan transaksi dan akumulasi pada saham produsen logam mulia PT Aneka Tambang Tbk (ANTM).',
    takeaways: [
      'Peningkatan margin penjualan emas ritel memberikan katalis positif pada proyeksi pendapatan kuartal berjalan.',
      'Sektor komoditas logam mulia menjadi instrumen lindung nilai (hedging) favorit pemodal di tengah ketidakpastian geopolitik.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'Strong Bullish',
    impact: 'High',
    readTime: '2 min baca',
    url: 'https://investasi.kontan.co.id/',
    tag: 'Komoditas Tambang',
    isFeatured: false,
    isIdx: true
  },
  {
    id: 15,
    ticker: 'MU',
    badgeType: 'micron',
    badgeText: 'MU',
    category: 'Global Market',
    time: '2 days ago',
    source: 'TradingView News',
    title: 'MU: Micron Earnings Put the AI Memory Boom to the Test.',
    summary: 'Kebutuhan chip High Bandwidth Memory (HBM) untuk akselerator komputasi AI server diproyeksikan terus meningkat eksponensial, menempatkan Micron pada posisi sentral rantai pasok teknologi masa depan.',
    takeaways: [
      'Permintaan server data center komputasi awan menyerap lebih dari 60% pasokan DRAM tercanggih.',
      'Analis Wall Street merevisi target harga konsensus secara berkelanjutan ke arah atas.'
    ],
    sentiment: 'bullish',
    sentimentLabel: 'AI Growth Trend',
    impact: 'Medium',
    readTime: '3 min baca',
    url: 'https://www.tradingview.com/symbols/NASDAQ-MU/',
    tag: 'AI Hardware',
    isFeatured: false,
    isIdx: false
  }
];

export default function DailyNewsView({ onSelectStock, setActiveTab }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'compact'
  const [toastMessage, setToastMessage] = useState(null);

  // Persistence untuk artikel yang dibookmark
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('zooh_saved_news_ids');
      return stored ? JSON.parse(stored) : [4, 1]; // default sample bookmark
    } catch {
      return [4, 1];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('zooh_saved_news_ids', JSON.stringify(savedIds));
    } catch {
      // ignore
    }
  }, [savedIds]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const toggleBookmark = (id, title, e) => {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        showToast(`⭐ Dihapus dari Berita Tersimpan`);
        return prev.filter((item) => item !== id);
      } else {
        showToast(`⭐ Ditambahkan ke Berita Tersimpan`);
        return [...prev, id];
      }
    });
  };

  const handleShare = (story, e) => {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${story.title} - ${story.url}`);
      showToast(`🔗 Tautan berita disalin ke clipboard!`);
    } else {
      showToast(`🔗 Berita dari ${story.source}`);
    }
  };

  const handleOpenScreener = (ticker, e) => {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    if (onSelectStock) {
      onSelectStock(ticker);
    }
    if (setActiveTab) {
      setActiveTab('screener');
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Berita', count: TOP_STORIES.length },
    { id: 'IHSG & LQ45', label: '🇮🇩 IHSG & LQ45', count: TOP_STORIES.filter(s => s.category === 'IHSG & LQ45').length },
    { id: 'Global Market', label: '🌐 Global Market', count: TOP_STORIES.filter(s => s.category === 'Global Market').length },
    { id: 'Forex & Makro', label: '💵 Forex & Makro', count: TOP_STORIES.filter(s => s.category === 'Forex & Makro').length },
    { id: 'saved', label: `⭐ Tersimpan (${savedIds.length})`, count: savedIds.length }
  ];

  // Lead Featured Story (Default berita #1 atau berita teratas)
  const leadStory = TOP_STORIES[0];
  const isLeadSaved = savedIds.includes(leadStory.id);

  // Filter cerita berdasarkan Category, Sentiment, dan Search Query
  const filteredStories = useMemo(() => {
    return TOP_STORIES.filter((item) => {
      // Category filter
      let matchCat = true;
      if (activeCategory === 'saved') {
        matchCat = savedIds.includes(item.id);
      } else if (activeCategory !== 'all') {
        matchCat = item.category === activeCategory;
      }

      // Sentiment filter
      const matchSentiment =
        sentimentFilter === 'all' || item.sentiment === sentimentFilter;

      // Search Query filter
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.ticker.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q));

      return matchCat && matchSentiment && matchSearch;
    });
  }, [activeCategory, sentimentFilter, searchQuery, savedIds]);

  // Statistik sentimen ringkas untuk widget
  const sentimentStats = useMemo(() => {
    const total = TOP_STORIES.length;
    const bullish = TOP_STORIES.filter((s) => s.sentiment === 'bullish').length;
    const neutral = TOP_STORIES.filter((s) => s.sentiment === 'neutral').length;
    const bearish = TOP_STORIES.filter((s) => s.sentiment === 'bearish').length;
    return {
      bullishPct: Math.round((bullish / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      bearishPct: Math.round((bearish / total) * 100),
      bullishCount: bullish,
      neutralCount: neutral,
      bearishCount: bearish
    };
  }, []);

  const hotTickers = [
    { ticker: 'BBCA', chg: '+2.14%', isIdx: true },
    { ticker: 'BREN', chg: '+5.80%', isIdx: true },
    { ticker: 'TLKM', chg: '+1.87%', isIdx: true },
    { ticker: 'AI', chg: 'IPO $2T', isIdx: false },
    { ticker: 'ANTM', chg: '+3.45%', isIdx: true },
    { ticker: 'SPX', chg: '+0.45%', isIdx: false },
    { ticker: 'DXY', chg: '104.85', isIdx: false }
  ];

  return (
    <div className="news-page">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="news-toast">
          <span className="toast-icon">✨</span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="section-header news-header-section">
        <div className="news-header-top">
          <div className="section-eyebrow">
            <span className="live-dot-pulse"></span>
            Market Intelligence & Top Stories
          </div>
          <div className="news-last-updated">
            <span className="clock-icon">🕒</span> Update Real-time
          </div>
        </div>

        <div className="news-title-row">
          <h1 className="section-title font-display">Daily Market News</h1>
          <div className="news-headline-badge">
            <span className="badge-flair">LIVE</span>
            <span>IDX & Global Coverage</span>
          </div>
        </div>

        <p className="section-sub news-hero-desc">
          Pantauan berita pasar finansial terkini bursa Indonesia (IDX) dan global. Dilengkapi analisis sentimen pasar, ringkasan dampak harga saham, serta integrasi langsung ke sistem screener ZOOHOOTS.
        </p>
      </div>

      {/* MARKET PULSE BAR (5 METRICS) */}
      <div className="market-pulse-bar">
        <div className="pulse-item" onClick={() => { setActiveCategory('IHSG & LQ45'); setSearchQuery('IHSG'); }} title="Klik untuk filter berita IHSG">
          <div className="pulse-label">IHSG Composite</div>
          <div className="pulse-val up">
            7.698,50 <span className="pulse-sub">▲ +0.42%</span>
          </div>
          <div className="pulse-sub-note">Uji Resist 7.720</div>
        </div>

        <div className="pulse-divider"></div>

        <div className="pulse-item" onClick={() => { setActiveCategory('IHSG & LQ45'); }} title="Klik untuk filter berita LQ45">
          <div className="pulse-label">LQ45 Index</div>
          <div className="pulse-val up">
            956,20 <span className="pulse-sub">▲ +0.58%</span>
          </div>
          <div className="pulse-sub-note">Blue-chips Solid</div>
        </div>

        <div className="pulse-divider"></div>

        <div className="pulse-item" title="Aliran dana asing akumulasi">
          <div className="pulse-label">Foreign Net Flow</div>
          <div className="pulse-val up">
            +Rp 842 M <span className="pulse-sub">Inflow</span>
          </div>
          <div className="pulse-sub-note">Net Akumulasi Perbankan</div>
        </div>

        <div className="pulse-divider"></div>

        <div className="pulse-item" onClick={() => { setActiveCategory('Forex & Makro'); setSearchQuery('USD'); }} title="Klik untuk filter berita Kurs USD">
          <div className="pulse-label">USD / IDR</div>
          <div className="pulse-val" style={{ color: 'var(--yellow)' }}>
            Rp 15.420 <span className="pulse-sub">Stabil</span>
          </div>
          <div className="pulse-sub-note">BI-Rate Jaga Volatilitas</div>
        </div>

        <div className="pulse-divider"></div>

        <div className="pulse-item sentiment-pulse-item" title="Konsensus Sentimen Pasar Hari Ini">
          <div className="pulse-label">Market Sentiment</div>
          <div className="pulse-val up">
            {sentimentStats.bullishPct}% <span className="pulse-sub">Bullish Bias</span>
          </div>
          <div className="pulse-sub-note">Risk-On Mode Aktif</div>
        </div>
      </div>

      {/* HERO SECTION: SPOTLIGHT LEAD STORY & AI MARKET INTELLIGENCE */}
      <div className="news-hero-container">
        {/* LEFT: FEATURED LEAD STORY (HERO CARD) */}
        <div className="featured-news-card">
          <div className="featured-banner-tag">
            <span className="breaking-glow-pill">
              <span className="pulse-ring"></span>
              BREAKING NEWS
            </span>
            <span className="featured-impact-pill">High Impact</span>
            <span className="featured-sentiment-pill sentiment-bullish">
              {leadStory.sentimentLabel}
            </span>
          </div>

          <div className="featured-meta-row">
            <div className={`story-avatar badge-${leadStory.badgeType}`}>
              {leadStory.badgeText}
            </div>
            <span className="featured-source">{leadStory.source}</span>
            <span className="meta-sep">·</span>
            <span className="featured-time">{leadStory.time}</span>
            <span className="meta-sep">·</span>
            <span className="featured-readtime">⏱️ {leadStory.readTime}</span>
            <span className="featured-category-badge">{leadStory.tag}</span>
          </div>

          <h2 className="featured-headline">
            <a href={leadStory.url} target="_blank" rel="noopener noreferrer">
              {leadStory.title}
            </a>
          </h2>

          <p className="featured-summary">{leadStory.summary}</p>

          {/* KEY TAKEAWAY BULLETS */}
          <div className="featured-takeaways">
            <div className="takeaway-header">
              <span className="takeaway-icon">📌</span>
              <strong>Key Takeaways:</strong>
            </div>
            <ul className="takeaway-list">
              {leadStory.takeaways.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* FEATURED CARD FOOTER */}
          <div className="featured-card-footer">
            <div className="fcf-left">
              <a
                href={leadStory.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-read-lead"
              >
                Baca di {leadStory.source} <span className="arrow-icon">↗</span>
              </a>

              {leadStory.isIdx && (
                <button
                  className="btn-screener-lead"
                  onClick={(e) => handleOpenScreener(leadStory.ticker, e)}
                  title={`Buka analisis saham ${leadStory.ticker} di Screener`}
                >
                  <span className="icon-chart">📊</span> Analisis {leadStory.ticker} di Screener →
                </button>
              )}
            </div>

            <div className="fcf-right">
              <button
                className={`action-btn-circle ${isLeadSaved ? 'saved' : ''}`}
                onClick={(e) => toggleBookmark(leadStory.id, leadStory.title, e)}
                title={isLeadSaved ? 'Hapus dari tersimpan' : 'Simpan berita ini'}
              >
                {isLeadSaved ? '★' : '☆'}
              </button>
              <button
                className="action-btn-circle"
                onClick={(e) => handleShare(leadStory, e)}
                title="Bagikan tautan berita"
              >
                🔗
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: MARKET PULSE & INTELLIGENCE WIDGET */}
        <div className="ai-market-intel-panel">
          <div className="intel-panel-header">
            <div className="iph-left">
              <span className="intel-badge-icon">📊</span>
              <h3 className="intel-title">Market Pulse</h3>
            </div>
            <span className="intel-live-pill">LIVE</span>
          </div>

          <p className="intel-desc">
            Sintesis sentimen berita bursa dari 15 portal finansial terpercaya untuk mengukur bias pasar hari ini.
          </p>

          {/* SENTIMENT BREAKDOWN BAR */}
          <div className="sentiment-meter-wrap">
            <div className="sm-label-row">
              <span className="sm-bias">Konsensus Sentimen: <strong>BULLISH BIAS</strong></span>
              <span className="sm-score">{sentimentStats.bullishPct}% Optimis</span>
            </div>

            <div className="sentiment-meter-track">
              <div
                className="sm-segment sm-green"
                style={{ width: `${sentimentStats.bullishPct}%` }}
                title={`Bullish: ${sentimentStats.bullishCount} berita (${sentimentStats.bullishPct}%)`}
              ></div>
              <div
                className="sm-segment sm-blue"
                style={{ width: `${sentimentStats.neutralPct}%` }}
                title={`Netral: ${sentimentStats.neutralCount} berita (${sentimentStats.neutralPct}%)`}
              ></div>
              <div
                className="sm-segment sm-red"
                style={{ width: `${sentimentStats.bearishPct}%` }}
                title={`Bearish: ${sentimentStats.bearishCount} berita (${sentimentStats.bearishPct}%)`}
              ></div>
            </div>

            <div className="sm-legend-row">
              <span className="legend-item"><span className="legend-dot green"></span> Bullish ({sentimentStats.bullishCount})</span>
              <span className="legend-item"><span className="legend-dot blue"></span> Netral ({sentimentStats.neutralCount})</span>
              <span className="legend-item"><span className="legend-dot red"></span> Bearish ({sentimentStats.bearishCount})</span>
            </div>
          </div>

          {/* HOT TICKERS IN THE NEWS */}
          <div className="hot-tickers-box">
            <div className="htb-label">
              <span>🔥 Saham / Aset Paling Ramai Dibahas:</span>
            </div>
            <div className="hot-ticker-chips">
              {hotTickers.map((ht) => (
                <button
                  key={ht.ticker}
                  className={`hot-ticker-pill ${searchQuery.toLowerCase() === ht.ticker.toLowerCase() ? 'active' : ''}`}
                  onClick={() => {
                    if (searchQuery.toLowerCase() === ht.ticker.toLowerCase()) {
                      setSearchQuery('');
                    } else {
                      setSearchQuery(ht.ticker);
                    }
                  }}
                  title={`Klik untuk filter berita ${ht.ticker}`}
                >
                  <span className="ht-name">${ht.ticker}</span>
                  <span className={`ht-chg ${ht.chg.includes('+') ? 'up' : ''}`}>{ht.chg}</span>
                </button>
              ))}
            </div>
          </div>

          {/* KEY CATALYSTS TODAY */}
          <div className="catalysts-box">
            <div className="catalysts-label">⚡ Katalis Pasar Hari Ini:</div>
            <div className="catalysts-pills">
              <span className="catalyst-tag">🏦 All-Time High Profit LQ45</span>
              <span className="catalyst-tag">🌐 Net Foreign Buy +Rp 842M</span>
              <span className="catalyst-tag">🚀 AI Tech IPO Momentum</span>
              <span className="catalyst-tag">🛡️ BI Rate Pertahankan 6%</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH, & VIEW MODE TOOLBAR */}
      <div className="news-filter-bar">
        {/* Category Tabs */}
        <div className="news-category-chips">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`filter-chip ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              <span>{c.label}</span>
              {c.id !== 'saved' && (
                <span className="chip-count">{c.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar Controls Right: Sentiment filter, Search, View Switcher */}
        <div className="news-toolbar-controls">
          {/* Sentiment Filter Dropdown / Chips */}
          <div className="sentiment-filter-group">
            <button
              className={`sentiment-filter-btn ${sentimentFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSentimentFilter('all')}
              title="Tampilkan semua sentimen"
            >
              Semua
            </button>
            <button
              className={`sentiment-filter-btn btn-sent-bullish ${sentimentFilter === 'bullish' ? 'active' : ''}`}
              onClick={() => setSentimentFilter(sentimentFilter === 'bullish' ? 'all' : 'bullish')}
              title="Filter berita Bullish"
            >
              🟢 Bullish
            </button>
            <button
              className={`sentiment-filter-btn btn-sent-bearish ${sentimentFilter === 'bearish' ? 'active' : ''}`}
              onClick={() => setSentimentFilter(sentimentFilter === 'bearish' ? 'all' : 'bearish')}
              title="Filter berita Bearish"
            >
              🔴 Bearish
            </button>
            <button
              className={`sentiment-filter-btn btn-sent-neutral ${sentimentFilter === 'neutral' ? 'active' : ''}`}
              onClick={() => setSentimentFilter(sentimentFilter === 'neutral' ? 'all' : 'neutral')}
              title="Filter berita Netral"
            >
              🔵 Netral
            </button>
          </div>

          {/* Search Box with Clear Button */}
          <div className="news-search-box">
            <span className="search-icon-left">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Cari emiten, ticker, topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle: Grid vs Compact Feed */}
          <div className="view-mode-toggle" title="Ubah mode tampilan berita">
            <button
              className={`vmode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Tampilan Kartu Editorial (Grid)"
            >
              <span className="vmode-icon">🗂</span>
              <span className="vmode-text">Kartu</span>
            </button>
            <button
              className={`vmode-btn ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => setViewMode('compact')}
              title="Tampilan Feed Ringkas (TradingView Style)"
            >
              <span className="vmode-icon">📋</span>
              <span className="vmode-text">Daftar</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER FEEDBACK BANNER JIKA SEDANG AKTIF PENCARIAN ATAU FILTER */}
      {(searchQuery || sentimentFilter !== 'all' || activeCategory !== 'all') && (
        <div className="active-filters-notice">
          <span className="af-text">
            Menampilkan <strong>{filteredStories.length}</strong> berita
            {activeCategory !== 'all' && (
              <span> · Kategori: <em>{categories.find(c => c.id === activeCategory)?.label}</em></span>
            )}
            {sentimentFilter !== 'all' && (
              <span> · Sentimen: <em>{sentimentFilter.toUpperCase()}</em></span>
            )}
            {searchQuery && (
              <span> · Kata Kunci: "<strong>{searchQuery}</strong>"</span>
            )}
          </span>
          <button
            className="btn-reset-filters"
            onClick={() => {
              setActiveCategory('all');
              setSentimentFilter('all');
              setSearchQuery('');
            }}
          >
            Reset Semua Filter ✕
          </button>
        </div>
      )}

      {/* MAIN NEWS CONTENT AREA */}
      {viewMode === 'grid' ? (
        /* ─── 1. MODERN MAGAZINE / GRID CARDS VIEW ─── */
        <div className="news-cards-grid">
          {filteredStories.length === 0 ? (
            <div className="news-empty-state">
              <div className="empty-icon">🔍</div>
              <h3>Tidak ada berita yang cocok</h3>
              <p>Coba gunakan kata kunci lain atau reset filter kategori & sentimen Anda.</p>
              <button
                className="btn-primary"
                onClick={() => {
                  setActiveCategory('all');
                  setSentimentFilter('all');
                  setSearchQuery('');
                }}
              >
                Tampilkan Semua Berita
              </button>
            </div>
          ) : (
            filteredStories.map((story) => {
              const isSaved = savedIds.includes(story.id);
              const sentimentClass =
                story.sentiment === 'bullish'
                  ? 'sentiment-bullish'
                  : story.sentiment === 'bearish'
                  ? 'sentiment-bearish'
                  : 'sentiment-neutral';

              const sentimentIcon =
                story.sentiment === 'bullish'
                  ? '▲'
                  : story.sentiment === 'bearish'
                  ? '▼'
                  : '◆';

              return (
                <div key={story.id} className={`news-grid-card ${story.isFeatured ? 'card-featured-flair' : ''}`}>
                  {/* Card Header: Source & Time */}
                  <div className="card-top-row">
                    <div className="card-source-info">
                      <div className={`story-avatar badge-${story.badgeType}`}>
                        {story.badgeText}
                      </div>
                      <div className="source-texts">
                        <span className="card-source-name">{story.source}</span>
                        <span className="card-time-ago">{story.time}</span>
                      </div>
                    </div>

                    <div className={`card-sentiment-badge ${sentimentClass}`}>
                      <span className="sentiment-arrow">{sentimentIcon}</span>
                      <span>{story.sentimentLabel}</span>
                    </div>
                  </div>

                  {/* Card Headline */}
                  <h3 className="card-headline">
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={story.title}
                    >
                      {story.title}
                    </a>
                  </h3>

                  {/* Card Summary Snippet */}
                  <p className="card-summary-text">{story.summary}</p>

                  {/* Card Tag & Read Time */}
                  <div className="card-meta-pills">
                    <span className="card-tag-pill">{story.tag}</span>
                    <span className="card-read-time">⏱️ {story.readTime}</span>
                    {story.impact === 'High' && (
                      <span className="card-impact-pill">⚡ High Impact</span>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="card-actions-footer">
                    <div className="caf-left">
                      {story.isIdx ? (
                        <button
                          className="btn-card-screener"
                          onClick={(e) => handleOpenScreener(story.ticker, e)}
                          title={`Buka analisis saham ${story.ticker} di Screener`}
                        >
                          <span className="screener-mini-icon">📊</span>
                          <span>Analisis ${story.ticker}</span>
                        </button>
                      ) : (
                        <span className="asset-ticker-pill">${story.ticker}</span>
                      )}
                    </div>

                    <div className="caf-right">
                      <button
                        className={`btn-action-icon ${isSaved ? 'active' : ''}`}
                        onClick={(e) => toggleBookmark(story.id, story.title, e)}
                        title={isSaved ? 'Hapus bookmark' : 'Simpan berita'}
                      >
                        {isSaved ? '★' : '☆'}
                      </button>

                      <button
                        className="btn-action-icon"
                        onClick={(e) => handleShare(story, e)}
                        title="Bagikan tautan berita"
                      >
                        🔗
                      </button>

                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-card-read"
                        title={`Buka artikel asli di ${story.source}`}
                      >
                        <span>Baca</span>
                        <span className="ext-arrow">↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ─── 2. COMPACT FEED VIEW (UPGRADED TRADINGVIEW STYLE) ─── */
        <div className="top-stories-card">
          <div className="top-stories-header">
            <div className="tsh-left">
              <h2 className="top-stories-title">Live Market Stream</h2>
              <span className="top-stories-count">{filteredStories.length} berita terpilih</span>
            </div>
            <div className="tsh-badge">
              <span className="live-dot"></span> LIVE TICKER
            </div>
          </div>

          <div className="top-stories-list">
            {filteredStories.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                Tidak ada berita yang cocok dengan filter atau pencarian Anda.
              </div>
            ) : (
              filteredStories.map((story) => {
                const isSaved = savedIds.includes(story.id);
                const sentimentClass =
                  story.sentiment === 'bullish'
                    ? 'sentiment-bullish'
                    : story.sentiment === 'bearish'
                    ? 'sentiment-bearish'
                    : 'sentiment-neutral';

                return (
                  <div key={story.id} className="top-story-item">
                    <div className="top-story-meta">
                      <div className={`story-avatar badge-${story.badgeType}`}>
                        {story.badgeText}
                      </div>
                      <span className="story-time">{story.time}</span>
                      <span className="story-source">· {story.source}</span>
                      <span className={`story-sentiment-micro ${sentimentClass}`}>
                        {story.sentiment === 'bullish' ? '▲' : story.sentiment === 'bearish' ? '▼' : '◆'} {story.sentimentLabel}
                      </span>
                      <span className="story-tag-pill">{story.tag}</span>
                    </div>

                    <div className="top-story-headline-row">
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="top-story-headline-link"
                      >
                        <h3 className="top-story-headline">{story.title}</h3>
                      </a>

                      <div className="compact-actions-row">
                        {story.isIdx && (
                          <button
                            className="btn-compact-screener"
                            onClick={(e) => handleOpenScreener(story.ticker, e)}
                            title={`Analisis ${story.ticker} di Screener`}
                          >
                            📊 {story.ticker}
                          </button>
                        )}
                        <button
                          className={`btn-compact-star ${isSaved ? 'active' : ''}`}
                          onClick={(e) => toggleBookmark(story.id, story.title, e)}
                          title={isSaved ? 'Hapus bookmark' : 'Simpan berita'}
                        >
                          {isSaved ? '★' : '☆'}
                        </button>
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="story-ext-icon"
                          title="Buka sumber asli"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
