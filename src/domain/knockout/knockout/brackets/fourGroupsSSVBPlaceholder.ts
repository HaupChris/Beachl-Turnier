import { v4 as uuidv4 } from 'uuid';
import type { Match } from '../../../types/tournament';
import { getGroupLetter, getRankLabel } from './utils';

/**
 * Generates the SSVB bracket structure with placeholder text (no teams assigned)
 */
export function generate4GroupSSVBKnockoutPlaceholder(
  _numberOfGroups: number,
  numberOfCourts: number,
  playThirdPlaceMatch: boolean,
  useReferees: boolean
): { matches: Match[] } {
  const matches: Match[] = [];

  let matchNumber = 1;
  let bracketPosition = 1;

  // Referee assignment for placeholders:
  // - Intermediate & Quarterfinal: 4th place teams (one from each group)
  // - Semifinal: Losers from intermediate round
  // - Finals: Losers from quarterfinal
  const groupLettersForReferees = ['A', 'B', 'C', 'D'];

  // ============================================
  // ROUND 1: Intermediate Round (Zwischenrunde)
  // ============================================
  // 2A vs 3D, 2B vs 3C, 2C vs 3B, 2D vs 3A

  const intermediatePairings: Array<{teamA: {group: number; rank: number}; teamB: {group: number; rank: number}}> = [
    { teamA: { group: 0, rank: 2 }, teamB: { group: 3, rank: 3 } }, // 2A vs 3D
    { teamA: { group: 1, rank: 2 }, teamB: { group: 2, rank: 3 } }, // 2B vs 3C
    { teamA: { group: 2, rank: 2 }, teamB: { group: 1, rank: 3 } }, // 2C vs 3B
    { teamA: { group: 3, rank: 2 }, teamB: { group: 0, rank: 3 } }, // 2D vs 3A
  ];

  const intermediateMatches: Match[] = intermediatePairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 1,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(pairing.teamA.rank)} Gruppe ${getGroupLetter(pairing.teamA.group)}`,
    teamBPlaceholder: `${getRankLabel(pairing.teamB.rank)} Gruppe ${getGroupLetter(pairing.teamB.group)}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.teamA.group, rank: pairing.teamA.rank },
    teamBSource: { type: 'group' as const, groupIndex: pairing.teamB.group, rank: pairing.teamB.rank },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'intermediate' as const,
    bracketPosition: bracketPosition++,
    // Referee: 4th place from one of the groups
    refereePlaceholder: useReferees ? `4. Platz Gruppe ${groupLettersForReferees[index]}` : undefined,
  }));

  matches.push(...intermediateMatches);

  // ============================================
  // ROUND 2: Quarterfinals (Viertelfinale)
  // ============================================
  // 1A vs Winner(2B vs 3C), 1B vs Winner(2A vs 3D), 1C vs Winner(2D vs 3A), 1D vs Winner(2C vs 3B)

  const quarterfinalPairings = [
    { groupWinner: 0, intermediateMatchIndex: 1 }, // 1A vs Winner of intermediate match 2
    { groupWinner: 1, intermediateMatchIndex: 0 }, // 1B vs Winner of intermediate match 1
    { groupWinner: 2, intermediateMatchIndex: 3 }, // 1C vs Winner of intermediate match 4
    { groupWinner: 3, intermediateMatchIndex: 2 }, // 1D vs Winner of intermediate match 3
  ];

  const quarterfinalMatches: Match[] = quarterfinalPairings.map((pairing, index) => ({
    id: uuidv4(),
    round: 2,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `${getRankLabel(1)} Gruppe ${getGroupLetter(pairing.groupWinner)}`,
    teamBPlaceholder: `Sieger Spiel ${intermediateMatches[pairing.intermediateMatchIndex].matchNumber}`,
    teamASource: { type: 'group' as const, groupIndex: pairing.groupWinner, rank: 1 },
    courtNumber: Math.min(index + 1, numberOfCourts),
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'quarterfinal' as const,
    bracketPosition: bracketPosition++,
    dependsOn: {
      teamB: { matchId: intermediateMatches[pairing.intermediateMatchIndex].id, result: 'winner' as const },
    },
    // Referee: 4th place from one of the groups (cycling through)
    refereePlaceholder: useReferees ? `4. Platz Gruppe ${groupLettersForReferees[index]}` : undefined,
  }));

  matches.push(...quarterfinalMatches);

  // ============================================
  // ROUND 3: Semifinals (Halbfinale)
  // ============================================

  const semifinalMatches: Match[] = [
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[0].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[1].id, result: 'winner' as const },
      },
      // Referee: Loser from intermediate round
      refereePlaceholder: useReferees ? `Verlierer Spiel ${intermediateMatches[0].matchNumber}` : undefined,
    },
    {
      id: uuidv4(),
      round: 3,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Sieger Spiel ${quarterfinalMatches[2].matchNumber}`,
      teamBPlaceholder: `Sieger Spiel ${quarterfinalMatches[3].matchNumber}`,
      courtNumber: Math.min(2, numberOfCourts),
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'semifinal' as const,
      bracketPosition: bracketPosition++,
      dependsOn: {
        teamA: { matchId: quarterfinalMatches[2].id, result: 'winner' as const },
        teamB: { matchId: quarterfinalMatches[3].id, result: 'winner' as const },
      },
      // Referee: Loser from intermediate round
      refereePlaceholder: useReferees ? `Verlierer Spiel ${intermediateMatches[1].matchNumber}` : undefined,
    },
  ];

  matches.push(...semifinalMatches);

  // ============================================
  // ROUND 4: Third Place Match + Final
  // ============================================

  if (playThirdPlaceMatch) {
    const thirdPlaceMatch: Match = {
      id: uuidv4(),
      round: 4,
      matchNumber: matchNumber++,
      teamAId: null,
      teamBId: null,
      teamAPlaceholder: `Verlierer Spiel ${semifinalMatches[0].matchNumber}`,
      teamBPlaceholder: `Verlierer Spiel ${semifinalMatches[1].matchNumber}`,
      courtNumber: 1,
      scores: [],
      winnerId: null,
      status: 'pending' as const,
      knockoutRound: 'third-place' as const,
      bracketPosition: bracketPosition++,
      playoffForPlace: 3,
      dependsOn: {
        teamA: { matchId: semifinalMatches[0].id, result: 'loser' as const },
        teamB: { matchId: semifinalMatches[1].id, result: 'loser' as const },
      },
      // Referee: Loser from quarterfinal
      refereePlaceholder: useReferees ? `Verlierer Spiel ${quarterfinalMatches[0].matchNumber}` : undefined,
    };
    matches.push(thirdPlaceMatch);
  }

  const finalMatch: Match = {
    id: uuidv4(),
    round: 4,
    matchNumber: matchNumber++,
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: `Sieger Spiel ${semifinalMatches[0].matchNumber}`,
    teamBPlaceholder: `Sieger Spiel ${semifinalMatches[1].matchNumber}`,
    courtNumber: playThirdPlaceMatch ? Math.min(2, numberOfCourts) : 1,
    scores: [],
    winnerId: null,
    status: 'pending' as const,
    knockoutRound: 'final' as const,
    bracketPosition: bracketPosition++,
    playoffForPlace: 1,
    dependsOn: {
      teamA: { matchId: semifinalMatches[0].id, result: 'winner' as const },
      teamB: { matchId: semifinalMatches[1].id, result: 'winner' as const },
    },
    // Referee: Loser from quarterfinal
    refereePlaceholder: useReferees ? `Verlierer Spiel ${quarterfinalMatches[1].matchNumber}` : undefined,
  };

  matches.push(finalMatch);

  return { matches };
}
