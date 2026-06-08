import { LogIn, LogOut, HelpCircle, Sun, Moon, Shield, Menu } from "lucide-react";

export default function NavBar({ user, onHome, onLogout, onGoToLogin, theme, onToggleTheme, onProfile, onTourRestart, currentViewHasTour }) {
  return (
    <nav className="sm-nav">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="sm-logo" onClick={onHome}>
          <div className="sm-logo-icon">
            <Shield size={16} color="#080c18" strokeWidth={2.5} />
          </div>
          <span>Study<span style={{ color: "#00d4aa" }}>Mate</span></span>
          <span className="sm-mono" style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>// cyber</span>
        </div>
        <button className="sm-hamburger" aria-label="Menü öffnen" onClick={e => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('toggle-sidebar')); }} style={{ marginLeft: 6 }}>
          <Menu size={16} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {currentViewHasTour && (
          <button className="sm-btn sm-btn-ghost" onClick={onTourRestart} title="Tour für diese Ansicht starten" style={{ padding: "7px 10px", fontSize: 13, color: "#00d4aa", gap: 5 }}>
            <HelpCircle size={14} />
            <span style={{ fontSize: 12 }}>Tour</span>
          </button>
        )}
        <button className="sm-btn sm-btn-ghost" onClick={onToggleTheme} title="Theme umschalten" style={{ padding: "7px 10px", fontSize: 13 }}>
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        {user ? (
          <>
            <button className="sm-avatar" onClick={onProfile} title="Profil ansehen" style={{ border: 'none', background: 'linear-gradient(135deg, #00d4aa33, #8b5cf633)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {user.imageData ? <img src={user.imageData} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.initial}
            </button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={onLogout}>
              <LogOut size={14} /> Logout
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "#475569" }}>Gastmodus</span>
            <button className="sm-btn sm-btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} onClick={onGoToLogin}>
              <LogIn size={14} /> Anmelden
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
