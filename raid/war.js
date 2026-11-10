export const WAR = {
  raid: 'aq20',
  start: 0,
  goals: [
    { id: 'mc', name: 'Damage to Ragnaros', need: 78000000, icon: 254652 },
    { id: 'zg', name: 'Damage to Hakkar', need: 33000000, icon: 236413 },
    { id: 'forge', name: 'Legendaries forged', need: 18, icon: 135349 },
  ],
};
export const warOpen = (goals) => !!goals && goals.every((g) => g.have >= g.need);
