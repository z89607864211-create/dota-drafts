// In-memory storage for current matches
const matches = new Map();

export function getMatches() {
  return Array.from(matches.values());
}

export function getMatch(id) {
  return matches.get(id);
}

export function updateMatch(id, data) {
  matches.set(id, { ...matches.get(id), ...data, updatedAt: Date.now() });
}

export function removeMatch(id) {
  matches.delete(id);
}

export function clearOldMatches(maxAge = 3600000) {
  const now = Date.now();
  for (const [id, match] of matches) {
    if (now - match.updatedAt > maxAge) {
      matches.delete(id);
    }
  }
}