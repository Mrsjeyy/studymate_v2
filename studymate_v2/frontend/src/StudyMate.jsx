import { useState, useEffect, useRef } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { supabase } from "./supabase";

// ── Utils
import { toISODate, getDaysSince } from "./utils/dates";
import { getStreakState, awardDailyStreak } from "./utils/streak";
import { recordActivity } from "./utils/activity";
import { normalizeSet } from "./utils/sets";

// ── Constants / Styles
import styles from "./styles";
import { TOUR_STEPS } from "./constants/tour";

// ── Components
import Spinner from "./components/Spinner";
import NavBar from "./components/NavBar";
import Sidebar from "./components/Sidebar";
import GuidedTourOverlay from "./components/GuidedTour";
import { AuthView, ForgotPasswordView } from "./components/AuthViews";
import DashboardView from "./components/DashboardView";
import DetailView from "./components/DetailView";
import { LearnView, QuizView } from "./components/LearningViews";
import { ProfileView, ProfileEditView, FavoritesView } from "./components/ProfileViews";
import FriendsView from "./components/FriendsView";
import PublicProfileView from "./components/PublicProfileView";

// ── Profile settings (localStorage, not Supabase — stores bio/avatar locally)

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

// ── Root component ────────────────────────────────────────────────────────────

export default function StudyMate() {
  const [view, setView] = useState("dashboard");
  const [appInitializing, setAppInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [currentSet, setCurrentSet] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [activityData, setActivityData] = useState({});
  const activityDataRef = useRef({});
  const streakRef = useRef(0);
  const [showCreateSetDialog, setShowCreateSetDialog] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('discover');
  const [favorites, setFavorites] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [publicProfileUser, setPublicProfileUser] = useState(null);
  const [publicProfileSets, setPublicProfileSets] = useState([]);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfileFrom, setPublicProfileFrom] = useState('dashboard');
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [forkSourceSet, setForkSourceSet] = useState(null);
  const [forkTitle, setForkTitle] = useState("");
  const [forkDescription, setForkDescription] = useState("");
  const [forkError, setForkError] = useState("");
  const [forkLoading, setForkLoading] = useState(false);
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
    } catch (e) { return {}; }
  });

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // ── Tour ───────────────────────────────────────────────────────────────────

  const startTour = (viewName) => {
    setTourCurrentView(viewName);
    setCurrentTourStep(0);
    setTourActive(true);
  };

  const skipTour = () => { if (tourCurrentView) finishTour(tourCurrentView); };

  const nextStep = () => {
    if (!tourCurrentView) return;
    const steps = TOUR_STEPS[tourCurrentView];
    if (currentTourStep < steps.length - 1) setCurrentTourStep(prev => prev + 1);
    else finishTour(tourCurrentView);
  };

  const prevStep = () => { if (currentTourStep > 0) setCurrentTourStep(prev => prev - 1); };

  const finishTour = (viewName) => {
    const updated = { ...tourCompleted, [viewName]: { completed: true, completedAt: new Date().toISOString() } };
    localStorage.setItem('sm_tour_completed', JSON.stringify(updated));
    setTourCompleted(updated);
    setTourActive(false);
    setTourCurrentView(null);
    setCurrentTourStep(0);
  };

  // ── Refs sync ──────────────────────────────────────────────────────────────
  useEffect(() => { activityDataRef.current = activityData; }, [activityData]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = styles;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  useEffect(() => {
    // For guests only — logged-in users get their streak from Supabase in initUser
    if (user) return;
    const refreshStreak = () => setStreak(getStreakState("guest").count);
    refreshStreak();
    const id = window.setInterval(refreshStreak, 60 * 1000);
    return () => window.clearInterval(id);
  }, [user?.id]);

  useEffect(() => {
    try { localStorage.setItem('sm_theme', theme); } catch (e) {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    if (user && view === 'dashboard' && !tourCompleted.dashboard && !tourActive) {
      setTimeout(() => startTour('dashboard'), 800);
    }
  }, [view, user, tourCompleted.dashboard, tourActive]);

  useEffect(() => {
    if (view === 'detail' && !tourCompleted.detail && !tourActive) {
      setTimeout(() => startTour('detail'), 600);
    }
  }, [view, tourCompleted.detail, tourActive]);

  useEffect(() => {
    if (view === 'learn' && !tourCompleted.learn && !tourActive) {
      setTimeout(() => startTour('learn'), 600);
    }
  }, [view, tourCompleted.learn, tourActive]);

  useEffect(() => {
    if (view === 'quiz' && !tourCompleted.quiz && !tourActive) {
      setTimeout(() => startTour('quiz'), 600);
    }
  }, [view, tourCompleted.quiz, tourActive]);

  useEffect(() => {
    if (view === 'favorites' && !tourCompleted.favorites && !tourActive) {
      setTimeout(() => startTour('favorites'), 600);
    }
  }, [view, tourCompleted.favorites, tourActive]);

  useEffect(() => {
    if (view === 'friends' && !tourCompleted.friends && !tourActive) {
      setTimeout(() => startTour('friends'), 600);
    }
  }, [view, tourCompleted.friends, tourActive]);

  useEffect(() => {
    if (view === 'profile' && !tourCompleted.profile && !tourActive) {
      setTimeout(() => startTour('profile'), 600);
    }
  }, [view, tourCompleted.profile, tourActive]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setSets([]); setView("auth"); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) initUser(session.user).finally(() => setAppInitializing(false));
      else { setView("dashboard"); fetchSets(null).finally(() => setAppInitializing(false)); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setSidebarOpenMobile(s => !s);
    document.addEventListener('toggle-sidebar', handler);
    return () => document.removeEventListener('toggle-sidebar', handler);
  }, []);

  useEffect(() => {
    try {
      const key = user ? `sm_favs_${user.id}` : "sm_favs_guest";
      const raw = localStorage.getItem(key);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch (e) { setFavorites([]); }
  }, [user?.id]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const toggleFavorite = (setId) => {
    const key = user ? `sm_favs_${user.id}` : "sm_favs_guest";
    setFavorites(prev => {
      const s = new Set(prev);
      if (s.has(setId)) s.delete(setId); else s.add(setId);
      const arr = Array.from(s);
      try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
      return arr;
    });
  };

  const handleNavigate = (id) => {
    if (['mine', 'discover', 'dashboard'].includes(id)) { setDashboardTab(id); setView('dashboard'); }
    else setView(id);
    setSidebarOpenMobile(false);
  };

  // ── Auth ───────────────────────────────────────────────────────────────────

  const toFakeEmail = (username) => `${username.toLowerCase()}@studymate.local`;

  const initUser = async (authUser) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, displayname, streak_count, streak_last_date, activity_data, bio, image_data")
      .eq("id", authUser.id)
      .single();

    const name = profile?.displayname || profile?.username || authUser.email.split("@")[0];

    // Migrate localStorage data to Supabase if not yet stored there
    const local = readProfileSettings(authUser.id);
    const bio = profile?.bio || local.bio || "";
    const imageData = profile?.image_data || local.imageData || null;
    if ((local.bio || local.imageData) && !profile?.bio && !profile?.image_data) {
      supabase.from("profiles").update({ bio, image_data: imageData }).eq("id", authUser.id);
    }

    setUser({ id: authUser.id, email: authUser.email, name, initial: name[0]?.toUpperCase() || "U", bio, imageData });

    const lastDate = profile?.streak_last_date || null;
    setStreak(lastDate && getDaysSince(lastDate) <= 1 ? (profile?.streak_count || 0) : 0);
    setActivityData(profile?.activity_data || {});

    // Migrate guest favourites to user account
    try {
      const guestRaw = localStorage.getItem("sm_favs_guest");
      const guestFavs = guestRaw ? JSON.parse(guestRaw) : [];
      if (guestFavs.length > 0) {
        const userRaw = localStorage.getItem(`sm_favs_${authUser.id}`);
        const userFavs = userRaw ? JSON.parse(userRaw) : [];
        const merged = Array.from(new Set([...userFavs, ...guestFavs]));
        localStorage.setItem(`sm_favs_${authUser.id}`, JSON.stringify(merged));
        localStorage.removeItem("sm_favs_guest");
        setFavorites(merged);
      } else {
        const userRaw = localStorage.getItem(`sm_favs_${authUser.id}`);
        setFavorites(userRaw ? JSON.parse(userRaw) : []);
      }
    } catch (e) { /* ignore */ }

    setView("dashboard");
    await fetchSets(authUser.id);
  };

  const handleLogin = async (username, pass) => {
    const { error } = await supabase.auth.signInWithPassword({ email: toFakeEmail(username), password: pass });
    if (error) throw new Error("Benutzername oder Passwort falsch.");
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await initUser(session.user);
  };

  const handleRegister = async (username, pass, recoveryEmail) => {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (existingProfile) throw new Error("Benutzername bereits vergeben.");

    const { data, error } = await supabase.auth.signUp({
      email: toFakeEmail(username), password: pass,
      options: { data: { username, displayname: username, recovery_email: recoveryEmail || null } },
    });
    if (error) {
      if (error.message.includes("already registered")) throw new Error("Benutzername bereits vergeben.");
      throw error;
    }
    if (!data.user) throw new Error("Registrierung fehlgeschlagen. Bitte 'Confirm email' in Supabase deaktivieren.");

    await supabase.from("profiles").upsert({
      id: data.user.id,
      username: username.toLowerCase(),
      displayname: username,
      recovery_email: recoveryEmail || null,
    });

    if (data.session) await initUser(data.session.user);
    else throw new Error("Registrierung fehlgeschlagen. Bitte 'Confirm email' in Supabase deaktivieren.");
  };

  const handleGuest = async () => { setView("dashboard"); await fetchSets(null); };
  const handleLogout = async () => { await supabase.auth.signOut(); };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSets = async (userId = null) => {
    setSetsLoading(true);
    let query = supabase.from("flashcard_sets").select("*, flashcards(*)").order("createdat", { ascending: false });
    if (userId) query = query.or(`ispublic.eq.true,owneruserid.eq.${userId}`);
    else query = query.eq("ispublic", true);

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

  // ── Profile ────────────────────────────────────────────────────────────────

  const handleSaveProfile = async (displayName, bio, imageData) => {
    if (!user) throw new Error("Kein Benutzer angemeldet.");
    const { error } = await supabase.from("profiles").update({ displayname: displayName, bio, image_data: imageData }).eq("id", user.id);
    if (error) { console.warn("Profil-Update fehlgeschlagen:", error.message); throw new Error("Profil konnte nicht gespeichert werden."); }
    setUser(prev => prev ? { ...prev, name: displayName, initial: displayName[0]?.toUpperCase() || "U", bio, imageData } : prev);
  };

  // ── Sets & Cards ───────────────────────────────────────────────────────────

  const handleCompleteSet = async (cardCount = 1) => {
    const today = toISODate();
    const yesterday = toISODate(new Date(Date.now() - 86400000));
    const currentActivity = activityDataRef.current;
    const currentStreak = streakRef.current;
    const newStreak = (currentStreak > 0 && (currentActivity[today] !== undefined || currentActivity[yesterday] !== undefined))
      ? currentStreak + (currentActivity[today] !== undefined ? 0 : 1) : 1;
    const newActivity = { ...currentActivity, [today]: (currentActivity[today] || 0) + cardCount };

    setStreak(newStreak);
    setActivityData(newActivity);

    if (user) {
      await supabase.from("profiles").update({ streak_count: newStreak, streak_last_date: today, activity_data: newActivity }).eq("id", user.id);
    } else {
      awardDailyStreak("guest");
      recordActivity("guest", cardCount);
    }
  };

  const handleCreateSet = () => {
    if (!user) { showToast("Bitte melde dich an, um ein neues Set zu erstellen.", 'error'); setView("auth"); return; }
    setCreateTitle(""); setCreateDescription(""); setCreateIsPublic(false); setCreateError("");
    setShowCreateSetDialog(true);
    if (!tourCompleted.createSet && !tourActive) {
      setTimeout(() => startTour('createSet'), 300);
    }
  };

  const submitCreateSet = async () => {
    const title = createTitle.trim();
    const description = createDescription.trim();
    if (!title) { setCreateError("Bitte gib einen Titel für dein Set ein."); return; }
    setCreateLoading(true); setCreateError("");
    try {
      const { data, error } = await supabase.from("flashcard_sets")
        .insert({ owneruserid: user.id, title, description, ispublic: createIsPublic })
        .select("*, flashcards(*)")
        .single();
      if (error) throw error;
      const newSet = normalizeSet({ ...data, profiles: { username: user.name, displayname: user.name } });
      setSets(prev => [newSet, ...prev]);
      setCurrentSet(newSet);
      setShowCreateSetDialog(false);
      setView("detail");
    } catch (e) { setCreateError(e?.message || String(e) || "Fehler beim Erstellen des Sets."); }
    finally { setCreateLoading(false); }
  };

  const handleToggleSetVisibility = async (setId, currentVisibility, showAuthor = true) => {
    if (currentVisibility && !window.confirm("Möchtest du dieses Set wirklich privat machen?")) return;
    const { data, error } = await supabase.from("flashcard_sets").update({ ispublic: !currentVisibility, show_author: showAuthor }).eq("id", setId).select().single();
    if (error) { showToast(error.message || "Fehler beim Aktualisieren der Sichtbarkeit.", 'error'); return; }
    const updatedSet = normalizeSet({ ...data, profiles: { username: user?.name || "Unbekannt", displayname: user?.name || "Unbekannt" } });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, isPublic: updatedSet.isPublic } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, isPublic: updatedSet.isPublic } : prev);
  };

  const handleUpdateSetTitle = async (setId, newTitle, newDescription) => {
    if (!newTitle.trim()) { alert("Titel darf nicht leer sein."); return; }
    const { data, error } = await supabase.from("flashcard_sets").update({ title: newTitle.trim(), description: newDescription.trim() }).eq("id", setId).select().single();
    if (error) { alert(error.message || "Fehler beim Aktualisieren des Sets."); return; }
    const updatedSet = normalizeSet({ ...data, profiles: { username: user?.name || "Unbekannt", displayname: user?.name || "Unbekannt" } });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, title: updatedSet.title, description: updatedSet.description } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, title: updatedSet.title, description: updatedSet.description } : prev);
  };

  const handleDeleteSet = async (setId) => {
    if (!window.confirm("Möchtest du dieses Set wirklich endgültig löschen?")) return;
    const { error } = await supabase.from("flashcard_sets").delete().eq("id", setId);
    if (error) { showToast(error.message || "Fehler beim Löschen des Sets.", 'error'); return; }
    setSets(prev => prev.filter(s => s.id !== setId));
    if (currentSet?.id === setId) { setCurrentSet(null); setView("dashboard"); }
  };

  const handleForkSet = async (sourceSet) => {
    if (!user) { showToast("Bitte melde dich an, um ein Set zu forken.", 'error'); return; }
    setForkSourceSet(sourceSet);
    setForkTitle(sourceSet.title);
    setForkDescription(sourceSet.description);
    setForkError("");
    setShowForkDialog(true);
  };

  const submitForkSet = async () => {
    const title = forkTitle.trim();
    if (!title) { setForkError("Bitte gib einen Titel für das geforkte Set ein."); return; }
    setForkLoading(true); setForkError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentifizierung erforderlich.");
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/sets/${forkSourceSet.id}/fork`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: forkDescription }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.detail || "Fehler beim Forken des Sets."); }
      const forkedSet = await response.json();
      const normalizedSet = normalizeSet({ ...forkedSet, profiles: { username: user.name, displayname: user.name } });
      const updatedSet = { ...normalizedSet, title, description: forkDescription };
      setSets(prev => [updatedSet, ...prev]);
      setShowForkDialog(false);
      showToast(`Set erfolgreich als "${title}" geforkt!`, 'success');
      fetchSets(user?.id);
    } catch (error) {
      console.error("Fork error:", error);
      setForkError(error?.message || "Fehler beim Forken des Sets.");
    } finally { setForkLoading(false); }
  };

  const handleAddCard = async (setId, q, a) => {
    const targetSet = sets.find(s => s.id === setId);
    const position = (targetSet?.cards.length ?? 0) + 1;
    const { data, error } = await supabase.from("flashcards").insert({ setid: setId, question: q, answer: a, position }).select().single();
    if (error) throw new Error(error.message);
    const newCard = { id: data.id, q: data.question, a: data.answer };
    setSets(prev => prev.map(s => s.id === setId ? { ...s, cards: [...s.cards, newCard] } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, cards: [...prev.cards, newCard] } : prev);
    return newCard;
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Karte wirklich löschen?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", cardId);
    if (error) throw new Error(error.message);
    setSets(prev => prev.map(s => ({ ...s, cards: s.cards.filter(c => c.id !== cardId) })));
    if (currentSet) setCurrentSet(prev => prev ? { ...prev, cards: prev.cards.filter(c => c.id !== cardId) } : prev);
  };

  const handleEditCard = async (cardId, q, a) => {
    const { error } = await supabase.from("flashcards").update({ question: q, answer: a }).eq("id", cardId);
    if (error) throw new Error(error.message);
    setSets(prev => prev.map(s => ({ ...s, cards: s.cards.map(c => c.id === cardId ? { ...c, q, a } : c) })));
    if (currentSet) setCurrentSet(prev => prev ? { ...prev, cards: prev.cards.map(c => c.id === cardId ? { ...c, q, a } : c) } : prev);
  };

  const handleMoveCard = async (setId, cardId, direction) => {
    const targetSet = sets.find(s => s.id === setId);
    if (!targetSet) return;
    const idx = targetSet.cards.findIndex(c => c.id === cardId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= targetSet.cards.length) return;

    const card = targetSet.cards[idx];
    const swapCard = targetSet.cards[swapIdx];
    const newPos = swapIdx;
    const swapPos = idx;

    await supabase.from("flashcards").update({ position: newPos }).eq("id", card.id);
    await supabase.from("flashcards").update({ position: swapPos }).eq("id", swapCard.id);

    const reorder = (cards) => {
      const updated = cards.map(c => {
        if (c.id === card.id) return { ...c, position: newPos };
        if (c.id === swapCard.id) return { ...c, position: swapPos };
        return c;
      });
      return [...updated].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    };

    setSets(prev => prev.map(s => s.id === setId ? { ...s, cards: reorder(s.cards) } : s));
    if (currentSet?.id === setId) setCurrentSet(prev => prev ? { ...prev, cards: reorder(prev.cards) } : prev);
  };

  const handleImportCards = async (setId, jsonText) => {
    try {
      const cards = JSON.parse(jsonText);
      if (!Array.isArray(cards)) throw new Error("JSON muss ein Array sein.");
      if (cards.length === 0) throw new Error("Array ist leer.");
      const addedCards = [];
      for (const card of cards) {
        if (!card.question || !card.answer) throw new Error(`Karte fehlt 'question' oder 'answer': ${JSON.stringify(card)}`);
        const newCard = await handleAddCard(setId, card.question, card.answer);
        addedCards.push(newCard);
      }
      showToast(`${addedCards.length} Karten erfolgreich importiert!`, 'success');
      return addedCards;
    } catch (e) { throw new Error(`Import-Fehler: ${e.message}`); }
  };

  // ── Friends ────────────────────────────────────────────────────────────────

  const fetchFriends = async () => {
    if (!user) return;
    setFriendsLoading(true);
    const { data } = await supabase.from("friendships").select("id, user_id, friend_id, status").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!data) { setFriendsLoading(false); return; }
    const otherIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
    const { data: profiles } = otherIds.length ? await supabase.from("profiles").select("id, username, displayname, image_data").in("id", otherIds) : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const toEntry = (f) => {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
      const p = profileMap[otherId] || {};
      const name = p.displayname || p.username || "Unbekannt";
      return { friendshipId: f.id, userId: otherId, name, username: p.username || "?", initial: name[0]?.toUpperCase() || "?", imageData: p.image_data || null };
    };
    setFriends(data.filter(f => f.status === 'accepted').map(toEntry));
    setPendingReceived(data.filter(f => f.status === 'pending' && f.friend_id === user.id).map(toEntry));
    setPendingSent(data.filter(f => f.status === 'pending' && f.user_id === user.id).map(toEntry));
    setFriendsLoading(false);
  };

  useEffect(() => { if (user) fetchFriends(); }, [user?.id]);

  const handleOpenUserProfile = async (userId, from = null) => {
    if (!userId) return;
    setPublicProfileFrom(from || view);
    setPublicProfileLoading(true);
    setView("public_profile");
    const { data: profile } = await supabase.from("profiles").select("id, username, displayname, bio, image_data").eq("id", userId).single();
    const { data: setsData } = await supabase.from("flashcard_sets").select("*, flashcards(*)").eq("owneruserid", userId).eq("ispublic", true).eq("show_author", true);
    const name = profile?.displayname || profile?.username || "Unbekannt";
    setPublicProfileUser({ id: userId, name, username: profile?.username || "?", initial: name[0]?.toUpperCase() || "?", bio: profile?.bio || "", imageData: profile?.image_data || null });
    setPublicProfileSets((setsData || []).map(r => normalizeSet({ ...r, profiles: profile })));
    setPublicProfileLoading(false);
  };

  const handleSendFriendRequest = async (toUserId) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: toUserId, status: 'pending' });
    if (error) { showToast(`Fehler: ${error.message}`, 'error'); return; }
    await fetchFriends();
    showToast("Freundschaftsanfrage gesendet!", 'success');
  };

  const handleAcceptFriend = async (friendshipId) => {
    await supabase.from("friendships").update({ status: 'accepted' }).eq("id", friendshipId);
    await fetchFriends();
    showToast("Freundschaft angenommen!", 'success');
  };

  const handleDeclineFriend = async (friendshipId) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    await fetchFriends();
  };

  const handleRemoveFriend = async (friendshipId, friendName) => {
    if (!window.confirm(`Möchtest du ${friendName} wirklich entfernen?`)) return;
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) { showToast(`Fehler: ${error.message}`, 'error'); return; }
    await fetchFriends();
    showToast(`${friendName} wurde entfernt.`, 'success');
  };

  const handleSearchUsers = async (query) => {
    if (!query || query.length < 2) return [];
    const [{ data: byUsername }, { data: byDisplayname }] = await Promise.all([
      supabase.from("profiles").select("id, username, displayname").ilike("username", `%${query}%`).neq("id", user.id).limit(10),
      supabase.from("profiles").select("id, username, displayname").ilike("displayname", `%${query}%`).neq("id", user.id).limit(10),
    ]);
    const combined = [...(byUsername || []), ...(byDisplayname || [])];
    const unique = combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return unique.map(p => {
      const name = p.displayname || p.username || "Unbekannt";
      return { userId: p.id, name, username: p.username || "?", initial: name[0]?.toUpperCase() || "?" };
    });
  };

  const getFriendStatus = (targetUserId) => {
    if (!user || !targetUserId) return null;
    if (friends.find(f => f.userId === targetUserId)) return 'accepted';
    if (pendingSent.find(f => f.userId === targetUserId)) return 'pending_sent';
    if (pendingReceived.find(f => f.userId === targetUserId)) return 'pending_received';
    return null;
  };

  const getFriendshipId = (targetUserId) => {
    if (!user || !targetUserId) return null;
    const friend = friends.find(f => f.userId === targetUserId);
    if (friend) return friend.friendshipId;
    const pendingSentFriend = pendingSent.find(f => f.userId === targetUserId);
    if (pendingSentFriend) return pendingSentFriend.friendshipId;
    const pendingReceivedFriend = pendingReceived.find(f => f.userId === targetUserId);
    if (pendingReceivedFriend) return pendingReceivedFriend.friendshipId;
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const showSidebar = !["auth", "forgot"].includes(view);
  const tourView = view === 'dashboard' && dashboardTab === 'discover' ? 'discover'
    : view === 'dashboard' && dashboardTab === 'mine' ? 'mine' : view;

  if (appInitializing || view === "loading") return (
    <div className="sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 600 }}>
      <div style={{ color: "#64748b", textAlign: "center" }}>
        <Spinner size={32} />
        <p style={{ marginTop: 16, fontSize: 14 }}>Wird geladen...</p>
      </div>
    </div>
  );

  return (
    <div className={`sm ${theme === 'light' ? 'light' : ''} ${sidebarCollapsed ? 'sm-collapsed' : ''} ${!showSidebar ? 'no-sidebar' : ''}`}>
      <div className="sm-grid" />

      {/* Navbar immer volle Breite — außerhalb von sm-main */}
      <NavBar
        user={user}
        onHome={() => setView("dashboard")}
        onLogout={handleLogout}
        onProfile={() => setView('profile')}
        onGoToLogin={() => setView("auth")}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onTourRestart={() => startTour(tourView)}
        currentViewHasTour={!!TOUR_STEPS[tourView]}
      />

      {showSidebar && (
        <Sidebar user={user} activeView={view === 'dashboard' ? dashboardTab : view} onNavigate={handleNavigate} openMobile={sidebarOpenMobile} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} onCloseMobile={() => setSidebarOpenMobile(false)} pendingFriendCount={pendingReceived.length} />
      )}

      <div className="sm-main">
        <div className="sm-glow" style={{ width: 500, height: 500, background: "rgba(0,212,170,.04)", top: -150, right: -100 }} />
        <div className="sm-glow" style={{ width: 400, height: 400, background: "rgba(139,92,246,.04)", bottom: -100, left: -80 }} />

        {/* Create Set Dialog */}
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
                <button type="button" className={`sm-toggle-btn ${!createIsPublic ? "active" : ""}`} onClick={() => setCreateIsPublic(false)}>Privat</button>
                <button type="button" className={`sm-toggle-btn ${createIsPublic ? "active" : ""}`} onClick={() => setCreateIsPublic(true)}>Öffentlich</button>
              </div>
              {createError && <div className="sm-modal-error">{createError}</div>}
              <div className="sm-modal-actions">
                <button className="sm-btn sm-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={submitCreateSet} disabled={createLoading}>
                  {createLoading ? <><Spinner size={14} color="#080c18" /> Erstellen...</> : "Set erstellen"}
                </button>
                <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCreateSetDialog(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Fork Dialog */}
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
                <button className="sm-btn sm-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowForkDialog(false)}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        {view === "auth" && <AuthView onLogin={handleLogin} onRegister={handleRegister} onGuest={handleGuest} onForgotPassword={() => setView("forgot")} />}
        {view === "forgot" && <ForgotPasswordView onBack={() => setView("auth")} />}

        {view === "dashboard" && (
          <DashboardView
            user={user} sets={sets} setsLoading={setsLoading}
            onOpenSet={(s) => { setCurrentSet(s); setView("detail"); }}
            onCreateSet={handleCreateSet} createLoading={createLoading}
            initialTab={dashboardTab} onTabChange={setDashboardTab}
            streak={streak} activityData={activityData}
            favorites={favorites} toggleFavorite={toggleFavorite}
            onRequireAuth={() => setView('auth')} onForkSet={handleForkSet}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}

        {view === "profile" && <ProfileView user={user} sets={sets} streak={streak} onBack={() => setView('dashboard')} onEdit={() => setView('profile_edit')} onViewAllSets={() => { setDashboardTab('mine'); setView('dashboard'); }} />}
        {view === "profile_edit" && <ProfileEditView user={user} onBack={() => setView('profile')} onSave={async (name, bio, img) => { await handleSaveProfile(name, bio, img); setView('profile'); }} />}

        {view === "detail" && currentSet && (
          <DetailView
            set={currentSet} user={user}
            onBack={() => setView("dashboard")} onLearn={() => setView("learn")} onQuiz={() => setView("quiz")}
            onAddCard={handleAddCard} onEditCard={handleEditCard} onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
            onImportCards={handleImportCards} onToggleVisibility={handleToggleSetVisibility}
            onDeleteSet={handleDeleteSet} onForkSet={handleForkSet} onUpdateSetTitle={handleUpdateSetTitle}
            onShowToast={showToast}
          />
        )}

        {view === "learn" && currentSet && <LearnView set={currentSet} onBack={() => setView("detail")} onCompleteSet={handleCompleteSet} />}
        {view === "quiz" && currentSet && <QuizView set={currentSet} onBack={() => setView("detail")} />}
        {view === 'favorites' && <FavoritesView onBack={() => setView('dashboard')} sets={sets} favorites={favorites} toggleFavorite={toggleFavorite} onOpenSet={(s) => { setCurrentSet(s); setView('detail'); }} />}

        {view === 'friends' && user && (
          <FriendsView
            user={user}
            friends={friends}
            pendingReceived={pendingReceived}
            pendingSent={pendingSent}
            loading={friendsLoading}
            onAccept={handleAcceptFriend}
            onDecline={handleDeclineFriend}
            onRemoveFriend={handleRemoveFriend}
            onOpenProfile={handleOpenUserProfile}
            onSearchUsers={handleSearchUsers}
            onSendFriendRequest={handleSendFriendRequest}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'public_profile' && publicProfileUser && (
          <PublicProfileView
            profile={publicProfileUser}
            sets={publicProfileSets}
            friendStatus={getFriendStatus(publicProfileUser.id)}
            loading={publicProfileLoading}
            onBack={() => setView(publicProfileFrom)}
            onSendFriendRequest={() => handleSendFriendRequest(publicProfileUser.id)}
            onAcceptFriend={() => handleAcceptFriend(getFriendshipId(publicProfileUser.id))}
            onDeclineFriend={() => handleDeclineFriend(getFriendshipId(publicProfileUser.id))}
            onRemoveFriend={() => handleRemoveFriend(getFriendshipId(publicProfileUser.id), publicProfileUser.name)}
            onOpenSet={(s) => { setCurrentSet(s); setView('detail'); }}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`sm-toast sm-toast-${toast.type}`}>
            {toast.type === 'success' && <Check size={16} />}
            {toast.type === 'error' && <X size={16} />}
            {toast.type === 'info' && <Sparkles size={16} />}
            {toast.message}
          </div>
        )}

        <GuidedTourOverlay active={tourActive} step={currentTourStep} viewName={tourCurrentView} onNext={nextStep} onPrev={prevStep} onSkip={skipTour} />
      </div>
    </div>
  );
}
