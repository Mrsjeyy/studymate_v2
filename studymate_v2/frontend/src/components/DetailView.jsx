import { useState } from "react";
import { ArrowLeft, SquarePen, Globe, Lock, Brain, Zap, FlipHorizontal, X, Plus, Check, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import Spinner from "./Spinner";

export default function DetailView({ set, user, onBack, onLearn, onQuiz, onAddCard, onToggleVisibility, onDeleteSet, onDeleteCard, onEditCard, onMoveCard, onImportCards, onUpdateSetTitle, onForkSet, onShowToast }) {
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
  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [chosenShowAuthor, setChosenShowAuthor] = useState(true);

  const addCard = async () => {
    if (!newQ || !newA) return;
    setSaving(true); setAddErr("");
    try {
      const newCard = await onAddCard(set.id, newQ, newA);
      setCards(prev => [...prev, newCard]);
      setNewQ(""); setNewA(""); setShowAdd(false);
    } catch (e) { setAddErr(e.message || "Fehler beim Speichern."); }
    finally { setSaving(false); }
  };

  const openEditCard = (card) => {
    setEditCardId(card.id); setEditQ(card.q); setEditA(card.a); setEditErr(""); setShowEdit(true);
  };

  const saveEditCard = async () => {
    if (!editQ || !editA) return;
    setSaving(true); setEditErr("");
    try {
      await onEditCard(editCardId, editQ, editA);
      setCards(prev => prev.map(c => c.id === editCardId ? { ...c, q: editQ, a: editA } : c));
      setShowEdit(false);
    } catch (e) { setEditErr(e.message || "Fehler beim Speichern."); }
    finally { setSaving(false); }
  };

  const deleteCard = async (cardId) => {
    try {
      await onDeleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (e) {
      onShowToast?.(e.message || "Fehler beim Löschen.", 'error');
    }
  };

  const importCards = async () => {
    setImportLoading(true); setImportErr("");
    try {
      await onImportCards(set.id, importJson);
      const updated = JSON.parse(importJson);
      setCards(prev => [...prev, ...updated.map((u, i) => ({ id: `temp-${i}`, q: u.question, a: u.answer }))]);
      setImportJson(""); setShowImport(false);
    } catch (e) { setImportErr(e.message || "Fehler beim Importieren."); }
    finally { setImportLoading(false); }
  };

  const saveEditTitle = async () => {
    setEditTitleLoading(true);
    try { await onUpdateSetTitle(set.id, editTitle, editDescription); setShowEditTitle(false); }
    catch (e) { alert(e.message || "Fehler beim Speichern."); }
    finally { setEditTitleLoading(false); }
  };

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}><ArrowLeft size={15} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{set.title}</h2>
            {user && user.id === set.owneruserid && (
              <button className="sm-btn sm-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setShowEditTitle(true)} title="Titel bearbeiten"><SquarePen size={14} /></button>
            )}
            <span className={`sm-badge ${set.isPublic ? "sm-badge-public" : "sm-badge-private"}`} style={{ fontSize: 11 }}>
              {set.isPublic ? <><Globe size={10} /> Öffentlich</> : <><Lock size={10} /> Privat</>}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>{set.description}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button className="learn-btn sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={onLearn}><Brain size={15} /> Lernen starten</button>
        <button className="quiz-btn sm-btn sm-btn-ghost" style={{ justifyContent: "center", borderColor: "rgba(139,92,246,.3)", color: "#a78bfa" }} onClick={onQuiz}><Zap size={15} /> Quiz starten</button>
      </div>

      {user && set.isPublic && set.owneruserid !== user.id && (
        <button className="sm-btn sm-btn-ghost" style={{ justifyContent: "center", width: "100%", marginBottom: 20, borderColor: "rgba(0,212,170,.3)", color: "#00d4aa" }} onClick={() => onForkSet(set)}>
          <FlipHorizontal size={15} /> Set forken
        </button>
      )}

      {user && user.id === set.owneruserid && (
        <button className="sm-btn sm-btn-ghost" style={{ justifyContent: "center", width: "100%", marginBottom: 20, borderColor: "rgba(100,116,139,.3)", color: "#94a3b8" }} onClick={() => onForkSet(set)}>
          <FlipHorizontal size={15} /> Set kopieren
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <p className="sm-section-title" style={{ padding: 0 }}>{cards.length} Karten</p>
        {user && user.id === set.owneruserid && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => {
              if (!set.isPublic) { setChosenShowAuthor(set.showAuthor !== false); setShowAuthorDialog(true); }
              else onToggleVisibility(set.id, true, set.showAuthor);
            }}>
              {set.isPublic ? <Lock size={13} /> : <Globe size={13} />} {set.isPublic ? "Privat machen" : "Öffentlich machen"}
            </button>
            <button className="sm-btn sm-btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => onDeleteSet(set.id)}><X size={13} /> Set löschen</button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowAdd(!showAdd)}><Plus size={13} /> Karte hinzufügen</button>
            <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowImport(true)}><Plus size={13} /> Importieren</button>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="sm-panel-soft" style={{ border: "1px solid rgba(0,212,170,.2)", padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Neue Karte</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Frage..." value={newQ} onChange={e => setNewQ(e.target.value)} />
            <textarea className="sm-input" placeholder="Antwort..." value={newA} onChange={e => setNewA(e.target.value)} rows={3} style={{ resize: "vertical" }} />
            {addErr && <div style={{ fontSize: 13, color: "#f87171" }}>{addErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={addCard} disabled={saving}>
                {saving ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowAdd(false)}><X size={13} /> Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="sm-panel-soft" style={{ border: "1px solid rgba(139,92,246,.2)", padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Karten importieren</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 10px", lineHeight: 1.5 }}>
              JSON-Array mit Karten: <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 12 }}>question</code> und <code style={{ background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 12 }}>answer</code> Felder
            </p>
            <textarea className="sm-input" placeholder={`[{"question": "Frage 1?", "answer": "Antwort 1"}]`} value={importJson} onChange={e => setImportJson(e.target.value)} rows={5} style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
            {importErr && <div style={{ fontSize: 13, color: "#f87171" }}>{importErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={importCards} disabled={importLoading}>
                {importLoading ? <><Spinner size={12} color="#080c18" /> Importieren...</> : <><Check size={13} /> Importieren</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { setShowImport(false); setImportJson(""); setImportErr(""); }}><X size={13} /> Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="sm-panel-soft" style={{ border: "1px solid rgba(59,130,246,.2)", padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Karte bearbeiten</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Frage..." value={editQ} onChange={e => setEditQ(e.target.value)} />
            <textarea className="sm-input" placeholder="Antwort..." value={editA} onChange={e => setEditA(e.target.value)} rows={3} style={{ resize: "vertical" }} />
            {editErr && <div style={{ fontSize: 13, color: "#f87171" }}>{editErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={saveEditCard} disabled={saving}>
                {saving ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowEdit(false)}><X size={13} /> Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showEditTitle && (
        <div className="sm-panel-soft" style={{ border: "1px solid rgba(59,130,246,.2)", padding: 18, marginBottom: 14 }}>
          <p className="sm-section-title">Set bearbeiten</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="sm-input" placeholder="Titel..." value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <textarea className="sm-input" placeholder="Beschreibung..." value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sm-btn sm-btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={saveEditTitle} disabled={editTitleLoading}>
                {editTitleLoading ? <><Spinner size={12} color="#080c18" /> Speichern...</> : <><Check size={13} /> Speichern</>}
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setShowEditTitle(false)}><X size={13} /> Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map((c, i) => (
          <div key={c.id} className="sm-panel-soft" style={{ padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: `${set.accent}18`, border: `1px solid ${set.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: set.accent, fontFamily: "JetBrains Mono, monospace" }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 5px", color: "#e2e8f0" }}>{c.q}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{c.a}</p>
            </div>
            {user && user.id === set.owneruserid && (
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button className="sm-btn sm-btn-ghost" style={{ padding: "3px 7px", fontSize: 11 }} disabled={i === 0} onClick={() => { onMoveCard?.(set.id, c.id, "up"); setCards(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); }} title="Nach oben"><ChevronUp size={12} /></button>
                  <button className="sm-btn sm-btn-ghost" style={{ padding: "3px 7px", fontSize: 11 }} disabled={i === cards.length - 1} onClick={() => { onMoveCard?.(set.id, c.id, "down"); setCards(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); }} title="Nach unten"><ChevronDown size={12} /></button>
                </div>
                <button className="sm-btn sm-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => openEditCard(c)}><Sparkles size={13} /></button>
                <button className="sm-btn sm-btn-danger" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => deleteCard(c.id)}><X size={13} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAuthorDialog && (
        <div className="sm-modal-overlay" onClick={() => setShowAuthorDialog(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <h3>Set veröffentlichen</h3>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 18px" }}>Möchtest du als Autor angezeigt werden?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {[
                { value: true, label: `Als ${user?.name || 'du'} anzeigen`, desc: "Andere können dein Profil besuchen" },
                { value: false, label: "Anonym bleiben", desc: "Autor wird als 'Unbekannt' angezeigt" },
              ].map(opt => (
                <button key={String(opt.value)} onClick={() => setChosenShowAuthor(opt.value)} style={{ background: chosenShowAuthor === opt.value ? "rgba(0,212,170,.12)" : "rgba(255,255,255,.04)", border: `1px solid ${chosenShowAuthor === opt.value ? "rgba(0,212,170,.45)" : "rgba(255,255,255,.1)"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: chosenShowAuthor === opt.value ? "#00d4aa" : "#cbd5e1" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
            <div className="sm-modal-actions">
              <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowAuthorDialog(false); onToggleVisibility(set.id, false, chosenShowAuthor); }}>
                <Globe size={14} /> Veröffentlichen
              </button>
              <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAuthorDialog(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
