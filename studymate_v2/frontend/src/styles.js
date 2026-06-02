/** Global CSS injected at app startup via a <style> tag. */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  html, body, #root { min-height: 100%; height: 100%; margin: 0; background: #080c18; }
  html.light, body.light, body.light #root { background: #f8fafc; }
  body { min-height: 100vh; }
  .sm * { box-sizing: border-box; }
  .sm { font-family: 'Sora', system-ui, sans-serif; color: #f1f5f9; min-height: 100vh; height: 100%; background: #080c18; position: relative; overflow-x: hidden; border-radius: 12px; }
  .sm-main { min-height: 100%; position: relative; }

  .sm-grid {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(rgba(0,212,170,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,.04) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .sm-glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
  .sm-z { position: relative; z-index: 1; }

  .sm-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,.07);
    background: rgba(8,12,24,.8); backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
  }
  .sm-logo { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 600; color: #f1f5f9; cursor: pointer; }
  .sm-logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #00d4aa, #00b894); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .sm-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #00d4aa33, #8b5cf633); border: 1px solid rgba(0,212,170,.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #00d4aa; cursor: pointer; overflow: hidden; }

  .sm-input { width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #f1f5f9; padding: 11px 16px; font-size: 14px; font-family: 'Sora', sans-serif; outline: none; transition: border-color .2s, box-shadow .2s; }
  .sm-input:focus { border-color: rgba(0,212,170,.5); box-shadow: 0 0 0 3px rgba(0,212,170,.08); }
  .sm-input::placeholder { color: #475569; }

  .sm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 10px; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all .18s; }
  .sm-btn-primary { background: linear-gradient(135deg, #00d4aa, #00b894); color: #080c18; font-weight: 600; }
  .sm-btn-primary:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,170,.3); }
  .sm-btn-ghost { background: rgba(255,255,255,.05); color: #94a3b8; border: 1px solid rgba(255,255,255,.1); }
  .sm-btn-ghost:hover { background: rgba(255,255,255,.08); color: #e2e8f0; }
  .sm-btn-danger { background: rgba(239,68,68,.15); color: #f87171; border: 1px solid rgba(239,68,68,.25); }
  .sm-btn-danger:hover { background: rgba(239,68,68,.25); }

  .sm-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 20px; padding-top: 44px; cursor: pointer; transition: all .2s; position: relative; }
  .sm-card:hover { background: rgba(255,255,255,.06); border-color: rgba(0,212,170,.2); transform: translateY(-2px); }
  .sm-tag { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; background: rgba(0,212,170,.1); color: #00d4aa; border: 1px solid rgba(0,212,170,.2); }

  .sm-tab { padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all .2s; color: #64748b; background: transparent; font-family: 'Sora', sans-serif; }
  .sm-tab.active { background: rgba(0,212,170,.12); color: #00d4aa; }
  .sm-tab:hover:not(.active) { color: #94a3b8; background: rgba(255,255,255,.04); }

  .sm-progress-bar { height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
  .sm-progress-fill { height: 100%; background: linear-gradient(90deg, #00d4aa, #8b5cf6); border-radius: 2px; transition: width .4s ease; }

  .sm-flip-scene { perspective: 1200px; width: 100%; }
  .sm-flip-card { position: relative; width: 100%; transition: transform .55s cubic-bezier(.4,0,.2,1); transform-style: preserve-3d; will-change: transform; }
  .sm-flip-card.flipped { transform: rotateY(180deg); }
  .sm-flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0); }
  .sm-flip-back { position: absolute; inset: 0; transform: rotateY(180deg) translateZ(1px); }

  .sm-badge { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .sm-badge-public { background: rgba(0,212,170,.12); color: #00d4aa; }
  .sm-badge-private { background: rgba(255,255,255,.07); color: #64748b; }

  .sm-answer-btn { width: 100%; text-align: left; padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #cbd5e1; font-family: 'Sora', sans-serif; font-size: 14px; cursor: pointer; transition: all .2s; line-height: 1.5; }
  .sm-answer-btn:hover:not(:disabled) { background: rgba(0,212,170,.08); border-color: rgba(0,212,170,.3); color: #f1f5f9; }
  .sm-answer-btn.correct { background: rgba(0,212,170,.15); border-color: rgba(0,212,170,.5); color: #00d4aa; }
  .sm-answer-btn.wrong { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.3); color: #f87171; }

  .sm-mono { font-family: 'JetBrains Mono', monospace; }

  @keyframes sm-fadeup { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .sm-fadeup { animation: sm-fadeup .3s ease forwards; }
  @keyframes sm-pulse { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: .8; transform: scale(1.05); } }
  .sm-pulse { animation: sm-pulse 3s ease-in-out infinite; }

  .sm-divider { height: 1px; background: rgba(255,255,255,.07); margin: 8px 0; }
  .sm-section-title { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #475569; padding: 0 0 8px; }

  .sm-stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 16px; text-align: center; }
  .sm-stat-num { font-size: 28px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .sm-stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }

  .sm-modal-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 250; padding: 20px; }
  .sm-modal { width: min(100%, 480px); background: rgba(15,23,42,.98); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; padding: 26px; box-shadow: 0 32px 80px rgba(0,0,0,.35); }
  .sm-modal h3 { margin: 0 0 8px; font-size: 18px; }
  .sm-modal .sm-toggle-group { display: flex; gap: 10px; margin-bottom: 14px; }
  .sm-modal .sm-toggle-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #cbd5e1; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all .18s; }
  .sm-modal .sm-toggle-btn.active { background: rgba(0,212,170,.12); border-color: rgba(0,212,170,.45); color: #00d4aa; }
  .sm-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .sm-modal-error { color: #f87171; font-size: 13px; margin-top: -6px; margin-bottom: 10px; }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Sidebar */
  .sm-sidebar { position: fixed; left: 18px; top: 18px; bottom: 18px; width: 220px; background: linear-gradient(180deg, rgba(8,12,24,.72), rgba(8,12,24,.6)); border: 1px solid rgba(0,212,170,.06); backdrop-filter: blur(8px); border-radius: 16px; padding: 18px; display: none; flex-direction: column; z-index: 200; transition: width .2s ease, padding .2s ease; }
  .sm-sidebar.mobile-open { display: flex; left: 12px; right: 12px; width: auto; height: auto; top: 80px; bottom: 18px; }
  .sm-sidebar-top { padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,.03); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
  .sm-sidebar.collapsed { width: 72px; padding: 14px 10px; }
  .sm-sidebar.collapsed .sm-sidebar-top { padding-bottom: 8px; margin-bottom: 10px; }
  .sm-sidebar.collapsed .sm-sidebar-title { display: none; }
  .sm-sidebar.collapsed .sm-sidebar-item { justify-content: center; }
  .sm-sidebar.collapsed .sm-sidebar-item span { display: none; }
  .sm-sidebar.collapsed .sm-sidebar-footer { display: none; }
  .sm-sidebar-logo { font-weight: 700; font-size: 18px; }
  .sm-sidebar-brand { display: flex; align-items: center; gap: 10px; }
  .sm-sidebar-menu { display: flex; flex-direction: column; gap: 8px; }
  .sm-sidebar-item { display: inline-flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: transparent; color: #cbd5e1; border: none; cursor: pointer; text-align: left; transition: all .15s; }
  .sm-sidebar-item:hover { transform: translateX(6px); background: rgba(0,212,170,.03); }
  .sm-sidebar-item span { font-size: 14px; }
  .sm-sidebar-item.active { box-shadow: 0 0 18px rgba(0,212,170,.18); background: linear-gradient(90deg, rgba(0,212,170,.06), rgba(139,92,246,.03)); color: #00d4aa; }
  .sm-sidebar-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.03); }

  @media (min-width: 880px) {
    .sm-sidebar { display: flex; }
    .sm:not(.no-sidebar) .sm-main { margin-left: 260px; transition: margin-left 0.2s ease; }
    .sm:not(.no-sidebar).sm-collapsed .sm-main { margin-left: 104px; }
    .sm-hamburger { display: none !important; }
  }
  @media (max-width: 879px) {
    .sm-sidebar { display: none; }
    .sm-hamburger { display: inline-flex !important; background: transparent; border: none; color: #cbd5e1; }
  }

  .sm-fav-btn { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,.32); border-radius: 8px; padding: 6px; border: 1px solid rgba(255,255,255,.04); color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .12s; }
  .sm-fav-btn:hover { transform: scale(1.05); color: #ffd166; }
  .sm-fav-btn.active { color: #ffd166; box-shadow: 0 6px 18px rgba(255,209,102,.12); }

  /* Light theme */
  .sm.light { color: #0f172a; background: #f8fafc; }
  .sm.light .sm-grid { background-image: linear-gradient(rgba(0,0,0,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.02) 1px, transparent 1px); }
  .sm.light .sm-nav { background: rgba(255,255,255,.92); border-bottom: 1px solid rgba(15,23,42,.06); }
  .sm.light .sm-logo { color: #0f172a; }
  .sm.light .sm-mono { color: #475569; }
  .sm.light .sm-input { background: #ffffff; color: #0f172a; border: 1px solid rgba(15,23,42,.06); }
  .sm.light .sm-input::placeholder { color: #94a3b8; }
  .sm.light .sm-btn-ghost { background: rgba(15,23,42,.03); color: #0f172a; border: 1px solid rgba(15,23,42,.04); }
  .sm.light .sm-btn-primary { background: linear-gradient(135deg, #00d4aa, #8b5cf6); color: #ffffff; }
  .sm.light .sm-card { background: #ffffff; border: 1px solid rgba(15,23,42,.06); color: #0f172a; }
  .sm.light .sm-badge { background: rgba(0,212,170,.08); color: #0f172a; }
  .sm.light .sm-tab { color: #475569; }
  .sm.light .sm-divider { background: rgba(15,23,42,.06); }
  .sm.light .sm-sidebar { background: #ffffff; border: 1px solid rgba(15,23,42,.06); color: #0f172a; }

  /* Tour */
  .tour-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1001; }
  .tour-highlight { position: fixed; border: 3px solid #00d4aa; border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); z-index: 1001; }
  .tour-modal { position: fixed; background: #1e293b; border: 1px solid rgba(0,212,170,0.3); border-radius: 12px; padding: 20px; max-width: 320px; z-index: 1002; box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: tourSlideIn 0.3s ease-out; }
  .tour-title { font-size: 16px; font-weight: 600; color: #00d4aa; margin-bottom: 8px; }
  .tour-text { font-size: 13px; color: #cbd5e1; margin-bottom: 16px; line-height: 1.5; }
  .tour-actions { display: flex; gap: 8px; align-items: center; }
  .tour-step-counter { font-size: 12px; color: #64748b; flex: 1; }
  .tour-btn { padding: 6px 12px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; transition: all 0.2s; }
  .tour-btn-skip { background: rgba(255,255,255,0.1); color: #cbd5e1; }
  .tour-btn-skip:hover { background: rgba(255,255,255,0.15); }
  .tour-btn-primary { background: #00d4aa; color: #0f172a; font-weight: 600; }
  .tour-btn-primary:hover { background: #00c79a; }
  @keyframes tourSlideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

  /* Toast */
  .sm-toast { position: fixed; bottom: 24px; right: 24px; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.25); animation: sm-fadeup 0.3s ease forwards; max-width: 360px; }
  .sm-toast-success { background: rgba(0,212,170,0.15); border: 1px solid rgba(0,212,170,0.4); color: #00d4aa; }
  .sm-toast-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; }
  .sm-toast-info { background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.4); color: #a78bfa; }
`;

export default styles;
