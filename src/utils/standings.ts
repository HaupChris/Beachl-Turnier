import type { Team, Match, StandingEntry, TiebreakerOrder } from '../types/tournament';

interface StandingsOptions {
  setsPerMatch: number;
  tiebreakerOrder?: TiebreakerOrder;
}

interface HeadToHeadResult {
  wins: number;
  losses: number;
  pointDiff: number;
}

function getHeadToHead(
  teamAId: string,
  teamBId: string,
  matches: Match[]
): HeadToHeadResult {
  let wins = 0;
  let losses = 0;
  let pointDiff = 0;

  matches
    .filter(m => m.status === 'completed')
    .filter(m =>
      (m.teamAId === teamAId && m.teamBId === teamBId) ||
      (m.teamAId === teamBId && m.teamBId === teamAId)
    )
    .forEach(match => {
      const isTeamA = match.teamAId === teamAId;

      // Calculate points in this match
      let teamPoints = 0;
      let opponentPoints = 0;
      match.scores.forEach(score => {
        if (isTeamA) {
          teamPoints += score.teamA;
          opponentPoints += score.teamB;
        } else {
          teamPoints += score.teamB;
          opponentPoints += score.teamA;
        }
      });

      pointDiff += teamPoints - opponentPoints;

      // Determine winner
      if (match.winnerId === teamAId) {
        wins++;
      } else if (match.winnerId === teamBId) {
        losses++;
      }
    });

  return { wins, losses, pointDiff };
}

export function calculateStandings(
  teams: Team[],
  matches: Match[],
  options: StandingsOptions | number = 1
): StandingEntry[] {
  // Handle legacy call with just setsPerMatch number
  const opts: StandingsOptions = typeof options === 'number'
    ? { setsPerMatch: options, tiebreakerOrder: 'head-to-head-first' }
    : { tiebreakerOrder: 'head-to-head-first', ...options };

  const { setsPerMatch, tiebreakerOrder } = opts;

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
      points: 0, // Not used anymore but kept for compatibility
    });
  });

  // Process completed matches
  matches
    .filter(m => m.status === 'completed' && m.teamAId && m.teamBId)
    .forEach(match => {
      const teamAStats = standings.get(match.teamAId!);
      const teamBStats = standings.get(match.teamBId!);

      if (!teamAStats || !teamBStats) return;

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

      // Determine match winner
      if (match.winnerId === match.teamAId) {
        teamAStats.won++;
        teamBStats.lost++;
      } else if (match.winnerId === match.teamBId) {
        teamBStats.won++;
        teamAStats.lost++;
      }
    });

  // Sort standings
  const standingsArray = Array.from(standings.values());

  // Primary sorting: by wins (for 1 set or Best of 3) or sets won (for 2 sets)
  standingsArray.sort((a, b) => {
    // Primary: wins or sets won
    if (setsPerMatch === 2) {
      // For 2 sets mode: sort by sets won
      if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    } else {
      // For 1 set or Best of 3: sort by match wins
      if (b.won !== a.won) return b.won - a.won;
    }

    // If equal, apply tiebreaker
    if (tiebreakerOrder === 'head-to-head-first') {
      // First: head-to-head
      const h2h = getHeadToHead(a.teamId, b.teamId, matches);
      if (h2h.wins !== h2h.losses) {
        return h2h.losses - h2h.wins; // More wins = better rank (lower index)
      }
      // If h2h is tied, use overall point difference
      const pointDiffA = a.pointsWon - a.pointsLost;
      const pointDiffB = b.pointsWon - b.pointsLost;
      return pointDiffB - pointDiffA;
    } else {
      // First: overall point difference
      const pointDiffA = a.pointsWon - a.pointsLost;
      const pointDiffB = b.pointsWon - b.pointsLost;
      if (pointDiffB !== pointDiffA) return pointDiffB - pointDiffA;
      // If point diff is tied, use head-to-head
      const h2h = getHeadToHead(a.teamId, b.teamId, matches);
      return h2h.losses - h2h.wins;
    }
  });

  return standingsArray;
}
