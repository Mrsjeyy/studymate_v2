import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Brain, LogIn, LogOut, Plus, Search, ChevronRight,
  RotateCcw, ChevronLeft, Zap, Globe, ArrowLeft, Shield, Check, X,
  Sparkles, Target, FlipHorizontal, Lock, Menu, Sun, Moon, HelpCircle,
} from "lucide-react";
import { Star } from "lucide-react";
import { supabase } from "./supabase";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACCENTS = ["#00d4aa", "#8b5cf6", "#ef4444", "#f59e0b", "#3b82f6", "#ec4899"];

function accentFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
}

function normalizeSet(raw) {
  const profile = raw.profiles;
  const author = profile?.displayname || profile?.username || "Unbekannt";
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || "",
    isPublic: raw.ispublic,
    author,
    authorInitial: (author[0] || "?").toUpperCase(),
    accent: accentFor(raw.id),
    tags: [],
    owneruserid: raw.owneruserid,
    cards: (raw.flashcards || [])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(c => ({ id: c.id, q: c.question, a: c.answer })),
  };
}

const STREAK_STORAGE_KEY = "studymate-streaks";

function toISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDaysSince(dateString, referenceDate = new Date()) {
  const parsedDate = parseISODate(dateString);
  if (!parsedDate) return Infinity;
  const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return Math.floor((reference - parsedDate) / (1000 * 60 * 60 * 24));
}

function readStreakStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStreakStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Could not persist streak data to localStorage.", err);
  }
}

const PROFILE_SETTINGS_KEY = "studymate-profile-settings";

function readProfileSettings(userId) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data[userId] || {};
  } catch {
    return {};
  }
}

function writeProfileSettings(userId, settings) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[userId] = { ...(data[userId] || {}), ...settings };
    window.localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Could not persist profile settings to localStorage.", err);
  }
}

function getStreakState(userKey) {
  const store = readStreakStore();
  const current = store[userKey] || { count: 0, lastCompletedDate: null };
  if (current.lastCompletedDate && getDaysSince(current.lastCompletedDate) > 1) {
    const resetState = { count: 0, lastCompletedDate: null };
    store[userKey] = resetState;
    writeStreakStore(store);
    return resetState;
  }
  return current;
}

function awardDailyStreak(userKey) {
  const today = toISODate();
  const store = readStreakStore();
  const current = getStreakState(userKey);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toISODate(yesterdayDate);

  if (current.lastCompletedDate === today) {
    return current;
  }

  const nextCount = current.lastCompletedDate === yesterday ? current.count + 1 : 1;
  const nextState = { count: nextCount, lastCompletedDate: today };
  store[userKey] = nextState;
  writeStreakStore(store);
  return nextState;
}

// ── Guided Tour ────────────────────────────────────────────────────────────────

