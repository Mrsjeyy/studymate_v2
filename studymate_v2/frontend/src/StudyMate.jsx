import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Brain, LogIn, LogOut, Plus, Search, ChevronRight,
  RotateCcw, ChevronLeft, Zap, Globe, ArrowLeft, Shield, Check, X,
  Sparkles, Target, FlipHorizontal, Lock,
} from "lucide-react";
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
  return date.toISOString().slice(0, 10);
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
  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(store));
}

function getStreakState(userKey) {
  const store = readStreakStore();
  return store[userKey] || { count: 0, lastCompletedDate: null };
}

function awardDailyStreak(userKey) {
  const today = toISODate();
  const yesterday = toISODate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const store = readStreakStore();
  const current = store[userKey] || { count: 0, lastCompletedDate: null };

  if (current.lastCompletedDate === today) {
    return current;
  }

  const nextCount = current.lastCompletedDate === yesterday ? current.count + 1 : 1;
  const nextState = { count: nextCount, lastCompletedDate: today };
  store[userKey] = nextState;
  writeStreakStore(store);
  return nextState;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .sm * { box-sizing: border-box; }
  .sm { font-family: 'Sora', system-ui, sans-serif; color: #f1f5f9; min-height: 600px; background: #080c18; position: relative; overflow: hidden; border-radius: 12px; }

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

  .sm-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 20px; cursor: pointer; transition: all .2s; }
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

  .sm-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
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

  @keyframes spin { to { transform: rotate(360deg); } }
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

function NavBar({ user, onHome, onLogout, onGoToLogin }) {
  return (
    <nav className="sm-nav">
      <div className="sm-logo" onClick={onHome}>
        <div className="sm-logo-icon">
          <Shield size={16} color="#080c18" strokeWidth={2.5} />
        </div>
        <span>Study<span style={{ color: "#00d4aa" }}>Mate</span></span>
        <span className="sm-mono" style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>// cyber</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <>
            <div className="sm-avatar">{user.initial}</div>
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

function DashboardView({ user, sets, setsLoading, onOpenSet, onCreateSet, createLoading, streak }) {
  const [tab, setTab] = useState("discover");
  const [search, setSearch] = useState("");

  const filtered = sets.filter(s => {
    if (tab === "mine" && s.owneruserid !== user?.id) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mineSets = sets.filter(s => s.owneruserid === user?.id);
  const totalCards = sets.reduce((acc, s) => acc + s.cards.length, 0);

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
            {user ? `Hey, ${user.name} 👾` : "Lernsets entdecken"}
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            {user ? "Bereit für deine nächste Session?" : "Melde dich an, um eigene Sets zu erstellen"}
          </p>
        </div>
        {user && (
          <button className="sm-btn sm-btn-primary" onClick={onCreateSet} disabled={createLoading}>
            {createLoading ? <Spinner size={14} color="#080c18" /> : <Plus size={15} />}
            {createLoading ? "Erstellen..." : "Neues Set"}
          </button>
        )}
      </div>

      {user && (
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
          <input className="sm-input" style={{ paddingLeft: 40 }} placeholder="Sets suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {user && (
          <div style={{ display: "flex", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 3, gap: 3 }}>
            {["discover", "mine"].map(t => (
              <button key={t} className={`sm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)} style={{ padding: "6px 14px", fontSize: 13 }}>
                {t === "discover" ? "Entdecken" : "Meine Sets"}
              </button>
            ))}
          </div>
        )}
      </div>

      {setsLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
          <Spinner size={28} />
          <p style={{ fontSize: 14, marginTop: 16 }}>Sets werden geladen...</p>
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

function DetailView({ set, user, onBack, onLearn, onQuiz, onAddCard }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [cards, setCards] = useState(set.cards);
  const [saving, setSaving] = useState(false);
  const [addErr, setAddErr] = useState("");

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

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{set.title}</h2>
            <span className={`sm-badge ${set.isPublic ? "sm-badge-public" : "sm-badge-private"}`} style={{ fontSize: 11 }}>
              {set.isPublic ? <><Globe size={10} /> Öffentlich</> : <><Lock size={10} /> Privat</>}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>{set.description}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={onLearn}>
          <Brain size={15} />
          Lernen starten
        </button>
        <button className="sm-btn sm-btn-ghost" style={{ justifyContent: "center", borderColor: "rgba(139,92,246,.3)", color: "#a78bfa" }} onClick={onQuiz}>
          <Zap size={15} />
          Quiz starten
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p className="sm-section-title" style={{ padding: 0 }}>{cards.length} Karten</p>
        {user && user.id === set.owneruserid && (
          <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowAdd(!showAdd)}>
            <Plus size={13} />
            Karte hinzufügen
          </button>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map((c, i) => (
          <div key={c.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: `${set.accent}18`, border: `1px solid ${set.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: set.accent, fontFamily: "JetBrains Mono, monospace" }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 5px", color: "#e2e8f0" }}>{c.q}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{c.a}</p>
            </div>
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
        onCompleteSet?.(set.id);
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
        <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setQIdx(0); setSelected(null); setScore(0); setPhase("quiz"); }}>
          <Zap size={15} /> Standard-Quiz starten
        </button>
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

// ── Root ──────────────────────────────────────────────────────────────────────

export default function StudyMate() {
  const [view, setView] = useState("loading");
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [currentSet, setCurrentSet] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const recoveryMode = useRef(false);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = styles;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    const key = user?.id || "guest";
    setStreak(getStreakState(key).count);
  }, [user?.id]);

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
        setView("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initUser = async (authUser) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, displayname")
      .eq("id", authUser.id)
      .single();

    const name = profile?.displayname || profile?.username || authUser.email.split("@")[0];
    setUser({ id: authUser.id, email: authUser.email, name, initial: name[0].toUpperCase() });
    setView("dashboard");
    await fetchSets(authUser.id);
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

  const handleCreateSet = async () => {
    if (!user) {
      alert("Bitte melde dich an, um ein neues Set zu erstellen.");
      setView("auth");
      return;
    }

    const title = window.prompt("Titel für dein neues Set eingeben:");
    if (!title?.trim()) return;

    setCreateLoading(true);

    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .insert({
          owneruserid: user.id,
          title: title.trim(),
          description: "",
          ispublic: false,
        })
        .select("*, flashcards(*)")
        .single();

      if (error) throw error;

      const newSet = normalizeSet({ ...data, profiles: { username: user.name, displayname: user.name } });
      setSets(prev => [newSet, ...prev]);
      setCurrentSet(newSet);
      setView("detail");
    } catch (e) {
      const message = e?.message || String(e) || "Fehler beim Erstellen des Sets.";
      alert(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const goHome = () => setView("dashboard");

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
    <div className="sm">
      <div className="sm-grid" />
      <div className="sm-glow" style={{ width: 500, height: 500, background: "rgba(0,212,170,.04)", top: -150, right: -100 }} />
      <div className="sm-glow" style={{ width: 400, height: 400, background: "rgba(139,92,246,.04)", bottom: -100, left: -80 }} />

      {view !== "auth" && view !== "forgot" && view !== "reset" && (
        <NavBar user={user} onHome={goHome} onLogout={handleLogout} onGoToLogin={() => setView("auth")} />
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
          createLoading={createLoading}
          streak={streak}
        />
      )}

      {view === "detail" && currentSet && (
        <DetailView
          set={currentSet}
          user={user}
          onBack={() => setView("dashboard")}
          onLearn={() => setView("learn")}
          onQuiz={() => setView("quiz")}
          onAddCard={handleAddCard}
        />
      )}

      {view === "learn" && currentSet && (
        <LearnView set={currentSet} onBack={() => setView("detail")} onCompleteSet={handleCompleteSet} />
      )}

      {view === "quiz" && currentSet && (
        <QuizView set={currentSet} onBack={() => setView("detail")} />
      )}
    </div>
  );
}
