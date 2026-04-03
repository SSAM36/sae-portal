export const TEAM_DEFINITIONS = [
  { displayName: 'DJS KRONOS', routeId: 'kronos', username: 'kronos' },
  { displayName: 'DJS PHOENIX', routeId: 'phoenix', username: 'phoenix' },
  { displayName: 'DJS MILES', routeId: 'miles', username: 'miles' },
  { displayName: 'DJS RACING', routeId: 'racing', username: 'racing' },
  { displayName: 'DJS KARTING', routeId: 'karting', username: 'karting' },
  { displayName: 'DJS IMPULSE', routeId: 'impulse', username: 'impulse' },
  { displayName: 'DJS ASTRA', routeId: 'astra', username: 'astra' },
  { displayName: 'DJS SKYLARK', routeId: 'skylark', username: 'skylark' },
  { displayName: 'DJS SPEEDSTERS', routeId: 'speedsters', username: 'speedsters' },
  { displayName: 'DJS HELIOS', routeId: 'helios', username: 'helios' },
  { displayName: 'DJS ROBOCON', routeId: 'robocon', username: 'robocon' },
];

export const TEAM_LABELS = TEAM_DEFINITIONS.map((team) => team.displayName);

export const getTeamByRouteId = (routeId) =>
  TEAM_DEFINITIONS.find((team) => team.routeId === routeId);

export const buildInterviewStatus = (teams = []) =>
  teams.reduce((statusMap, team) => {
    statusMap[team] = 'Not Started';
    return statusMap;
  }, {});

export const normalizeTeamName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const resolveTeamName = (value) => {
  const normalizedValue = normalizeTeamName(value);
  return TEAM_DEFINITIONS.find((team) => {
    const candidates = [team.displayName, team.routeId, team.username];
    return candidates.some((candidate) => normalizeTeamName(candidate) === normalizedValue);
  })?.displayName;
};

export const resolveTeamList = (values = []) => {
  const resolved = values
    .flatMap((value) => String(value || '').split(/[,;\n]/g))
    .map((value) => resolveTeamName(value))
    .filter(Boolean);

  return Array.from(new Set(resolved));
};