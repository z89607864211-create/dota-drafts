export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseHeroId(id) {
  // Convert hero ID to name
  const heroMap = {
    1: 'Anti-Mage', 2: 'Axe', 3: 'Bane', 4: 'Bloodseeker',
    5: 'Crystal Maiden', 6: 'Drow Ranger', 7: 'Earthshaker',
    8: 'Juggernaut', 9: 'Mirana', 10: 'Shadow Fiend'
    // Add more as needed
  };
  return heroMap[id] || `Hero ${id}`;
}

export function extractTeamName(element) {
  return element?.trim() || 'Unknown Team';
}