/** Formats a Date object as "YYYY-MM-DD" string. */
export function toISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" string back into a Date, or null if invalid. */
export function parseISODate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** Returns how many full days have passed since a "YYYY-MM-DD" date string. */
export function getDaysSince(dateString, referenceDate = new Date()) {
  const parsedDate = parseISODate(dateString);
  if (!parsedDate) return Infinity;
  const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return Math.floor((reference - parsedDate) / (1000 * 60 * 60 * 24));
}
