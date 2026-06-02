import { useState } from "react";
import { ArrowLeft, RotateCcw, FlipHorizontal, Check, X, ChevronLeft, Target, Sparkles, Zap, Brain, ChevronRight } from "lucide-react";
import Spinner from "./Spinner";

export function LearnView({ set, onBack, onCompleteSet }) {
  const [sessionCards, setSessionCards] = useState(set.cards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statusByCard, setStatusByCard] = useState({});
  const [finished, setFinished] = useState(false);

  const card = sessionCards[idx];
  const progress = sessionCards.length ? (idx / sessionCards.length) * 100 : 0;
  const summaryUnknown = sessionCards.filter(c => statusByCard[c.id] === "unknown");
  const knownCount = Object.values(statusByCard).filter(status => status === "known").length;

  const restartSession = (repeatUnknown = false) => {
    const nextCards = repeatUnknown ? sessionCards.filter(c => statusByCard[c.id] === "unknown") : set.cards;
    setSessionCards(nextCards);
    setIdx(0);
    setFlipped(false);
    setStatusByCard({});
    setFinished(false);
  };

  const finishSession = () => {
    setFinished(true);
    onCompleteSet?.(knownCount);
  };

  const next = (knew) => {
    if (!card) return;
    setFlipped(false);
    setStatusByCard(prev => ({ ...prev, [card.id]: knew ? "known" : "unknown" }));

    setTimeout(() => {
      if (idx + 1 >= sessionCards.length) {
        finishSession();
        setIdx(-1);
      } else {
        setIdx(idx + 1);
      }
    }, 100);
  };

  if (idx === -1) return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Session beendet!</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          Du hast {knownCount} von {sessionCards.length} Karten als bekannt markiert.
          {summaryUnknown.length > 0 ? ` Die ${summaryUnknown.length} nicht gewussten Karten erscheinen weiter unten.` : " Alle Karten waren bekannt."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#00d4aa" }}>{knownCount}</div><div className="sm-stat-label">Gewusst</div></div>
          <div className="sm-stat"><div className="sm-stat-num" style={{ color: "#ef4444" }}>{sessionCards.length - knownCount}</div><div className="sm-stat-label">Nicht gewusst</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <button className="sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={() => restartSession(false)}><RotateCcw size={14} /> Alles wiederholen</button>
          <button className="sm-btn sm-btn-ghost" style={{ justifyContent: "center" }} onClick={onBack}><ArrowLeft size={14} /> Zurück</button>
        </div>

        {summaryUnknown.length > 0 && (
          <button className="sm-btn sm-btn-ghost" style={{ width: "100%", justifyContent: "center", marginBottom: 20 }} onClick={() => restartSession(true)}>
            <Sparkles size={14} /> Nur nicht gewusste Karten wiederholen
          </button>
        )}

        {summaryUnknown.length > 0 && (
          <div style={{ textAlign: "left", width: "100%", maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Unbekannte Karten</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {summaryUnknown.map((cardItem) => (
                <div key={cardItem.id} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(148,163,184,.2)", borderRadius: 14, padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Frage</p>
                  <p style={{ margin: "6px 0 10px", fontWeight: 600 }}>{cardItem.q}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Antwort</p>
                  <p style={{ margin: "6px 0 0", fontWeight: 600 }}>{cardItem.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (sessionCards.length === 0) return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500 }}>
      <div style={{ textAlign: "center", maxWidth: 340 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Keine Karten verfügbar</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Für diese Lernsession sind keine Karten geladen. Bitte gehe zurück und wähle ein Set aus.</p>
        <button className="sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={onBack}><ArrowLeft size={14} /> Zurück</button>
      </div>
    </div>
  );

  return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 780, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px" }} onClick={onBack}><ArrowLeft size={15} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{set.title}</span>
            <span className="sm-mono" style={{ fontSize: 13, color: "#00d4aa" }}>{idx + 1} / {sessionCards.length}</span>
          </div>
          <div className="sm-progress-bar"><div className="sm-progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="sm-flip-scene" style={{ marginBottom: 16 }}>
        <div className={`sm-flip-card ${flipped ? "flipped" : ""}`} style={{ height: 380 }} onClick={() => setFlipped(!flipped)}>
          <div className="sm-flip-face" style={{ height: "100%", background: "rgba(255,255,255,.05)", border: `1px solid ${flipped ? "rgba(255,255,255,.08)" : `${set.accent}30`}`, borderRadius: 24, padding: "40px 48px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: set.accent, display: "inline-block" }} /> Frage
            </div>
            <p style={{ fontSize: 22, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.55, margin: 0 }}>{card.q}</p>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 32, display: "flex", alignItems: "center", gap: 6 }}><FlipHorizontal size={14} /> Klicken zum Umdrehen</p>
          </div>
          <div className="sm-flip-face sm-flip-back" style={{ height: "100%", background: `${set.accent}10`, border: `1px solid ${set.accent}40`, borderRadius: 24, padding: "40px 48px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: set.accent, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}><Check size={13} /> Antwort</div>
            <p style={{ fontSize: 18, color: "#e2e8f0", lineHeight: 1.7, margin: 0 }}>{card.a}</p>
          </div>
        </div>
      </div>

      {flipped ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="sm-btn sm-btn-danger" style={{ justifyContent: "center" }} onClick={() => next(false)}><X size={15} /> Nicht gewusst</button>
          <button className="sm-btn sm-btn-primary" style={{ justifyContent: "center" }} onClick={() => next(true)}><Check size={15} /> Gewusst!</button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button className="sm-btn sm-btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft size={15} /> Zurück</button>
          <button className="sm-btn sm-btn-ghost" style={{ padding: "10px 20px" }} onClick={() => setFlipped(true)}>Aufdecken</button>
        </div>
      )}
    </div>
  );
}

export function QuizView({ set, onBack }) {
  const [phase, setPhase] = useState("intro");
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
    setShowExpl(false); setSelected(null);
    if (!aiQuestions || qIdx + 1 >= aiQuestions.length) { setQuizMode("ai"); setPhase("result"); }
    else setQIdx(q => q + 1);
  };

  const generateAIQuiz = async () => {
    setAiLoading(true); setAiError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/quiz/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: set.cards.map(c => ({ q: c.q, a: c.a })), count: 5 }),
      });
      if (res.status === 503) throw new Error("KI-Dienst nicht verfügbar. Bitte später erneut versuchen.");
      if (!res.ok) throw new Error("Generierung fehlgeschlagen.");
      const data = await res.json();
      setAiQuestions(data.questions);
      setQIdx(0); setSelected(null); setScore(0); setShowExpl(false); setPhase("aiquiz");
    } catch (e) { setAiError(e.message); }
    finally { setAiLoading(false); }
  };

  if (phase === "intro") return (
    <div className="sm-z sm-fadeup" style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <button className="sm-btn sm-btn-ghost" style={{ padding: "8px 12px", marginBottom: 20 }} onClick={onBack}><ArrowLeft size={15} /></button>
      <div className="sm-panel-soft" style={{ border: "1px solid rgba(139,92,246,.25)", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: "rgba(139,92,246,.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={22} color="#a78bfa" /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quiz – {set.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{shuffled.length} Fragen · Multiple Choice</p>
          </div>
        </div>
        <div className="sm-panel-soft" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Sparkles size={14} color="#a78bfa" /><span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>KI-Quizgenerierung</span></div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>KI erstellt neue Fragen auf Basis deiner Karten – mit Erklärungen nach jeder Antwort.</p>
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
              <Sparkles size={12} color="#a78bfa" /><span style={{ fontSize: 12, color: "#a78bfa" }}>KI-Quiz</span>
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
          <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setPhase("intro"); setQIdx(0); setSelected(null); setScore(0); setShowExpl(false); setAiError(""); }}><RotateCcw size={14} /> Nochmal</button>
          <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={onBack}><ArrowLeft size={14} /> Zurück</button>
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}><Sparkles size={12} color="#a78bfa" /><span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>KI-generierte Frage</span></div>
        <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: "24px 28px", marginBottom: 16, minHeight: 100, display: "flex", alignItems: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{q.question}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {q.options.map((opt, i) => {
            let cls = "sm-answer-btn";
            if (selected !== null) { if (i === q.correct) cls += " correct"; else if (i === selected && i !== q.correct) cls += " wrong"; }
            return (
              <button key={i} className={cls} onClick={() => aiPick(i)} disabled={selected !== null}>
                <span className="sm-mono" style={{ color: selected !== null && i === q.correct ? "#00d4aa" : selected !== null && i === selected ? "#f87171" : "#475569", marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
        {showExpl && (
          <div style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><Brain size={13} color="#a78bfa" /><span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Erklärung</span></div>
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
          if (selected !== null) { if (ans.correct) cls += " correct"; else if (i === selected && !ans.correct) cls += " wrong"; }
          return (
            <button key={i} className={cls} onClick={() => stdPick(i)} disabled={selected !== null}>
              <span className="sm-mono" style={{ color: selected !== null && ans.correct ? "#00d4aa" : selected !== null && i === selected ? "#f87171" : "#475569", marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>
              {ans.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
