import { useState } from "react";
import { UserPlus, Check, X, Users, Search, Trash2 } from "lucide-react";
import Spinner from "./Spinner";

export default function FriendsView({ user, friends, pendingReceived, pendingSent, onAccept, onDecline, onRemoveFriend, onOpenProfile, onSearchUsers, onSendFriendRequest }) {
  const [tab, setTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await onSearchUsers(q.trim());
    setSearchResults(results);
    setSearching(false);
  };

  const getFriendStatus = (userId) => {
    if (friends.find(f => f.userId === userId)) return 'accepted';
    if (pendingSent.find(f => f.userId === userId)) return 'pending_sent';
    if (pendingReceived.find(f => f.userId === userId)) return 'pending_received';
    return null;
  };

  const tabs = [
    { id: "friends", label: `Freunde (${friends.length})` },
    { id: "search", label: "Suchen" },
    { id: "requests", label: `Anfragen${pendingReceived.length > 0 ? ` (${pendingReceived.length})` : ''}` },
  ];

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Freunde</h2>
        {pendingReceived.length > 0 && (
          <span style={{ background: "#ef4444", color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 700, padding: "2px 8px" }}>
            {pendingReceived.length} neu
          </span>
        )}
      </div>

      <div style={{ display: "flex", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 3, gap: 3, marginBottom: 20, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} className={`sm-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} style={{ padding: "6px 16px", fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Freundesliste ── */}
      {tab === "friends" && (
        friends.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
            <Users size={40} style={{ margin: "0 auto 12px", opacity: .4 }} />
            <p style={{ fontSize: 15 }}>Noch keine Freunde</p>
            <p style={{ fontSize: 13, color: "#334155" }}>Suche nach Nutzern um jemanden hinzuzufügen.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {friends.map(f => (
              <div key={f.friendshipId} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #00d4aa33, #8b5cf633)", border: "1px solid rgba(0,212,170,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#00d4aa", flexShrink: 0 }}>
                  {f.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>@{f.username}</div>
                </div>
                <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onOpenProfile(f.userId)}>
                  Profil ansehen
                </button>
                <button className="sm-btn sm-btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onRemoveFriend(f.friendshipId, f.name)} title="Freund entfernen">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Nutzer suchen ── */}
      {tab === "search" && (
        <div>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
            <input
              className="sm-input"
              style={{ paddingLeft: 40 }}
              placeholder="Benutzername suchen..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searching && <div style={{ textAlign: "center", padding: 24 }}><Spinner size={20} /></div>}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <p style={{ fontSize: 14 }}>Kein Nutzer gefunden</p>
            </div>
          )}

          {!searching && searchQuery.length < 2 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <Search size={32} style={{ margin: "0 auto 10px", opacity: .3 }} />
              <p style={{ fontSize: 14 }}>Mindestens 2 Zeichen eingeben</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {searchResults.map(r => {
              const status = getFriendStatus(r.userId);
              return (
                <div key={r.userId} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #00d4aa33, #8b5cf633)", border: "1px solid rgba(0,212,170,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#00d4aa", flexShrink: 0 }}>
                    {r.initial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>@{r.username}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onOpenProfile(r.userId)}>
                      Profil
                    </button>
                    {status === 'accepted' && (
                      <div style={{ fontSize: 13, color: "#00d4aa", display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> Befreundet</div>
                    )}
                    {status === 'pending_sent' && (
                      <div style={{ fontSize: 13, color: "#64748b" }}>Anfrage gesendet</div>
                    )}
                    {status === 'pending_received' && (
                      <button className="sm-btn sm-btn-primary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onAccept(pendingReceived.find(f => f.userId === r.userId)?.friendshipId)}>
                        <Check size={13} /> Annehmen
                      </button>
                    )}
                    {!status && (
                      <button className="sm-btn sm-btn-primary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onSendFriendRequest(r.userId)}>
                        <UserPlus size={13} /> Hinzufügen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Anfragen ── */}
      {tab === "requests" && (
        pendingReceived.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
            <UserPlus size={40} style={{ margin: "0 auto 12px", opacity: .4 }} />
            <p style={{ fontSize: 15 }}>Keine offenen Anfragen</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingReceived.map(r => (
              <div key={r.friendshipId} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(0,212,170,.15)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #00d4aa33, #8b5cf633)", border: "1px solid rgba(0,212,170,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#00d4aa", flexShrink: 0 }}>
                  {r.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>möchte dich als Freund hinzufügen</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sm-btn sm-btn-primary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onAccept(r.friendshipId)}>
                    <Check size={14} /> Annehmen
                  </button>
                  <button className="sm-btn sm-btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onDecline(r.friendshipId)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
