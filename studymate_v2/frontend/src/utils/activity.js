import { toISODate } from "./dates";

const ACTIVITY_STORAGE_KEY = "studymate-activity";

function readActivityStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeActivityStore(store) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(store)); }
  catch (err) { console.warn("Could not persist activity data.", err); }
}

/** Adds `count` learned cards to today's total for a guest user. */
export function recordActivity(userKey, count = 1) {
  const today = toISODate();
  const store = readActivityStore();
  if (!store[userKey]) store[userKey] = {};
  store[userKey][today] = (store[userKey][today] || 0) + count;
  writeActivityStore(store);
}

/**
 * Returns an array of 7 day-entries for the given week offset (0 = current week).
 * @param {Record<string, number>} activityData - map of ISO date → card count
 */
export function getWeekActivity(activityData, weekOffset = 0) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toISODate(d);
    return { date: key, count: activityData[key] || 0, label: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][i] };
  });
}
