import { toISODate, getDaysSince } from "./dates";

const STREAK_STORAGE_KEY = "studymate-streaks";

function readStreakStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStreakStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Could not persist streak data to localStorage.", err);
  }
}

/** Reads current streak for a user, auto-resets if more than 1 day has passed. */
export function getStreakState(userKey) {
  const store = readStreakStore();
  const current = store[userKey] || { count: 0, lastCompletedDate: null };
  if (current.lastCompletedDate && getDaysSince(current.lastCompletedDate) > 1) {
    const resetState = { count: 0, lastCompletedDate: null };
    store[userKey] = resetState;
    writeStreakStore(store);
    return resetState;
  }
  return current;
}

/** Increments the streak for today (no-op if already awarded today). For guest users only. */
export function awardDailyStreak(userKey) {
  const today = toISODate();
  const store = readStreakStore();
  const current = getStreakState(userKey);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toISODate(yesterdayDate);

  if (current.lastCompletedDate === today) return current;

  const nextCount = current.lastCompletedDate === yesterday ? current.count + 1 : 1;
  const nextState = { count: nextCount, lastCompletedDate: today };
  store[userKey] = nextState;
  writeStreakStore(store);
  return nextState;
}
