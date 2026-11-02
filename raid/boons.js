export const BOONS = [
  { id: 'bloodlust', name: 'Bloodlust', text: 'The party deals 35% more damage for the first 20 seconds.', opening: 1.35 },
  { id: 'executioner', name: 'Executioner', text: 'The party deals 30% more damage to bosses under 30% health.', execute: 1.3 },
  { id: 'glass', name: 'Glass Cannon', text: 'The party deals 22% more damage but has 12% less health.', damage: 1.22, hp: .88 },
  { id: 'drums', name: 'War Drums', text: 'The party deals 4% more damage for every boss killed.', growth: .04 },
  { id: 'undying', name: 'Undying Resolve', text: 'Once per fight, your tank survives a killing blow at 30% health.', undying: 1 },
  { id: 'ironclad', name: 'Ironclad', text: 'Your tank can no longer be crit.', noCrit: 1 },
  { id: 'stoneskin', name: 'Stoneskin', text: 'Your tank takes 12% less damage but deals 30% less.', tankTaken: .88, tankDamage: .7 },
  { id: 'reserves', name: 'Deep Reserves', text: 'Your healer has 30% more mana.', mana: 1.3 },
  { id: 'clarity', name: 'Clarity', text: 'Your healer regains mana 60% faster.', regen: 1.6 },
  { id: 'swift', name: 'Swift Mending', text: 'Your healer casts 20% faster.', castSpeed: 1.2 },
  { id: 'overcharge', name: 'Overcharge', text: 'Heals are 18% stronger but cost 18% more.', heal: 1.18, cost: 1.18 },
  { id: 'fireward', name: 'Fire Ward', text: 'The party gains 60 Fire Resistance.', all: { rfire: 60 } },
  { id: 'nightward', name: 'Night Ward', text: 'The party gains 60 Shadow and Arcane Resistance.', all: { rshadow: 60, rarcane: 60 } },
  { id: 'patience', name: 'Long Game', text: 'Boss enrage timers are 30% longer.', enrage: 1.3 },
  { id: 'fortune', name: 'Fortune', text: 'Gain 3 rerolls. Jackpot items are twice as likely.', rerolls: 3, jackpot: 2 },
];

export const boonById = (id) => BOONS.find((b) => b.id === id);

export function modsOf(ids, kills = 0) {
  const m = {};
  for (const id of ids || []) {
    const b = boonById(id);
    for (const [k, v] of Object.entries(b)) if (!['id', 'name', 'text', 'all', 'rerolls'].includes(k)) m[k] = v;
  }
  m.damage = (m.damage || 1) * (1 + (m.growth || 0) * kills);
  return m;
}
