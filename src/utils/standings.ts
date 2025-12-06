import type { Team, Match, StandingEntry } from '../types/tournament';

export function calculateStandings(teams: Team[], matches: Match[], setsPerMatch: number = 1): StandingEntry[] {
  const standings: Map<string, StandingEntry> = new Map();

  // Initialize standings for all teams
  teams.forEach(team => {
    standings.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      points: 0,
    });
  });

  // Process completed matches
  matches
    .filter(m => m.status === 'completed' && m.teamAId && m.teamBId)
    .forEach(match => {
      const teamAStats = standings.get(match.teamAId!)!;
      const teamBStats = standings.get(match.teamBId!)!;

      let setsWonA = 0;
      let setsWonB = 0;
      let pointsA = 0;
      let pointsB = 0;

      match.scores.forEach(score => {
        if (score.teamA > score.teamB) {
          setsWonA++;
        } else if (score.teamB > score.teamA) {
          setsWonB++;
        }
        pointsA += score.teamA;
        pointsB += score.teamB;
      });

      teamAStats.played++;
      teamBStats.played++;
      teamAStats.setsWon += setsWonA;
      teamAStats.setsLost += setsWonB;
      teamBStats.setsWon += setsWonB;
      teamBStats.setsLost += setsWonA;
      teamAStats.pointsWon += pointsA;
      teamAStats.pointsLost += pointsB;
      teamBStats.pointsWon += pointsB;
      teamBStats.pointsLost += pointsA;

      if (setsPerMatch === 2) {
        // Bei 2 Sätzen: Punkte basieren auf gewonnenen Sätzen (1 Punkt pro Satz)
        teamAStats.points += setsWonA;
        teamBStats.points += setsWonB;
        // Won/Lost zählt immer noch wer mehr Sätze hat
        if (setsWonA > setsWonB) {
          teamAStats.won++;
          teamBStats.lost++;
        } else if (setsWonB > setsWonA) {
          teamBStats.won++;
          teamAStats.lost++;
        }
      } else {
        // Standard: 2 Punkte für Sieg, 1 für Niederlage
        if (match.winnerId === match.teamAId) {
          teamAStats.won++;
          teamAStats.points += 2;
          teamBStats.lost++;
          teamBStats.points += 1;
        } else {
          teamBStats.won++;
          teamBStats.points += 2;
          teamAStats.lost++;
          teamAStats.points += 1;
        }
      }
    });

  // Sort by points, then set difference, then point difference
  return Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    const pointDiffA = a.pointsWon - a.pointsLost;
    const pointDiffB = b.pointsWon - b.pointsLost;
    return pointDiffB - pointDiffA;
  });
}
