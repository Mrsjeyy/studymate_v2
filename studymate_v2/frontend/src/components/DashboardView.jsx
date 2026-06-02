import { useState, useEffect, useRef } from "react";
import { Plus, Search, BookOpen, Globe, Lock, FlipHorizontal, ChevronRight, Star, Sparkles, Brain } from "lucide-react";
import Spinner from "./Spinner";
import WeeklyActivityChart from "./WeeklyActivityChart";

export default function DashboardView({ user, sets, setsLoading, onOpenSet, onCreateSet, createLoading, initialTab, favorites = [], toggleFavorite, onTabChange, streak, activityData = {}, onRequireAuth, onForkSet, onOpenUserProfile }) {
  const [tab, setTab] = useState(initialTab || "discover");
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => { setTab(initialTab || "discover"); }, [initialTab]);
  useEffect(() => { if (tab === 'discover') setTimeout(() => searchRef.current?.focus(), 80); }, [tab]);

  const filtered = sets.filter(s => {
    if (tab === "mine" && s.owneruserid !== user?.id) return false;
    if (tab === "discover" && !s.isPublic) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mineSets = sets.filter(s => s.owneruserid === user?.id);
  const totalCards = sets.reduce((acc, s) => acc + s.cards.length, 0);
  const suggestions = sets.filter(s => s.isPublic && s.owneruserid !== user?.id).slice(0, 6);

  const CreateBtn = () => user ? (
    <button className="sm-create-btn sm-btn sm-btn-primary" onClick={onCreateSet} disabled={createLoading}>
      {createLoading ? <Spinner size={14} color="#080c18" /> : <Plus size={15} />}
      {createLoading ? "Erstellen..." : "Neues Set"}
    </button>
  ) : null;

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      {tab === 'mine' ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Meine Sets</h2><p style={{ color: "#64748b", fontSize: 13, margin: '6px 0 0' }}>Nur deine eigenen Sets werden hier angezeigt.</p></div>
          <CreateBtn />
        </div>
      ) : tab === 'discover' ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Entdecken</h2><p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Suche nach öffentlichen Sets von anderen Lernenden.</p></div>
          <CreateBtn />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Dashboard</h2><p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Dein Arbeitsbereich mit Fortschritt, Statistiken und deinen Sets.</p></div>
          <CreateBtn />
        </div>
      )}

      {user && tab === 'dashboard' && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
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
          <div style={{ marginBottom: 24 }}>
            <WeeklyActivityChart activityData={activityData} />
          </div>
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
          <input ref={searchRef} className="sm-input" style={{ paddingLeft: 40 }} placeholder={tab === 'discover' ? "Nach öffentlichen Sets suchen..." : "Sets suchen..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {user && (
          <div className="sm-panel-soft" style={{ display: "flex", borderRadius: 10, padding: 3, gap: 3 }}>
            {["dashboard", "discover", "mine"].map(t => (
              <button key={t} className={`sm-tab ${t === "discover" ? "discover-tab-btn" : t === "mine" ? "mine-tab-btn" : ""} ${tab === t ? "active" : ""}`} onClick={() => { setTab(t); onTabChange?.(t); }} style={{ padding: "6px 14px", fontSize: 13 }}>
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
          <Spinner size={28} /><p style={{ fontSize: 14, marginTop: 16 }}>Sets werden geladen...</p>
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
          <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: .4 }} /><p style={{ fontSize: 15 }}>Keine Sets gefunden</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map(set => (
            <div key={set.id} className="sm-card" onClick={() => onOpenSet(set)} style={{ position: "relative", overflow: "hidden" }}>
              {user && set.isPublic && set.owneruserid !== user.id && (
                <button className="fork-btn" onClick={(e) => { e.stopPropagation(); onForkSet?.(set); }} style={{ position: "absolute", top: 8, right: 50, background: "transparent", border: "none", color: "#00d4aa", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", height: "32px", zIndex: 20 }} title="Dieses Set forken">
                  <FlipHorizontal size={14} /> Fork
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
                  <BookOpen size={12} /> {set.cards.length} Karten
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#475569", cursor: set.showAuthor && set.owneruserid !== user?.id ? "pointer" : "default" }}
                  onClick={e => { if (set.showAuthor && set.owneruserid !== user?.id) { e.stopPropagation(); onOpenUserProfile?.(set.owneruserid); } }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${set.accent}22`, border: `1px solid ${set.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: set.accent }}>{set.authorInitial}</div>
                  <span style={{ textDecoration: set.showAuthor && set.owneruserid !== user?.id ? "underline" : "none" }}>{set.author}</span>
                </div>
                <ChevronRight size={16} style={{ color: "#475569" }} />
              </div>
            </div>
          ))}
          {user && tab === "mine" && (
            <div style={{ border: "1.5px dashed rgba(0,212,170,.2)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 180, transition: "all .2s" }} onClick={onCreateSet} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,212,170,.5)"; e.currentTarget.style.background = "rgba(0,212,170,.04)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,212,170,.2)"; e.currentTarget.style.background = "transparent"; }}>
              <Plus size={28} style={{ color: "#00d4aa", opacity: .6 }} />
              <span style={{ fontSize: 14, color: "#64748b" }}>Neues Set erstellen</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
