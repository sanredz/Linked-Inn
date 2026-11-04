export const SEASONS = [
  { id: 'classic', name: 'Classic', blurb: 'Every run from the first days of the Inn.', arena: 'wins' },
  { id: 'forever', name: 'Forever', blurb: 'Arrives with the Forever raids and items.', arena: 'tens' },
];
export const SEASON = 'classic';
export const seasonOf = (id) => SEASONS.find((s) => s.id === id) || SEASONS[0];
export const pickSeason = (id) => (SEASONS.some((s) => s.id === id) ? id : SEASON);
