const ACCENTS = ["#00d4aa", "#8b5cf6", "#ef4444", "#f59e0b", "#3b82f6", "#ec4899"];

/** Deterministically picks an accent color based on the set ID. */
export function accentFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
}

/** Maps a raw Supabase flashcard_set row to a normalized frontend object. */
export function normalizeSet(raw) {
  const profile = raw.profiles;
  const realAuthor = profile?.displayname || profile?.username || "Unbekannt";
  const showAuthor = raw.show_author !== false;
  const author = showAuthor ? realAuthor : "Unbekannt";
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || "",
    isPublic: raw.ispublic,
    showAuthor,
    author,
    authorInitial: (author[0] || "?").toUpperCase(),
    owneruserid: raw.owneruserid,
    forkedFrom: raw.forked_from ?? null,
    accent: accentFor(raw.id),
    tags: [],
    cards: (raw.flashcards || [])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(c => ({ id: c.id, q: c.question, a: c.answer })),
  };
}
