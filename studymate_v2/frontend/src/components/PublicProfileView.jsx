import { useState } from "react";
import { ArrowLeft, UserPlus, Check, BookOpen } from "lucide-react";
import Spinner from "./Spinner";

export default function PublicProfileView({ profile, sets, friendStatus, onBack, onSendFriendRequest, onOpenSet, loading }) {
  const username = profile?.username || profile?.name?.toLowerCase().replace(/\s+/g, '_') || '?';

  const statusBtn = () => {
    if (friendStatus === 'accepted') return (
      <div className="sm-btn sm-btn-ghost" style={{ cursor: "default", color: "#00d4aa", borderColor: "rgba(0,212,170,.3)" }}>
        <Check size={14} /> Befreundet
      </div>
    );
    if (friendStatus === 'pending_sent') return (
      <div className="sm-btn sm-btn-ghost" style={{ cursor: "default", color: "#64748b" }}>
        Anfrage gesendet
      </div>
    );
    if (friendStatus === 'pending_received') return (
      <div className="sm-btn sm-btn-ghost" style={{ cursor: "default", color: "#64748b" }}>
        Hat dir eine Anfrage gesendet
      </div>
    );
    return (
      <button className="sm-btn sm-btn-primary" onClick={onSendFriendRequest}>
        <UserPlus size={14} /> Freund hinzufügen
      </button>
    );
  };

  if (loading) return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, textAlign: "center", paddingTop: 80 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px", marginBottom: 24 }} onClick={onBack}>
        <ArrowLeft size={15} /> Zurück
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #00d4aa33, #8b5cf633)", border: "2px solid rgba(0,212,170,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#00d4aa", flexShrink: 0 }}>
            {profile?.initial || "?"}
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{profile?.name || "Unbekannt"}</div>
            <div style={{ fontSize: 14, color: "#64748b" }}>@{username}</div>
          </div>
        </div>
        {statusBtn()}
      </div>

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 14px" }}>Öffentliche Sets ({sets.length})</h3>
        {sets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
            <BookOpen size={36} style={{ margin: "0 auto 10px", opacity: .4 }} />
            <p style={{ fontSize: 14 }}>Keine öffentlichen Sets</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {sets.map(s => (
              <div key={s.id} className="sm-card" onClick={() => onOpenSet(s)} style={{ cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>{s.description}</p>
                <div style={{ fontSize: 12, color: "#475569" }}>{s.cards.length} Karten</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