const TOUR_STEPS = {
  dashboard: [
    { target: 'h2', title: 'Willkommen! 👋', text: 'Dies ist dein Studien-Hub. Hier siehst du öffentliche Sets und deine eigenen.' },
    { target: '.discover-tab-btn', title: 'Entdecken', text: 'Stöbere durch öffentliche Sets von anderen Nutzern.' },
    { target: '.mine-tab-btn', title: 'Meine Sets', text: 'Deine eigenen erstellten Sets findest du hier.' },
    { target: '.sm-create-btn', title: 'Set erstellen', text: 'Klicke hier, um ein neues Flashcard-Set zu erstellen.' },
  ],
  discover: [
    { target: '.sm-card', title: 'Öffentliche Sets', text: 'Hier siehst du Sets von anderen Nutzern. Du kannst sie forken um deine eigene Kopie zu erstellen.' },
    { target: '.fork-btn', title: 'Set forken', text: 'Mit diesem Button kopierst du ein öffentliches Set in dein Konto.' },
    { target: '.sm-fav-btn', title: 'Favoriten', text: 'Markiere Sets als Favorit, um sie schnell zu finden.' },
  ],
  mine: [
    { target: '.sm-card', title: 'Deine Sets', text: 'Dies sind all deine erstellten Flashcard-Sets.' },
    { target: '.sm-create-btn', title: 'Neues Set', text: 'Erstelle ein neues Set mit eigenen Karten.' },
  ],
  detail: [
    { target: 'h1', title: 'Set Details', text: 'Hier sind alle Karten deines Sets aufgelistet.' },
    { target: '.learn-btn', title: 'Lernen', text: 'Aktiviere den Lernmodus, um die Karten durchzugehen.' },
    { target: '.quiz-btn', title: 'Quiz', text: 'Teste dein Wissen mit einem KI-generierten Quiz.' },
  ],
  createSet: [
    { target: 'input[placeholder*="Titel"]', title: 'Set Name', text: 'Gib einen aussagekräftigen Namen für dein Set ein.' },
    { target: 'textarea', title: 'Beschreibung', text: 'Beschreibe worum es in diesem Set geht.' },
    { target: 'label:has-text("Öffentlich")', title: 'Sichtbarkeit', text: 'Mache dein Set öffentlich, damit andere es entdecken können.' },
  ],
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  html, body, #root { min-height: 100%; height: 100%; margin: 0; background: #080c18; }
  html.light, body.light, body.light #root { background: #f8fafc; }
  body { min-height: 100vh; }
  .sm * { box-sizing: border-box; }
  .sm { font-family: 'Sora', system-ui, sans-serif; color: #f1f5f9; min-height: 100vh; height: 100%; background: #080c18; position: relative; overflow: hidden; border-radius: 12px; }
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

  .sm-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #00d4aa33, #8b5cf633); border: 1px solid rgba(0,212,170,.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #00d4aa; cursor: pointer; }

  .sm-input {
    width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #f1f5f9; padding: 11px 16px; font-size: 14px;
    font-family: 'Sora', sans-serif; outline: none; transition: border-color .2s, box-shadow .2s;
  }
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

  .sm-badge { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;}
  .sm-badge-public { background: rgba(0,212,170,.12); color: #00d4aa}
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

  /* show sidebar on desktop */
  @media (min-width: 880px) {
    .sm-sidebar { display: flex; }
    .sm:not(.no-sidebar) .sm-main { margin-left: 260px; }
    .sm-hamburger { display: none !important; }
  }
  @media (max-width: 879px) {
    .sm-sidebar { display: none; }
    .sm-hamburger { display: inline-flex !important; background: transparent; border: none; color: #cbd5e1; }
  }

  .sm-fav-btn { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,.32); border-radius: 8px; padding: 6px; border: 1px solid rgba(255,255,255,.04); color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .12s; }
  .sm-fav-btn:hover { transform: scale(1.05); color: #ffd166; }
  .sm-fav-btn.active { color: #ffd166; box-shadow: 0 6px 18px rgba(255,209,102,.12); }

  /* Light theme overrides */
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
  .tour-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1001;
  }
  .tour-highlight {
    position: fixed;
    border: 3px solid #00d4aa;
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    z-index: 1001;
  }
  .tour-modal {
    position: fixed;
    background: #1e293b;
    border: 1px solid rgba(0, 212, 170, 0.3);
    border-radius: 12px;
    padding: 20px;
    max-width: 320px;
    z-index: 1002;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    animation: tourSlideIn 0.3s ease-out;
  }
  .tour-title {
    font-size: 16px;
    font-weight: 600;
    color: #00d4aa;
    margin-bottom: 8px;
  }
  .tour-text {
    font-size: 13px;
    color: #cbd5e1;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  .tour-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tour-step-counter {
    font-size: 12px;
    color: #64748b;
    flex: 1;
  }
  .tour-btn {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tour-btn-skip {
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
  }
  .tour-btn-skip:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .tour-btn-primary {
    background: #00d4aa;
    color: #0f172a;
    font-weight: 600;
  }
  .tour-btn-primary:hover {
    background: #00c79a;
  }
  @keyframes tourSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

`;

// ── Components ────────────────────────────────────────────────────────────────

function Spinner({ size = 14, color = "#00d4aa" }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}`, borderTopColor: "transparent",
      display: "inline-block", animation: "spin .8s linear infinite",
    }} />
  );
}

function NavBar({ user, onHome, onLogout, onGoToLogin, theme, onToggleTheme, onProfile, onTourRestart, currentViewHasTour }) {

  return (
    <nav className="sm-nav">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="sm-hamburger" onClick={e => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('toggle-sidebar')); }} style={{ marginRight: 6, display: 'none' }}>
          <Menu size={16} />
        </button>
      </div>
      <div className="sm-logo" onClick={onHome}>
        <div className="sm-logo-icon">
          <Shield size={16} color="#080c18" strokeWidth={2.5} />
        </div>
        <span>Study<span style={{ color: "#00d4aa" }}>Mate</span></span>
        <span className="sm-mono" style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>// cyber</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {currentViewHasTour && (
          <button
            className="sm-btn sm-btn-ghost"
            onClick={onTourRestart}
            title="Tour ansehen"
            style={{ padding: "7px 10px", fontSize: 13, color: "#00d4aa" }}
          >
            <HelpCircle size={14} />
          </button>
        )}
        <button className="sm-btn sm-btn-ghost" onClick={onToggleTheme} title="Theme umschalten" style={{ padding: "7px 10px", fontSize: 13 }}>
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        {user ? (
          <>
            <button className="sm-avatar" onClick={onProfile} title="Profil ansehen" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              {user.initial}
            </button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={onLogout}>
              <LogOut size={14} />
              Logout
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "#475569" }}>Gastmodus</span>
            <button className="sm-btn sm-btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} onClick={onGoToLogin}>
              <LogIn size={14} />
              Anmelden
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function Sidebar({ user, activeView, onNavigate, openMobile, collapsed, onToggleCollapse, onCloseMobile }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'mine', label: 'Meine Sets', icon: Brain },
    { id: 'discover', label: 'Entdecken', icon: Globe },
    ...(user ? [{ id: 'favorites', label: 'Favoriten', icon: Sparkles }] : []),
    { id: 'leaderboard', label: 'Leaderboard', icon: Target },
    { id: 'settings', label: 'Einstellungen', icon: Shield },
  ];

  return (
    <aside className={`sm-sidebar ${collapsed ? 'collapsed' : ''} ${openMobile ? 'mobile-open' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="sm-sidebar-top">
        <div className="sm-sidebar-brand">
          <div className="sm-sidebar-logo">S</div>
          <div className="sm-sidebar-title">Study<span style={{ color: '#00d4aa' }}>Mate</span></div>
        </div>
        <button className="sm-sidebar-collapse" onClick={onToggleCollapse} title="Sidebar ein-/ausblenden">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <div className="sm-sidebar-menu">
        {items.map(it => {
          const Icon = it.icon;
          const active = activeView === it.id || (it.id === 'dashboard' && activeView === 'dashboard');
          return (
            <button key={it.id} className={`sm-sidebar-item ${active ? 'active' : ''}`} onClick={() => { onNavigate(it.id); onCloseMobile && onCloseMobile(); }}>
              <Icon size={16} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
      <div className="sm-sidebar-footer">
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{user ? user.name : 'Gast'}</div>
      </div>
    </aside>
  );
}

function AuthView({ onLogin, onRegister, onGuest, onForgotPassword }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const attempt = async (fn) => {
    setErr("");
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setErr(e.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!username || !pass) { setErr("Bitte alle Felder ausfüllen."); return; }
    attempt(() => onLogin(username, pass));
  };

  const handleRegister = () => {
    if (!username || !pass) { setErr("Bitte alle Felder ausfüllen."); return; }
    if (username.length < 3) { setErr("Benutzername mindestens 3 Zeichen."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setErr("Benutzername darf nur Buchstaben, Zahlen und _ enthalten."); return; }
    if (pass.length < 6) { setErr("Passwort mindestens 6 Zeichen."); return; }
    attempt(() => onRegister(username, pass, recoveryEmail || null));
  };

  return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="sm-glow sm-pulse" style={{ width: 400, height: 400, background: "rgba(0,212,170,.06)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      <div className="sm-z sm-fadeup" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #00d4aa, #00b894)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield size={26} color="#080c18" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>StudyMate</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Lernplattform für Cybersecurity</p>
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, padding: 28 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(""); setUsername(""); setPass(""); }}
                style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span className={`sm-tab ${tab === t ? "active" : ""}`} style={{ display: "block", padding: "7px 0", textAlign: "center" }}>
                  {t === "login" ? "Anmelden" : "Registrieren"}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Benutzername</label>
              <input className="sm-input sm-mono" placeholder="dein_username" value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: "#64748b" }}>Passwort</label>
                {tab === "login" && (
                  <button onClick={onForgotPassword} style={{ fontSize: 12, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                    Passwort vergessen?
                  </button>
                )}
              </div>
              <input className="sm-input" type="password" placeholder="••••••••" value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            {tab === "register" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#64748b" }}>Recovery-Email</label>
                  <span style={{ fontSize: 11, color: "#475569" }}>optional – für Passwort-Reset</span>
                </div>
                <input className="sm-input" type="email" placeholder="deine@email.de" value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)} />
              </div>
            )}

            {err && (
              <div style={{ fontSize: 13, color: "#f87171", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px" }}>
                {err}
              </div>
            )}

            <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              onClick={tab === "login" ? handleLogin : handleRegister} disabled={loading}>
              {loading
                ? <><Spinner size={14} color="#080c18" /> Bitte warten...</>
                : tab === "login"
                  ? <><LogIn size={15} /> Anmelden</>
                  : <><Check size={15} /> Konto erstellen</>}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div className="sm-divider" style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "#475569" }}>oder</span>
            <div className="sm-divider" style={{ flex: 1 }} />
          </div>

          <button className="sm-btn sm-btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onGuest} disabled={loading}>
            <Globe size={14} />
            Als Gast fortfahren
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordView({ onBack }) {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!username) { setErr("Bitte Benutzername eingeben."); return; }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error("Fehler beim Senden.");
    } catch (e) {
      setErr(e.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="sm-z sm-fadeup" style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Link gesendet!</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Falls du eine Recovery-Email hinterlegt hast, prüfe dein Postfach (inkl. Spam).
        </p>
        <button className="sm-btn sm-btn-ghost" style={{ margin: "0 auto" }} onClick={onBack}>
          <ArrowLeft size={14} /> Zurück zum Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="sm-glow sm-pulse" style={{ width: 400, height: 400, background: "rgba(0,212,170,.06)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      <div className="sm-z sm-fadeup" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #00d4aa, #00b894)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield size={26} color="#080c18" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Passwort zurücksetzen</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Reset-Link wird an deine Recovery-Email gesendet</p>
        </div>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, padding: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Benutzername</label>
              <input className="sm-input sm-mono" placeholder="dein_username" value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            {err && <div style={{ fontSize: 13, color: "#f87171", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={handleSubmit} disabled={loading}>
              {loading ? <><Spinner size={14} color="#080c18" /> Senden...</> : "Reset-Link senden"}
            </button>
          </div>
          <button className="sm-btn sm-btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={onBack}>
            <ArrowLeft size={14} /> Zurück zum Login
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordView({ onDone }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (!pass || !pass2) { setErr("Bitte beide Felder ausfüllen."); return; }
    if (pass.length < 6) { setErr("Passwort mindestens 6 Zeichen."); return; }
    if (pass !== pass2) { setErr("Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) { setLoading(false); setErr(error.message); return; }
    await supabase.auth.signOut();
    setLoading(false);
    setDone(true);
    setTimeout(onDone, 2000);
  };

  if (done) return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center" }}>
      <div className="sm-z sm-fadeup" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Passwort geändert!</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Du wirst weitergeleitet...</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="sm-glow sm-pulse" style={{ width: 400, height: 400, background: "rgba(0,212,170,.06)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      <div className="sm-z sm-fadeup" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #00d4aa, #00b894)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield size={26} color="#080c18" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Neues Passwort</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Gib dein neues Passwort ein</p>
        </div>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, padding: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Neues Passwort</label>
              <input className="sm-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Passwort wiederholen</label>
              <input className="sm-input" type="password" placeholder="••••••••" value={pass2} onChange={e => setPass2(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()} />
            </div>
            {err && <div style={{ fontSize: 13, color: "#f87171", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={handleReset} disabled={loading}>
              {loading ? <><Spinner size={14} color="#080c18" /> Speichern...</> : <><Check size={15} /> Passwort speichern</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ user, sets, setsLoading, onOpenSet, onCreateSet, createLoading, initialTab, favorites = [], toggleFavorite, onTabChange, streak, onRequireAuth }) {
  const [tab, setTab] = useState(initialTab || "discover");
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    setTab(initialTab || "discover");
  }, [initialTab]);

  useEffect(() => {
    if (tab === 'discover') {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [tab]);

  const filtered = sets.filter(s => {
    if (tab === "mine" && s.owneruserid !== user?.id) return false;
    if (tab === "discover" && !s.isPublic) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mineSets = sets.filter(s => s.owneruserid === user?.id);
  const totalCards = sets.reduce((acc, s) => acc + s.cards.length, 0);

  const suggestions = sets.filter(s => s.isPublic && s.owneruserid !== user?.id).slice(0, 6);

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      {tab === 'mine' ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Meine Sets</h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: '6px 0 0' }}>Nur deine eigenen Sets werden hier angezeigt.</p>
          </div>
          {user && (
            <button className="sm-create-btn sm-btn sm-btn-primary" onClick={onCreateSet} disabled={createLoading}>
              {createLoading ? <Spinner size={14} color="#080c18" /> : <Plus size={15} />}
              {createLoading ? "Erstellen..." : "Neues Set"}
            </button>
          )}
        </div>
      ) : tab === 'discover' ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Entdecken</h2>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Suche nach öffentlichen Sets von anderen Lernenden.</p>
          </div>
          {user && (
            <button className="sm-create-btn sm-btn sm-btn-primary" onClick={onCreateSet} disabled={createLoading}>
              {createLoading ? <Spinner size={14} color="#080c18" /> : <Plus size={15} />}
              {createLoading ? "Erstellen..." : "Neues Set"}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Dashboard</h2>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Dein Arbeitsbereich mit Fortschritt, Statistiken und deinen Sets.</p>
          </div>
          {user && (
            <button className="sm-create-btn sm-btn sm-btn-primary" onClick={onCreateSet} disabled={createLoading}>
              {createLoading ? <Spinner size={14} color="#080c18" /> : <Plus size={15} />}
              {createLoading ? "Erstellen..." : "Neues Set"}
            </button>
          )}
        </div>
      )}

      {user && tab === 'dashboard' && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { n: mineSets.length, l: "Meine Sets", color: "#00d4aa" },
            { n: totalCards, l: "Karten gesamt", color: "#8b5cf6" },
            { n: streak, l: "Streak-Tage 🔥", color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} className="sm-stat">
              <div className="sm-stat-num" style={{ color: s.color }}>{s.n}</div>
              <div className="sm-stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
          <input ref={searchRef} className="sm-input" style={{ paddingLeft: 40 }} placeholder={tab === 'discover' ? "Nach öffentlichen Sets suchen..." : "Sets suchen..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {user && (
          <div style={{ display: "flex", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {["dashboard", "discover", "mine"].map(t => (
              <button
                key={t}
                className={`sm-tab ${t === "discover" ? "discover-tab-btn" : t === "mine" ? "mine-tab-btn" : ""} ${tab === t ? "active" : ""}`}
                onClick={() => { setTab(t); onTabChange?.(t); }}
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                {t === "dashboard" ? "Dashboard" : t === "discover" ? "Entdecken" : "Meine Sets"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'discover' && suggestions.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Vorgeschlagen für dich</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Basierend auf öffentlichen Sets</div>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {suggestions.map(s => (
              <div key={s.id} className="sm-card" style={{ minWidth: 220, cursor: 'pointer', position: 'relative' }} onClick={() => onOpenSet(s)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{s.title}</strong>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{s.cards.length} Karten</div>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{s.description}</p>
                {s.isPublic && s.owneruserid !== user?.id && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                    <button className="sm-btn sm-btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 'auto' }} onClick={(e) => { e.stopPropagation(); onOpenSet(s); }} title="Set öffnen">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {setsLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
          <Spinner size={28} />
          <p style={{ fontSize: 14, marginTop: 16 }}>Sets werden geladen...</p>
        </div>
      ) : (tab === 'mine' && !user) ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
          <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: .4 }} />
          <p style={{ fontSize: 15, marginBottom: 12 }}>Bitte melden Sie sich an, um Ihre eigenen Sets zu sehen.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button className="sm-btn sm-btn-primary" onClick={() => onRequireAuth?.()}>Anmelden</button>
            <button className="sm-btn sm-btn-ghost" onClick={() => {}}>Weiter als Gast</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
          <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: .4 }} />
          <p style={{ fontSize: 15 }}>Keine Sets gefunden</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map(set => (
            <div key={set.id} className="sm-card" onClick={() => onOpenSet(set)} style={{ position: "relative", overflow: "hidden" }}>
              {user && set.isPublic && set.owneruserid !== user.id && (
                <button
                  className="fork-btn"
                  onClick={(e) => { e.stopPropagation(); handleForkSet(set); }}
                  style={{ position: "absolute", top: 8, right: 50, background: "transparent", border: "none", color: "#00d4aa", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", height: "32px", zIndex: 20 }}
                  title="Dieses Set forken"
                >
                  <FlipHorizontal size={14} />
                  Fork
                </button>
              )}
              <button className={`sm-fav-btn ${favorites.includes(set.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(set.id); }} title="Zu Favoriten hinzufügen" style={{ position: "absolute", top: 8, right: 10, padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "center", height: "32px", width: "32px", zIndex: 20 }}>
                <Star size={14} />
              </button>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${set.accent}, transparent)` }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span className={`sm-badge ${set.isPublic ? "sm-badge-public" : "sm-badge-private"}`}>
                  {set.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                  {set.isPublic ? "Öffentlich" : "Privat"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
                  <BookOpen size={12} />
                  {set.cards.length} Karten
                </div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>{set.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>{set.description}</p>
              {set.tags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {set.tags.map(t => <span key={t} className="sm-tag">{t}</span>)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#475569" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${set.accent}22`, border: `1px solid ${set.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: set.accent }}>
                    {set.authorInitial}
                  </div>
                  {set.author}
                </div>
                <ChevronRight size={16} style={{ color: "#475569" }} />
              </div>
            </div>
          ))}
          {user && tab === "mine" && (
            <div
              style={{ border: "1.5px dashed rgba(0,212,170,.2)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 180, transition: "all .2s" }}
              onClick={onCreateSet}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,212,170,.5)"; e.currentTarget.style.background = "rgba(0,212,170,.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,212,170,.2)"; e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={28} style={{ color: "#00d4aa", opacity: .6 }} />
              <span style={{ fontSize: 14, color: "#64748b" }}>Neues Set erstellen</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailView({ set, user, onBack, onLearn, onQuiz, onAddCard, onToggleVisibility, onDeleteSet, onDeleteCard, onEditCard, onImportCards, onUpdateSetTitle, onForkSet }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [cards, setCards] = useState(set.cards);
  const [saving, setSaving] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editCardId, setEditCardId] = useState(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [editErr, setEditErr] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importErr, setImportErr] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(set.title);
  const [editDescription, setEditDescription] = useState(set.description);
  const [editTitleLoading, setEditTitleLoading] = useState(false);

  const addCard = async () => {
    if (!newQ || !newA) return;
    setSaving(true);
    setAddErr("");
    try {
      const newCard = await onAddCard(set.id, newQ, newA);
      setCards(prev => [...prev, newCard]);
      setNewQ(""); setNewA(""); setShowAdd(false);
    } catch (e) {
      setAddErr(e.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const openEditCard = (card) => {
    setEditCardId(card.id);
    setEditQ(card.q);
    setEditA(card.a);
    setEditErr("");
    setShowEdit(true);
  };

  const saveEditCard = async () => {
    if (!editQ || !editA) return;
    setSaving(true);
    setEditErr("");
    try {
      await onEditCard(editCardId, editQ, editA);
      setCards(prev => prev.map(c => c.id === editCardId ? { ...c, q: editQ, a: editA } : c));
      setShowEdit(false);
    } catch (e) {
      setEditErr(e.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (cardId) => {
    try {
      await onDeleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (e) {
      showToast(e.message || "Fehler beim Löschen.", 'error');
    }
  };

  const importCards = async () => {
    setImportLoading(true);
    setImportErr("");
    try {
      await onImportCards(set.id, importJson);
      const updated = JSON.parse(importJson);
      setCards(prev => [...prev, ...updated.map((u, i) => ({ id: `temp-${i}`, q: u.question, a: u.answer }))]);
      setImportJson("");
      setShowImport(false);
    } catch (e) {
      setImportErr(e.message || "Fehler beim Importieren.");
    } finally {
      setImportLoading(false);
    }
  };

  const saveEditTitle = async () => {
    setEditTitleLoading(true);
    try {
      await onUpdateSetTitle(set.id, editTitle, editDescription);
      setShowEditTitle(false);
    } catch (e) {
      alert(e.message || "Fehler beim Speichern.");
    } finally {
      setEditTitleLoading(false);
    }
  };

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{set.title}</h2>
            {user && user.id === set.owneruserid && (
              <button className="sm-btn sm-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setShowEditTitle(true)} title="Titel bearbeiten">
                <Edit size={14} />
              </button>
            )}
            <span className={`sm-badge ${set.isPublic ? "sm-badge-public" : "sm-badge-private"}`} style={{ fontSize: 11 }}>
              {set.isPublic ? <><Globe size={10} /> Öffentlich</> : <><Lock size={10} /> Privat</>}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>{set.description}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button className="learn-btn sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={onLearn}>
          <Brain size={15} />
          Lernen starten
        </button>
        <button className="quiz-btn sm-btn sm-btn-ghost" style={{ justifyContent: "center", borderColor: "rgba(139,92,246,.3)", color: "#a78bfa" }} onClick={onQuiz}>
          <Zap size={15} />
          Quiz starten
        </button>
      </div>

      {user && set.isPublic && set.owneruserid !== user.id && (
        <button className="sm-btn sm-btn-ghost" style={{ justifyContent: "center", width: "100%", marginBottom: 20, borderColor: "rgba(0,212,170,.3)", color: "#00d4aa" }} onClick={() => onForkSet(set)}>
          <FlipHorizontal size={15} />
          Set forken
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <p className="sm-section-title" style={{ padding: 0 }}>{cards.length} Karten</p>
        {user && user.id === set.owneruserid && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onToggleVisibility(set.id, set.isPublic)}>
              {set.isPublic ? <Lock size={13} /> : <Globe size={13} />}
              {set.isPublic ? "Privat machen" : "Öffentlich machen"}
            </button>
            <button className="sm-btn sm-btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onDeleteSet(set.id)}>
              <X size={13} /> Set löschen
            </button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowAdd(!showAdd)}>
              <Plus size={13} />
              Karte hinzufügen
            </button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowImport(true)}>
              <Plus size={13} />
              Importieren
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ background: "rgba(0,212,170,.05)", border: "1px solid rgba(0,212,170,.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Neue Karte</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Frage..." value={newQ} onChange={e => setNewQ(e.target.value)} />
            <textarea className="sm-input" placeholder="Antwort..." value={newA} onChange={e => setNewA(e.target.value)} rows={3} style={{ resize: "vertical" }} />
            {addErr && <div style={{ fontSize: 13, color: "#f87171" }}>{addErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={addCard} disabled={saving}>
                {saving ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowAdd(false)}>
                <X size={13} /> Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div style={{ background: "rgba(139,92,246,.05)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Karten importieren</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 10px", lineHeight: 1.5 }}>
              JSON-Array mit Karten: <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 12 }}>question</code> und <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 12 }}>answer</code> Felder
            </p>
            <textarea className="sm-input" placeholder={`[{"question": "Frage 1?", "answer": "Antwort 1"}, {"question": "Frage 2?", "answer": "Antwort 2"}]`} value={importJson} onChange={e => setImportJson(e.target.value)} rows={5} style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
            {importErr && <div style={{ fontSize: 13, color: "#f87171" }}>{importErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={importCards} disabled={importLoading}>
                {importLoading ? <><Spinner size={12} color="#080c18" /> Importieren...</> : <><Check size={13} /> Importieren</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { setShowImport(false); setImportJson(""); setImportErr(""); }}>
                <X size={13} /> Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div style={{ background: "rgba(59,130,246,.05)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Karte bearbeiten</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Frage..." value={editQ} onChange={e => setEditQ(e.target.value)} />
            <textarea className="sm-input" placeholder="Antwort..." value={editA} onChange={e => setEditA(e.target.value)} rows={3} style={{ resize: "vertical" }} />
            {editErr && <div style={{ fontSize: 13, color: "#f87171" }}>{editErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={saveEditCard} disabled={saving}>
                {saving ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowEdit(false)}>
                <X size={13} /> Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditTitle && (
        <div style={{ background: "rgba(59,130,246,.05)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Set bearbeiten</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Titel..." value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <textarea className="sm-input" placeholder="Beschreibung..." value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={saveEditTitle} disabled={editTitleLoading}>
                {editTitleLoading ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowEditTitle(false)}>
                <X size={13} /> Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map((c, i) => (
          <div key={c.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: `${set.accent}18`, border: `1px solid ${set.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: set.accent, fontFamily: "JetBrains Mono, monospace" }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 5px", color: "#e2e8f0" }}>{c.q}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{c.a}</p>
            </div>
            {user && user.id === set.owneruserid && (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => openEditCard(c)}>
                  <Sparkles size={13} />
                </button>
                <button className="sm-btn sm-btn-danger" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => deleteCard(c.id)}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LearnView({ set, onBack, onCompleteSet }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState([]);

  const card = set.cards[idx];
  const progress = (idx / set.cards.length) * 100;

  const next = (knew) => {
    setFlipped(false);
    if (knew) setDone([...done, idx]);
    setTimeout(() => {
      if (idx + 1 >= set.cards.length) {
        onCompleteSet?.();
        setIdx(-1);
      }
      else setIdx(idx + 1);
    }, 100);
  };

  if (idx === -1) {
    return (
      <div className="sm-z sm-fadeup" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500 }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Session beendet!</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Du hast alle {set.cards.length} Karten in <strong style={{ color: "#00d4aa" }}>{set.title}</strong> durchgearbeitet.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#00d4aa" }}>{done.length}</div><div className="sm-stat-label">Gewusst ✓</div></div>
            <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#ef4444" }}>{set.cards.length - done.length}</div><div className="sm-stat-label">Noch lernen</div></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setIdx(0); setFlipped(false); setDone([]); }}>
              <RotateCcw size={14} /> Nochmal
            </button>
            <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onBack}>
              <ArrowLeft size={14} /> Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 540, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}><ArrowLeft size={15} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{set.title}</span>
            <span className="sm-mono" style={{ fontSize: 13, color: "#00d4aa" }}>{idx + 1} / {set.cards.length}</span>
          </div>
          <div className="sm-progress-bar"><div className="sm-progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="sm-flip-scene" style={{ marginBottom: 16 }}>
        <div className={`sm-flip-card ${flipped ? "flipped" : ""}`} style={{ height: 280 }} onClick={() => setFlipped(!flipped)}>
          <div className="sm-flip-face" style={{
            height: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${flipped ? "rgba(255,255,255,.08)" : `${set.accent}30`}`,
            borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", cursor: "pointer",
          }}>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: set.accent, display: "inline-block" }} />
              Frage
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.5, margin: 0 }}>{card.q}</p>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 24, display: "flex", alignItems: "center", gap: 6 }}>
              <FlipHorizontal size={13} /> Klicken zum Umdrehen
            </p>
          </div>
          <div className="sm-flip-face sm-flip-back" style={{
            height: "100%", background: `${set.accent}10`, border: `1px solid ${set.accent}40`,
            borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: set.accent, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={12} /> Antwort
            </div>
            <p style={{ fontSize: 15, color: "#e2e8f0", lineHeight: 1.7, margin: 0 }}>{card.a}</p>
          </div>
        </div>
      </div>

      {flipped ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="sm-btn sm-btn-danger" style={{ justifyContent: "center" }} onClick={() => next(false)}>
            <X size={15} /> Nicht gewusst
          </button>
          <button className="sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={() => next(true)}>
            <Check size={15} /> Gewusst!
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button className="sm-btn sm-btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
            <ChevronLeft size={15} /> Zurück
          </button>
          <button className="sm-btn sm-btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setFlipped(true)}>
            Aufdecken
          </button>
        </div>
      )}
    </div>
  );
}

function QuizView({ set, onBack }) {
  const [phase, setPhase] = useState("intro"); // intro | quiz | aiquiz | result
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [quizMode, setQuizMode] = useState("standard");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiQuestions, setAiQuestions] = useState(null);
  const [showExpl, setShowExpl] = useState(false);

  const shuffled = set.cards.slice(0, Math.min(5, set.cards.length));

  const getAnswers = (card) => {
    const wrong = set.cards.filter(c => c.id !== card.id).slice(0, 3).map(c => ({ text: c.a, correct: false }));
    return [...wrong, { text: card.a, correct: true }].sort(() => Math.random() - .5);
  };

  const [stdAnswers] = useState(() => shuffled.map(c => getAnswers(c)));

  const stdPick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (stdAnswers[qIdx][i].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= shuffled.length) { setQuizMode("standard"); setPhase("result"); }
      else { setQIdx(q => q + 1); setSelected(null); }
    }, 1200);
  };

  const aiPick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (aiQuestions && i === aiQuestions[qIdx].correct) setScore(s => s + 1);
    setShowExpl(true);
  };

  const aiNext = () => {
    setShowExpl(false);
    setSelected(null);
    if (!aiQuestions || qIdx + 1 >= aiQuestions.length) { setQuizMode("ai"); setPhase("result"); }
    else setQIdx(q => q + 1);
  };

  const generateAIQuiz = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: set.cards.map(c => ({ q: c.q, a: c.a })), count: 5 }),
      });
      if (!res.ok) throw new Error("Generierung fehlgeschlagen.");
      const data = await res.json();
      setAiQuestions(data.questions);
      setQIdx(0); setSelected(null); setScore(0); setShowExpl(false);
      setPhase("aiquiz");
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (phase === "intro") return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px", marginBottom: 20 }} onClick={onBack}><ArrowLeft size={15} /></button>
      <div style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: "rgba(139,92,246,.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={22} color="#a78bfa" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quiz – {set.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{shuffled.length} Fragen · Multiple Choice</p>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={14} color="#a78bfa" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>KI-Quizgenerierung</span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
            KI erstellt neue Fragen auf Basis deiner Karten – mit Erklärungen nach jeder Antwort.
          </p>
          {aiError && <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 8px" }}>{aiError}</p>}
          <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "7px 14px", borderColor: "rgba(139,92,246,.3)", color: "#a78bfa" }} onClick={generateAIQuiz} disabled={aiLoading}>
            {aiLoading ? <><Spinner size={12} color="#a78bfa" /> Generiere...</> : <><Sparkles size={13} /> KI-Quiz erstellen</>}
          </button>
        </div>
        {set.cards.length >= 4 && (
          <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setQIdx(0); setSelected(null); setScore(0); setPhase("quiz"); }}>
            <Zap size={15} /> Standard-Quiz starten
          </button>
        )}
      </div>
    </div>
  );

  if (phase === "result") {
    const total = quizMode === "ai" && aiQuestions ? aiQuestions.length : shuffled.length;
    return (
      <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          {quizMode === "ai" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.25)", borderRadius: 20, padding: "4px 12px", marginBottom: 12 }}>
              <Sparkles size={12} color="#a78bfa" />
              <span style={{ fontSize: 12, color: "#a78bfa" }}>KI-Quiz</span>
            </div>
          )}
          <div style={{ fontSize: 52, marginBottom: 12 }}>{score === total ? "🏆" : score >= total / 2 ? "💪" : "😞"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>{score === total ? "Perfekt!" : "Quiz abgeschlossen!"}</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>{score} von {total} Fragen richtig</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#00d4aa" }}>{score}</div><div className="sm-stat-label">Richtig</div></div>
          <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#ef4444" }}>{total - score}</div><div className="sm-stat-label">Falsch</div></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setPhase("intro"); setQIdx(0); setSelected(null); setScore(0); setShowExpl(false); setAiError(""); }}>
            <RotateCcw size={14} /> Nochmal
          </button>
          <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onBack}>
            <ArrowLeft size={14} /> Zurück
          </button>
        </div>
      </div>
    );
  }

  if (phase === "aiquiz" && aiQuestions) {
    const q = aiQuestions[qIdx];
    return (
      <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}><ArrowLeft size={15} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>KI-Frage {qIdx + 1} von {aiQuestions.length}</span>
              <span className="sm-mono" style={{ fontSize: 13, color: "#8b5cf6" }}>+{score} Punkte</span>
            </div>
            <div className="sm-progress-bar"><div className="sm-progress-fill" style={{ width: `${(qIdx / aiQuestions.length) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} /></div>
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Sparkles size={12} color="#a78bfa" />
          <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>KI-generierte Frage</span>
        </div>

        <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: "24px 28px", marginBottom: 16, minHeight: 100, display: "flex", alignItems: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{q.question}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {q.options.map((opt, i) => {
            let cls = "sm-answer-btn";
            if (selected !== null) {
              if (i === q.correct) cls += " correct";
              else if (i === selected && i !== q.correct) cls += " wrong";
            }
            return (
              <button key={i} className={cls} onClick={() => aiPick(i)} disabled={selected !== null}>
                <span className="sm-mono" style={{ color: selected !== null && i === q.correct ? "#00d4aa" : selected !== null && i === selected ? "#f87171" : "#475569", marginRight: 10 }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {showExpl && (
          <div style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Brain size={13} color="#a78bfa" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Erklärung</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{q.explanation}</p>
          </div>
        )}

        {selected !== null && (
          <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={aiNext}>
            {qIdx + 1 >= aiQuestions.length ? "Ergebnis sehen" : "Nächste Frage"} <ChevronRight size={15} />
          </button>
        )}
      </div>
    );
  }

  // Standard quiz
  const q = shuffled[qIdx];
  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}><ArrowLeft size={15} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Frage {qIdx + 1} von {shuffled.length}</span>
            <span className="sm-mono" style={{ fontSize: 13, color: "#8b5cf6" }}>+{score} Punkte</span>
          </div>
          <div className="sm-progress-bar"><div className="sm-progress-fill" style={{ width: `${(qIdx / shuffled.length) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} /></div>
        </div>
      </div>

      <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: "24px 28px", marginBottom: 16, minHeight: 100, display: "flex", alignItems: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{q.q}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {stdAnswers[qIdx].map((ans, i) => {
          let cls = "sm-answer-btn";
          if (selected !== null) {
            if (ans.correct) cls += " correct";
            else if (i === selected && !ans.correct) cls += " wrong";
          }
          return (
            <button key={i} className={cls} onClick={() => stdPick(i)} disabled={selected !== null}>
              <span className="sm-mono" style={{ color: selected !== null && ans.correct ? "#00d4aa" : selected !== null && i === selected ? "#f87171" : "#475569", marginRight: 10 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {ans.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FavoritesView({ onBack, sets = [], favorites = [], toggleFavorite, onOpenSet, user }) {
  const [search, setSearch] = useState('');
  const favSets = sets.filter(s => favorites.includes(s.id));
  const filtered = favSets.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="sm-btn sm-btn-ghost" onClick={onBack}><ArrowLeft size={15} /> Zurück</button>
        <h2 style={{ margin: 0 }}>Favoriten</h2>
      </div>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input className="sm-input" placeholder="Favoriten durchsuchen..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: '#64748b' }}>Keine Favoriten gefunden.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map(set => (
            <div key={set.id} className="sm-card" style={{ position: 'relative' }}>
              <button className={`sm-fav-btn ${favorites.includes(set.id) ? 'active' : ''}`} onClick={() => toggleFavorite(set.id)} title="Aus Favoriten entfernen">
                <Star size={14} />
              </button>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>{set.title}</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{set.description}</p>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button className="sm-btn sm-btn-ghost" style={{ flex: 1 }} onClick={() => onOpenSet(set)}>Öffnen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardView({ onBack }) {
  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <button className="sm-btn sm-btn-ghost" onClick={onBack}><ArrowLeft size={15} /> Zurück</button>
      <h2 style={{ marginTop: 18 }}>Leaderboard</h2>
      <p style={{ color: '#64748b' }}>Highscores und Ranglisten erscheinen hier.</p>
    </div>
  );
}

function ProfileView({ user, sets, streak, onBack, onEdit }) {
  const totalCards = sets.reduce((sum, set) => sum + (set.cards?.length || 0), 0);
  const username = user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'gast';
  const previewSets = sets.slice(0, 4);

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <div style={{ width: 116, height: 116, borderRadius: 28, background: 'linear-gradient(135deg, rgba(0,212,170,.18), rgba(139,92,246,.18))', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 86, height: 86, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 700, color: '#080c18' }}>
              {user?.initial}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{user?.name || 'Unbekannt'}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 14 }}>@{username}</div>
            <div style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
              {user?.bio || 'Lernen. Verstehen. Wiederholen. ✨'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="sm-btn sm-btn-primary" style={{ minWidth: 180, justifyContent: 'center' }} onClick={onEdit}>Profil bearbeiten</button>
          <button className="sm-btn sm-btn-ghost" onClick={onBack} style={{ minWidth: 180, justifyContent: 'center' }}>Zurück zur Übersicht</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="sm-stat" style={{ padding: 22 }}>
          <div className="sm-stat-num" style={{ color: '#00d4aa' }}>{totalCards}</div>
          <div className="sm-stat-label">Karteikarten</div>
        </div>
        <div className="sm-stat" style={{ padding: 22 }}>
          <div className="sm-stat-num" style={{ color: '#8b5cf6' }}>{sets.length}</div>
          <div className="sm-stat-label">Karteikartensets</div>
        </div>
        <div className="sm-stat" style={{ padding: 22 }}>
          <div className="sm-stat-num" style={{ color: '#f59e0b' }}>{streak || 0}</div>
          <div className="sm-stat-label">Tage am Stück</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Meine Karteikartensets</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Schnell zu deinen letzten Sets.</p>
        </div>
        <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13 }} onClick={onBack}>Alle anzeigen</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {previewSets.map(set => (
          <div key={set.id} className="sm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: set.accent, display: 'grid', placeItems: 'center', color: '#ffffff', fontWeight: 700 }}>{set.authorInitial}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{set.title}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{set.cards.length} Karteikarten</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: 13 }}>
              Zuletzt gelernt: heute
            </div>
          </div>
        ))}
        {previewSets.length === 0 && (
          <div className="sm-card" style={{ gridColumn: '1 / -1', color: '#64748b' }}>
            Keine Sets verfügbar.
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileEditView({ user, onBack, onSave }) {
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [imageData, setImageData] = useState(user?.imageData || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    if (!displayName.trim()) {
      setError("Bitte gib einen Anzeigenamen ein.");
      return;
    }
    setSaving(true);
    try {
      await onSave(displayName.trim(), bio.trim(), imageData);
    } catch (err) {
      setError(err?.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 840, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 26 }}>
        <div>
          <h2 style={{ margin: 0 }}>Profil bearbeiten</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Passe dein öffentliches Profil an.</p>
        </div>
        <button className="sm-btn sm-btn-ghost" onClick={onBack}>Abbrechen</button>
      </div>

      <div className="sm-card" style={{ padding: 28, borderRadius: 24 }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            <div style={{ width: 96, height: 96, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0', display: 'grid', placeItems: 'center' }}>
              {imageData ? (
                <img src={imageData} alt="Profilbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#cbd5e1', display: 'grid', placeItems: 'center', color: '#475569', fontSize: 28, fontWeight: 700 }}>
                  {user?.initial}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="sm-btn sm-btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                Bild ändern
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <button className="sm-btn sm-btn-ghost" type="button" onClick={() => setImageData(null)}>
                Entfernen
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Anzeigename</label>
            <input className="sm-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Bio</label>
            <textarea className="sm-input" rows={4} value={bio} onChange={e => setBio(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <button className="sm-btn sm-btn-ghost" type="button" onClick={onBack}>Abbrechen</button>
            <button className="sm-btn sm-btn-primary" type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ onBack }) {
  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <button className="sm-btn sm-btn-ghost" onClick={onBack}><ArrowLeft size={15} /> Zurück</button>
      <h2 style={{ marginTop: 18 }}>Einstellungen</h2>
      <p style={{ color: '#64748b' }}>Einstellungen folgen hier.</p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function GuidedTourOverlay({ active, step, viewName, onNext, onPrev, onSkip }) {
  if (!active || !viewName || !TOUR_STEPS[viewName] || !TOUR_STEPS[viewName][step]) {
    return null;
  }

  const tourStep = TOUR_STEPS[viewName][step];
  const totalSteps = TOUR_STEPS[viewName].length;

  // Find target element
  const targetEl = document.querySelector(tourStep.target);
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();

  // Calculate modal position (below target or above if no space)
  let modalTop = rect.bottom + 20;
  let modalLeft = Math.max(20, rect.left + rect.width / 2 - 160);

  if (window.innerHeight - rect.bottom < 250) {
    modalTop = rect.top - 220;
  }

  // Keep modal on screen
  if (modalLeft + 320 > window.innerWidth) {
    modalLeft = window.innerWidth - 340;
  }

  return (
    <div className="tour-overlay">
      <div
        className="tour-highlight"
        style={{
          left: rect.left - 6,
          top: rect.top - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        className="tour-modal"
        style={{
          left: modalLeft,
          top: modalTop,
        }}
      >
        <div className="tour-title">{tourStep.title}</div>
        <div className="tour-text">{tourStep.text}</div>
        <div className="tour-actions">
          <div className="tour-step-counter">{step + 1} von {totalSteps}</div>
          <button className="tour-btn tour-btn-skip" onClick={onSkip}>
            Überspringen
          </button>
          {step > 0 && (
            <button className="tour-btn tour-btn-skip" onClick={onPrev}>
              Zurück
            </button>
          )}
          <button
            className="tour-btn tour-btn-primary"
            onClick={onNext}
          >
            {step === totalSteps - 1 ? 'Fertig' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudyMate() {
  const [view, setView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [currentSet, setCurrentSet] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showCreateSetDialog, setShowCreateSetDialog] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('discover');
  const [favorites, setFavorites] = useState([]);
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [forkSourceSet, setForkSourceSet] = useState(null);
  const [forkTitle, setForkTitle] = useState("");
  const [forkDescription, setForkDescription] = useState("");
  const [forkError, setForkError] = useState("");
  const [forkLoading, setForkLoading] = useState(false);
  const recoveryMode = useRef(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('sm_theme') || 'dark'; } catch (e) { return 'dark'; }
  });
  const [toast, setToast] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tourCurrentView, setTourCurrentView] = useState(null);
  const [tourCompleted, setTourCompleted] = useState(() => {
    try {
      const data = localStorage.getItem('sm_tour_completed');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  });

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Tour helper functions
  const startTour = (viewName) => {
    setTourCurrentView(viewName);
    setCurrentTourStep(0);
    setTourActive(true);
  };

  const skipTour = () => {
    if (tourCurrentView) {
      finishTour(tourCurrentView);
    }
  };

  const nextStep = () => {
    if (!tourCurrentView) return;
    const currentSteps = TOUR_STEPS[tourCurrentView];
    if (currentTourStep < currentSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      finishTour(tourCurrentView);
    }
  };

  const prevStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1);
    }
  };

  const finishTour = (viewName) => {
    const updated = {
      ...tourCompleted,
      [viewName]: { completed: true, completedAt: new Date().toISOString() }
    };
    localStorage.setItem('sm_tour_completed', JSON.stringify(updated));
    setTourCompleted(updated);
    setTourActive(false);
    setTourCurrentView(null);
    setCurrentTourStep(0);
  };

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = styles;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    const key = user?.id || "guest";
    const refreshStreak = () => setStreak(getStreakState(key).count);

    refreshStreak();
    const intervalId = window.setInterval(refreshStreak, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [user?.id]);
  useEffect(() => {
    try { localStorage.setItem('sm_theme', theme); } catch (e) {}
  }, [theme]);

  // Auto-start tour on first dashboard visit
  useEffect(() => {
    if (user && view === 'dashboard' && !tourCompleted.dashboard && !tourActive) {
      setTimeout(() => startTour('dashboard'), 800);
    }
  }, [view, user, tourCompleted.dashboard, tourActive]);

  useEffect(() => {
    // onAuthStateChange muss VOR getSession registriert sein
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryMode.current = true;
        setView("reset");
        return;
      }
      if (!session) {
        recoveryMode.current = false;
        setUser(null);
        setSets([]);
        setView("auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (recoveryMode.current) return; // Recovery läuft — nicht überschreiben
      if (session) {
        initUser(session.user);
      } else {
        setView("dashboard");
        fetchSets(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setSidebarOpenMobile(s => !s);
    document.addEventListener('toggle-sidebar', handler);
    return () => document.removeEventListener('toggle-sidebar', handler);
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); return; }
    try {
      const raw = localStorage.getItem(`sm_favs_${user.id}`);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch (e) { setFavorites([]); }
  }, [user?.id]);

  const toggleFavorite = (setId) => {
    if (!user) { setView('auth'); return; }
    setFavorites(prev => {
      const s = new Set(prev);
      if (s.has(setId)) s.delete(setId); else s.add(setId);
      const arr = Array.from(s);
      try { localStorage.setItem(`sm_favs_${user.id}`, JSON.stringify(arr)); } catch (e) {}
      return arr;
    });
  };

  const handleNavigate = (id) => {
    if (id === 'mine' || id === 'discover' || id === 'dashboard') {
      setDashboardTab(id);
      setView('dashboard');
    } else {
      setView(id);
    }
    setSidebarOpenMobile(false);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const initUser = async (authUser) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, displayname")
      .eq("id", authUser.id)
      .single();

    const name = profile?.displayname || profile?.username || authUser.email.split("@")[0];
    const settings = readProfileSettings(authUser.id);
    setUser({
      id: authUser.id,
      email: authUser.email,
      name,
      initial: name[0]?.toUpperCase() || "U",
      bio: settings.bio || "",
      imageData: settings.imageData || null,
    });
    setView("dashboard");
    await fetchSets(authUser.id);
  };

  const handleSaveProfile = async (displayName, bio, imageData) => {
    if (!user) throw new Error("Kein Benutzer angemeldet.");
    const { error } = await supabase
      .from("profiles")
      .update({ displayname: displayName })
      .eq("id", user.id);

    if (error) {
      console.warn("Profil-Update fehlgeschlagen: ", error.message);
      throw new Error("Profil konnte nicht gespeichert werden.");
    }

    writeProfileSettings(user.id, { bio, imageData });
    setUser(prev => prev ? ({ ...prev, name: displayName, initial: displayName[0]?.toUpperCase() || "U", bio, imageData }) : prev);
  };

  const fetchSets = async (userId = null) => {
    setSetsLoading(true);
    let query = supabase
      .from("flashcard_sets")
      .select("*, flashcards(*)")
      .order("createdat", { ascending: false });

    if (userId) {
      query = query.or(`ispublic.eq.true,owneruserid.eq.${userId}`);
    } else {
      query = query.eq("ispublic", true);
    }

    const { data: rows, error } = await query;
    if (error || !rows) { setSetsLoading(false); return; }

    const ownerIds = [...new Set(rows.map(s => s.owneruserid).filter(Boolean))];
    const { data: profiles } = ownerIds.length
      ? await supabase.from("profiles").select("id, username, displayname").in("id", ownerIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    setSets(rows.map(r => normalizeSet({ ...r, profiles: profileMap[r.owneruserid] || null })));
    setSetsLoading(false);
  };

  const toFakeEmail = (username) => `${username.toLowerCase()}@studymate.local`;

  const handleLogin = async (username, pass) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toFakeEmail(username),
      password: pass,
    });
    if (error) {
      // Benutzerfreundliche Fehlermeldung statt Supabase-Standard
      throw new Error("Benutzername oder Passwort falsch.");
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await initUser(session.user);
  };

  const handleRegister = async (username, pass, recoveryEmail) => {
    const { data, error } = await supabase.auth.signUp({
      email: toFakeEmail(username),
      password: pass,
      options: { data: { username, displayname: username, recovery_email: recoveryEmail || null } },
    });
    if (error) {
      if (error.message.includes("already registered")) throw new Error("Benutzername bereits vergeben.");
      throw error;
    }
    if (data.session) {
      await initUser(data.session.user);
    } else {
      throw new Error("Registrierung fehlgeschlagen. Bitte 'Confirm email' in Supabase deaktivieren.");
    }
  };

  const handleGuest = async () => {
    setView("dashboard");
    await fetchSets(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCompleteSet = () => {
    const key = user?.id || "guest";
    const updated = awardDailyStreak(key);
    setStreak(updated.count);
  };

  const handleAddCard = async (setId, q, a) => {
    const targetSet = sets.find(s => s.id === setId);
    const position = (targetSet?.cards.length ?? 0) + 1;

    const { data, error } = await supabase
      .from("flashcards")
      .insert({ setid: setId, question: q, answer: a, position })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const newCard = { id: data.id, q: data.question, a: data.answer };
    setSets(prev => prev.map(s => s.id === setId ? { ...s, cards: [...s.cards, newCard] } : s));
    return newCard;
  };

  const handleCreateSet = () => {
    if (!user) {
      showToast("Bitte melde dich an, um ein neues Set zu erstellen.", 'error');
      setView("auth");
      return;
    }

    setCreateTitle("");
    setCreateDescription("");
    setCreateIsPublic(false);
    setCreateError("");
    setShowCreateSetDialog(true);
  };

  const submitCreateSet = async () => {
    const title = createTitle.trim();
    const description = createDescription.trim();
    if (!title) {
      setCreateError("Bitte gib einen Titel für dein Set ein.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");

    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .insert({
          owneruserid: user.id,
          title,
          description,
          ispublic: createIsPublic,
        })
        .select("*, flashcards(*)")
        .single();

      if (error) throw error;

      const newSet = normalizeSet({ ...data, profiles: { username: user.name, displayname: user.name } });
      setSets(prev => [newSet, ...prev]);
      setCurrentSet(newSet);
      setShowCreateSetDialog(false);
      setView("detail");
    } catch (e) {
      setCreateError(e?.message || String(e) || "Fehler beim Erstellen des Sets.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleSetVisibility = async (setId, currentVisibility) => {
    if (!window.confirm(`Möchtest du dieses Set wirklich ${currentVisibility ? "privat" : "öffentlich"} machen?`)) return;
    const { data, error } = await supabase
      .from("flashcard_sets")
      .update({ ispublic: !currentVisibility })
      .eq("id", setId)
      .select()
      .single();

    if (error) {
      showToast(error.message || "Fehler beim Aktualisieren der Sichtbarkeit.", 'error');
      return;
    }

    const updatedSet = normalizeSet({ ...data, profiles: { username: user?.name || "Unbekannt", displayname: user?.name || "Unbekannt" } });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, isPublic: updatedSet.isPublic } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, isPublic: updatedSet.isPublic } : prev);
  };

  const handleUpdateSetTitle = async (setId, newTitle, newDescription) => {
    if (!newTitle.trim()) {
      alert("Titel darf nicht leer sein.");
      return;
    }

    const { data, error } = await supabase
      .from("flashcard_sets")
      .update({ title: newTitle.trim(), description: newDescription.trim() })
      .eq("id", setId)
      .select()
      .single();

    if (error) {
      alert(error.message || "Fehler beim Aktualisieren des Sets.");
      return;
    }

    const updatedSet = normalizeSet({ ...data, profiles: { username: user?.name || "Unbekannt", displayname: user?.name || "Unbekannt" } });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, title: updatedSet.title } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, title: updatedSet.title } : prev);
  };

  const handleDeleteSet = async (setId) => {
    if (!window.confirm("Möchtest du dieses Set wirklich endgültig löschen?")) return;

    const { error } = await supabase
      .from("flashcard_sets")
      .delete()
      .eq("id", setId);

    if (error) {
      showToast(error.message || "Fehler beim Löschen des Sets.", 'error');
      return;
    }

    setSets(prev => prev.filter(s => s.id !== setId));
    if (currentSet?.id === setId) {
      setCurrentSet(null);
      setView("dashboard");
    }
  };

  const handleForkSet = async (sourceSet) => {
    console.log("handleForkSet called with:", sourceSet);
    if (!user) {
      showToast("Bitte melde dich an, um ein Set zu forken.", 'error');
      return;
    }

    setForkSourceSet(sourceSet);
    setForkTitle(sourceSet.title);
    setForkDescription(sourceSet.description);
    setForkError("");
    setShowForkDialog(true);
  };

  const submitForkSet = async () => {
    console.log("submitForkSet called, forkSourceSet:", forkSourceSet);
    const title = forkTitle.trim();
    if (!title) {
      setForkError("Bitte gib einen Titel für das geforkte Set ein.");
      return;
    }

    setForkLoading(true);
    setForkError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentifizierung erforderlich.");
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/sets/${forkSourceSet.id}/fork`;
      console.log("Calling fork API:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Fork response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Fehler beim Forken des Sets.");
      }

      const forkedSet = await response.json();
      console.log("Forked set:", forkedSet);
      const normalizedSet = normalizeSet({ ...forkedSet, profiles: { username: user.name, displayname: user.name } });

      const updatedSet = { ...normalizedSet, title, description: forkDescription };
      await supabase
        .from("flashcard_sets")
        .update({ title, description: forkDescription })
        .eq("id", updatedSet.id)
        .execute();

      setSets(prev => [updatedSet, ...prev]);
      setShowForkDialog(false);
      showToast(`Set erfolgreich als "${title}" geforkt!`, 'success');
      fetchSets(user?.id);
    } catch (error) {
      console.error("Fork error:", error);
      setForkError(error?.message || "Fehler beim Forken des Sets.");
    } finally {
      setForkLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Karte wirklich löschen?")) return;
    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    setSets(prev => prev.map(s => ({
      ...s,
      cards: s.cards.filter(c => c.id !== cardId)
    })));
    if (currentSet) {
      setCurrentSet(prev => prev ? { ...prev, cards: prev.cards.filter(c => c.id !== cardId) } : prev);
    }
  };

  const handleEditCard = async (cardId, q, a) => {
    const { error } = await supabase
      .from("flashcards")
      .update({ question: q, answer: a })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    setSets(prev => prev.map(s => ({
      ...s,
      cards: s.cards.map(c => c.id === cardId ? { ...c, q, a } : c)
    })));
    if (currentSet) {
      setCurrentSet(prev => prev ? { ...prev, cards: prev.cards.map(c => c.id === cardId ? { ...c, q, a } : c) } : prev);
    }
  };

  const handleImportCards = async (setId, jsonText) => {
    try {
      const cards = JSON.parse(jsonText);
      if (!Array.isArray(cards)) throw new Error("JSON muss ein Array sein.");
      if (cards.length === 0) throw new Error("Array ist leer.");

      let imported = 0;
      for (const card of cards) {
        if (!card.question || !card.answer) {
          throw new Error(`Karte fehlt 'question' oder 'answer': ${JSON.stringify(card)}`);
        }
        await handleAddCard(setId, card.question, card.answer);
        imported++;
      }
      showToast(`${imported} Karten erfolgreich importiert!`, 'success');
      return imported;
    } catch (e) {
      throw new Error(`Import-Fehler: ${e.message}`);
    }
  };

  const goHome = () => setView("dashboard");

  const showSidebar = (view !== "auth" && view !== "forgot" && view !== "reset");

  if (view === "loading") {
    return (
      <div className="sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 600 }}>
        <div style={{ color: "#64748b", textAlign: "center" }}>
          <Spinner size={32} />
          <p style={{ marginTop: 16, fontSize: 14 }}>Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`sm ${theme === 'light' ? 'light' : ''} ${sidebarCollapsed ? 'sm-collapsed' : ''} ${!showSidebar ? 'no-sidebar' : ''}`}>
      <div className="sm-grid" />
      {(view !== "auth" && view !== "forgot" && view !== "reset") && (
        <Sidebar user={user} activeView={view === 'dashboard' ? dashboardTab : view} onNavigate={handleNavigate} openMobile={sidebarOpenMobile} collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} onCloseMobile={() => setSidebarOpenMobile(false)} />
      )}
      <div className="sm-main">
        <div className="sm-glow" style={{ width: 500, height: 500, background: "rgba(0,212,170,.04)", top: -150, right: -100 }} />
        <div className="sm-glow" style={{ width: 400, height: 400, background: "rgba(139,92,246,.04)", bottom: -100, left: -80 }} />

      {view !== "auth" && view !== "forgot" && view !== "reset" && (

        <NavBar
          user={user}
          onHome={goHome}
          onLogout={handleLogout}
          onProfile={() => setView('profile')}
          onGoToLogin={() => setView("auth")}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onTourRestart={() => startTour(view === 'dashboard' && dashboardTab === 'discover' ? 'discover' : view === 'dashboard' && dashboardTab === 'mine' ? 'mine' : view)}
          currentViewHasTour={!!TOUR_STEPS[view === 'dashboard' && dashboardTab === 'discover' ? 'discover' : view === 'dashboard' && dashboardTab === 'mine' ? 'mine' : view]}
        />

      )}

      {showCreateSetDialog && (
        <div className="sm-modal-overlay" onClick={() => setShowCreateSetDialog(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3>Neues Set erstellen</h3>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Wähle Titel, Beschreibung und Sichtbarkeit.</p>
              </div>
              <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 10px" }} onClick={() => setShowCreateSetDialog(false)}>
                <X size={14} /> Abbrechen
              </button>
            </div>
            <label>Titel</label>
            <input className="sm-input" placeholder="Titel eingeben" value={createTitle} onChange={e => setCreateTitle(e.target.value)} />
            <label>Beschreibung</label>
            <textarea className="sm-input" rows={4} placeholder="Beschreibung (optional)" value={createDescription} onChange={e => setCreateDescription(e.target.value)} style={{ resize: "vertical" }} />
            <label>Sichtbarkeit</label>
            <div className="sm-toggle-group">
              <button type="button" className={`sm-toggle-btn ${!createIsPublic ? "active" : ""}`} onClick={() => setCreateIsPublic(false)}>
                Privat
              </button>
              <button type="button" className={`sm-toggle-btn ${createIsPublic ? "active" : ""}`} onClick={() => setCreateIsPublic(true)}>
                Öffentlich
              </button>
            </div>
            {createError && <div className="sm-modal-error">{createError}</div>}
            <div className="sm-modal-actions">
              <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submitCreateSet} disabled={createLoading}>
                {createLoading ? <><Spinner size={14} color="#080c18" /> Erstellen...</> : "Set erstellen"}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCreateSetDialog(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showForkDialog && (
        <div className="sm-modal-overlay" onClick={() => setShowForkDialog(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3>Set forken</h3>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Bearbeite den Namen deines geforkten Sets.</p>
              </div>
              <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 10px" }} onClick={() => setShowForkDialog(false)}>
                <X size={14} /> Abbrechen
              </button>
            </div>
            <label>Titel</label>
            <input className="sm-input" placeholder="Titel eingeben" value={forkTitle} onChange={e => setForkTitle(e.target.value)} />
            <label>Beschreibung</label>
            <textarea className="sm-input" rows={4} placeholder="Beschreibung (optional)" value={forkDescription} onChange={e => setForkDescription(e.target.value)} style={{ resize: "vertical" }} />
            {forkError && <div className="sm-modal-error">{forkError}</div>}
            <div className="sm-modal-actions">
              <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submitForkSet} disabled={forkLoading}>
                {forkLoading ? <><Spinner size={14} color="#080c18" /> Forken...</> : "Set forken"}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowForkDialog(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "auth" && (
        <AuthView
          onLogin={handleLogin}
          onRegister={handleRegister}
          onGuest={handleGuest}
          onForgotPassword={() => setView("forgot")}
        />
      )}

      {view === "forgot" && (
        <ForgotPasswordView onBack={() => setView("auth")} />
      )}

      {view === "reset" && (
        <ResetPasswordView onDone={() => setView("auth")} />
      )}

      {view === "dashboard" && (
        <DashboardView
          user={user}
          sets={sets}
          setsLoading={setsLoading}
          onOpenSet={(s) => { setCurrentSet(s); setView("detail"); }}
          onCreateSet={handleCreateSet}
          initialTab={dashboardTab}
          onTabChange={setDashboardTab}
          createLoading={createLoading}
          streak={streak}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          onRequireAuth={() => setView('auth')}
        />
      )}

      {view === "profile" && (
        <ProfileView user={user} sets={sets} streak={streak} onBack={() => setView('dashboard')} onEdit={() => setView('profile_edit')} />
      )}

      {view === "profile_edit" && (
        <ProfileEditView user={user} onBack={() => setView('profile')} onSave={async (name, bio, imageData) => {
          await handleSaveProfile(name, bio, imageData);
          setView('profile');
        }} />
      )}

      {view === "detail" && currentSet && (
        <DetailView
          set={currentSet}
          user={user}
          onBack={() => setView("dashboard")}
          onLearn={() => setView("learn")}
          onQuiz={() => setView("quiz")}
          onAddCard={handleAddCard}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onImportCards={handleImportCards}
          onToggleVisibility={handleToggleSetVisibility}
          onDeleteSet={handleDeleteSet}
          onForkSet={handleForkSet}
        />
      )}

      {view === "learn" && currentSet && (
        <LearnView set={currentSet} onBack={() => setView("detail")} onCompleteSet={handleCompleteSet} />
      )}

      {view === "quiz" && currentSet && (
        <QuizView set={currentSet} onBack={() => setView("detail")} />
      )}
      {view === 'favorites' && user && (
        <FavoritesView onBack={() => setView('dashboard')} sets={sets} favorites={favorites} toggleFavorite={toggleFavorite} onOpenSet={(s) => { setCurrentSet(s); setView('detail'); }} />
      )}
      {view === 'leaderboard' && (
        <LeaderboardView onBack={() => setView('dashboard')} />
      )}
      {view === 'settings' && (
        <SettingsView onBack={() => setView('dashboard')} />
      )}

      {toast && (
        <div className={`sm-toast sm-toast-${toast.type}`}>
          {toast.type === 'success' && <Check size={16} />}
          {toast.type === 'error' && <X size={16} />}
          {toast.type === 'info' && <Sparkles size={16} />}
          {toast.message}
        </div>
      )}

      <GuidedTourOverlay
        active={tourActive}
        step={currentTourStep}
        viewName={tourCurrentView}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </div>
  </div>
  );
}
