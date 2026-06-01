import { useState } from "react";
import { Shield, LogIn, Check, Globe, ArrowLeft } from "lucide-react";
import { supabase } from "../supabase";
import Spinner from "./Spinner";

export function AuthView({ onLogin, onRegister, onGuest, onForgotPassword }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const attempt = async (fn) => {
    setErr(""); setLoading(true);
    try { await fn(); } catch (e) { setErr(e.message || "Ein Fehler ist aufgetreten."); } finally { setLoading(false); }
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
              <button key={t} onClick={() => { setTab(t); setErr(""); setUsername(""); setPass(""); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span className={`sm-tab ${tab === t ? "active" : ""}`} style={{ display: "block", padding: "7px 0", textAlign: "center" }}>
                  {t === "login" ? "Anmelden" : "Registrieren"}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Benutzername</label>
              <input className="sm-input sm-mono" placeholder="dein_username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: "#64748b" }}>Passwort</label>
                {tab === "login" && (
                  <button onClick={onForgotPassword} style={{ fontSize: 12, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Passwort vergessen?</button>
                )}
              </div>
              <input className="sm-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            {tab === "register" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#64748b" }}>Recovery-Email</label>
                  <span style={{ fontSize: 11, color: "#475569" }}>optional – für Passwort-Reset</span>
                </div>
                <input className="sm-input" type="email" placeholder="deine@email.de" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} />
              </div>
            )}
            {err && <div style={{ fontSize: 13, color: "#f87171", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px" }}>{err}</div>}
            <button className="sm-btn sm-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={tab === "login" ? handleLogin : handleRegister} disabled={loading}>
              {loading ? <><Spinner size={14} color="#080c18" /> Bitte warten...</> : tab === "login" ? <><LogIn size={15} /> Anmelden</> : <><Check size={15} /> Konto erstellen</>}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div className="sm-divider" style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "#475569" }}>oder</span>
            <div className="sm-divider" style={{ flex: 1 }} />
          </div>
          <button className="sm-btn sm-btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onGuest} disabled={loading}>
            <Globe size={14} /> Als Gast fortfahren
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordView({ onBack }) {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!username) { setErr("Bitte Benutzername eingeben."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error("Fehler beim Senden.");
    } catch (e) { setErr(e.message); setLoading(false); return; }
    setLoading(false); setSent(true);
  };

  if (sent) return (
    <div style={{ display: "flex", minHeight: 600, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="sm-z sm-fadeup" style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Link gesendet!</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>Falls du eine Recovery-Email hinterlegt hast, prüfe dein Postfach (inkl. Spam).</p>
        <button className="sm-btn sm-btn-ghost" style={{ margin: "0 auto" }} onClick={onBack}><ArrowLeft size={14} /> Zurück zum Login</button>
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
              <input className="sm-input sm-mono" placeholder="dein_username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
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

export function ResetPasswordView({ onDone }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (!pass || !pass2) { setErr("Bitte beide Felder ausfüllen."); return; }
    if (pass.length < 6) { setErr("Passwort mindestens 6 Zeichen."); return; }
    if (pass !== pass2) { setErr("Passwörter stimmen nicht überein."); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) { setLoading(false); setErr(error.message); return; }
    await supabase.auth.signOut();
    setLoading(false); setDone(true);
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
              <input className="sm-input" type="password" placeholder="••••••••" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
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
