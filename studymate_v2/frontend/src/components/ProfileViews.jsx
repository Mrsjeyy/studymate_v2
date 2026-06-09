import { useState } from "react";
import { ArrowLeft, Star } from "lucide-react";

export function ProfileView({ user, sets, streak, onBack, onEdit, onViewAllSets }) {
  const allOwnSets = sets.filter(s => s.owneruserid === user?.id);
  const ownSets = allOwnSets.filter(s => !s.forkedFrom);
  const totalCards = allOwnSets.reduce((sum, set) => sum + (set.cards?.length || 0), 0);
  const username = user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : 'gast';
  const previewSets = ownSets.slice(0, 4);

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '1px solid rgba(0,212,170,.20)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
            {user?.imageData
              ? <img src={user.imageData} alt="Profilbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 700, color: '#080c18' }}>{user?.initial}</div>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{user?.name || 'Unbekannt'}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 14 }}>@{username}</div>
            <div style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>{user?.bio || 'Lernen. Verstehen. Wiederholen. ✨'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="sm-btn sm-btn-primary" style={{ minWidth: 180, justifyContent: 'center' }} onClick={onEdit}>Profil bearbeiten</button>
          <button className="sm-btn sm-btn-ghost" onClick={onBack} style={{ minWidth: 180, justifyContent: 'center' }}>Zurück zur Übersicht</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="sm-stat" style={{ padding: 22 }}><div className="sm-stat-num" style={{ color: '#00d4aa' }}>{totalCards}</div><div className="sm-stat-label">Karteikarten</div></div>
        <div className="sm-stat" style={{ padding: 22 }}><div className="sm-stat-num" style={{ color: '#8b5cf6' }}>{ownSets.length}</div><div className="sm-stat-label">Karteikartensets</div></div>
        <div className="sm-stat" style={{ padding: 22 }}><div className="sm-stat-num" style={{ color: '#f59e0b' }}>{streak || 0}</div><div className="sm-stat-label">Tage am Stück</div></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Meine Karteikartensets</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Schnell zu deinen letzten Sets.</p>
        </div>
        <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13 }} onClick={onViewAllSets ?? onBack}>Alle anzeigen</button>
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
            <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: 13 }}>Zuletzt gelernt: heute</div>
          </div>
        ))}
        {previewSets.length === 0 && <div className="sm-card" style={{ gridColumn: '1 / -1', color: '#64748b' }}>Keine Sets verfügbar.</div>}
      </div>
    </div>
  );
}

export function ProfileEditView({ user, onBack, onSave }) {
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [imageData, setImageData] = useState(user?.imageData || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    if (!displayName.trim()) { setError("Bitte gib einen Anzeigenamen ein."); return; }
    setSaving(true);
    try { await onSave(displayName.trim(), bio.trim(), imageData); }
    catch (err) { setError(err?.message || "Speichern fehlgeschlagen."); }
    finally { setSaving(false); }
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
              {imageData
                ? <img src={imageData} alt="Profilbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#cbd5e1', display: 'grid', placeItems: 'center', color: '#475569', fontSize: 28, fontWeight: 700 }}>{user?.initial}</div>
              }
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="sm-btn sm-btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                Bild ändern<input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <button className="sm-btn sm-btn-ghost" type="button" onClick={() => setImageData(null)}>Entfernen</button>
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
            <button className="sm-btn sm-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FavoritesView({ onBack, sets = [], favorites = [], toggleFavorite, onOpenSet }) {
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
              <button className={`sm-fav-btn ${favorites.includes(set.id) ? 'active' : ''}`} onClick={() => toggleFavorite(set.id)} title="Aus Favoriten entfernen"><Star size={14} /></button>
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
