import { v4 as uuidv4 } from 'uuid';
import type {
  Team,
  Tournament,
  GroupStandingEntry,
  StandingEntry,
} from '../../types/tournament';
import { handleByeMatches } from '../../knockout/knockout/byeHandler';

/**
 * Populates shortened main round tournament with actual teams from group phase standings
 * Called when group phase completes
 */
export function populateShortMainRoundTeams(
  knockoutTournament: Tournament,
  parentTournament: Tournament,
  groupStandings: GroupStandingEntry[]
): { tournament: Tournament; teams: Team[]; eliminatedTeamIds: string[] } {
  const groups = parentTournament.groupPhaseConfig?.groups || [];
  if (groups.length < 2 || groups.length > 8 || groups.length % 2 !== 0) {
    throw new Error('BeachL-Kurze-Hauptrunde requires between 2 and 8 groups');
  }

  // Create team ID mapping (old -> new)
  const teamIdMap = new Map<string, string>();
  const teams: Team[] = [];
  const eliminatedTeamIds: string[] = [];

  // Copy all teams with new IDs (all teams play in shortened main round)
  groupStandings.forEach((standing) => {
    const originalTeam = parentTournament.teams.find(t => t.id === standing.teamId);
    if (!originalTeam) return;

    const newId = uuidv4();
    teamIdMap.set(standing.teamId, newId);
    teams.push({
      id: newId,
      name: originalTeam.name,
      seedPosition: teams.length + 1,
    });
  });

  // Helper to get team by group and rank
  const getTeamId = (groupIndex: number, rank: number): string | null => {
    const group = groups[groupIndex];
    const standing = groupStandings.find(s => s.groupId === group.id && s.groupRank === rank);
    if (!standing) return null;
    return teamIdMap.get(standing.teamId) || null;
  };

  const expectedTeamsPerGroup = parentTournament.groupPhaseConfig?.teamsPerGroup ?? 4;

  type SeedCandidate = {
    teamId: string | null;
    groupRank: number;
    groupIndex: number;
    points: number;
    setsWon: number;
    setsLost: number;
    pointsWon: number;
    pointsLost: number;
    isGhost?: boolean;
  };

  const rankBuckets = new Map<number, SeedCandidate[]>();
  const pushCandidate = (rank: number, candidate: SeedCandidate) => {
    if (!rankBuckets.has(rank)) {
      rankBuckets.set(rank, []);
    }
    rankBuckets.get(rank)!.push(candidate);
  };

  const compareCandidates = (a: SeedCandidate, b: SeedCandidate) => {
    if (a.isGhost && !b.isGhost) return 1;
    if (!a.isGhost && b.isGhost) return -1;
    if (a.isGhost && b.isGhost) return a.groupIndex - b.groupIndex;
    if (a.points !== b.points) return b.points - a.points;
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffA !== setDiffB) return setDiffB - setDiffA;
    const pointDiffA = a.pointsWon - a.pointsLost;
    const pointDiffB = b.pointsWon - b.pointsLost;
    if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;
    return a.groupIndex - b.groupIndex;
  };

  const groupEntriesById = new Map<string, GroupStandingEntry[]>();
  for (const entry of groupStandings) {
    if (!groupEntriesById.has(entry.groupId)) {
      groupEntriesById.set(entry.groupId, []);
    }
    groupEntriesById.get(entry.groupId)!.push(entry);
  }

  groups.forEach((group, groupIndex) => {
    const groupEntries = groupEntriesById.get(group.id) || [];
    const entryByRank = new Map<number, GroupStandingEntry>();
    groupEntries.forEach((entry) => {
      entryByRank.set(entry.groupRank, entry);
      const mappedId = teamIdMap.get(entry.teamId);
      if (!mappedId) return;
      pushCandidate(entry.groupRank, {
        teamId: mappedId,
        groupRank: entry.groupRank,
        groupIndex,
        points: entry.points,
        setsWon: entry.setsWon,
        setsLost: entry.setsLost,
        pointsWon: entry.pointsWon,
        pointsLost: entry.pointsLost,
      });
    });

    if (expectedTeamsPerGroup >= 4) {
      for (let rank = 4; rank <= expectedTeamsPerGroup; rank++) {
        if (!entryByRank.has(rank)) {
          pushCandidate(rank, {
            teamId: null,
            groupRank: rank,
            groupIndex,
            points: 0,
            setsWon: 0,
            setsLost: 0,
            pointsWon: 0,
            pointsLost: 0,
            isGhost: true,
          });
        }
      }
    }
  });

  const sortedSecondCandidates = (rankBuckets.get(2) || []).sort(compareCandidates);
  const sortedThirdCandidates = (rankBuckets.get(3) || []).sort(compareCandidates);
  const sortedSecondIds = sortedSecondCandidates
    .map((c) => c.teamId)
    .filter((id): id is string => id !== null);

  const bestSecondCount = groups.length >= 5 ? Math.max(0, 8 - groups.length) : 0;
  const remainingSecondIds = sortedSecondIds.slice(bestSecondCount);
  const remainingThirdIds = sortedThirdCandidates
    .map((c) => c.teamId)
    .filter((id): id is string => id !== null);

  const remainingRankedIds: Array<string | null> = [];
  for (let rank = 4; rank <= expectedTeamsPerGroup; rank++) {
    const bucket = (rankBuckets.get(rank) || []).sort(compareCandidates);
    bucket.forEach((candidate) => {
      remainingRankedIds.push(candidate.teamId);
    });
  }

  const remainingSeedIds: Array<string | null> = [
    ...remainingSecondIds,
    ...remainingThirdIds,
    ...remainingRankedIds,
  ];

  // Update matches with actual team IDs
  const updatedMatches = knockoutTournament.matches.map(match => {
    const updatedMatch = { ...match };

    // Populate team from source (group standings)
    if (match.teamASource?.type === 'group') {
      updatedMatch.teamAId = getTeamId(match.teamASource.groupIndex, match.teamASource.rank);
    }
    if (match.teamBSource?.type === 'group') {
      updatedMatch.teamBId = getTeamId(match.teamBSource.groupIndex, match.teamBSource.rank);
    }
    if (match.teamASource?.type === 'standing') {
      updatedMatch.teamAId = remainingSeedIds[match.teamASource.rank - 1] ?? null;
    }
    if (match.teamBSource?.type === 'standing') {
      updatedMatch.teamBId = remainingSeedIds[match.teamBSource.rank - 1] ?? null;
    }

    // Best 2nd place placeholders (e.g., "Bester Zweitplatzierter", "2. bester Zweitplatzierter")
    const assignBestSecond = (placeholder: string | undefined): string | null => {
      if (!placeholder) return null;
      const match = placeholder.match(/(\\d+)\\.\\s*bester\\s+Zweitplatzierter/i);
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        return sortedSecondIds[index] ?? null;
      }
      if (/bester\\s+Zweitplatzierter/i.test(placeholder)) {
        return sortedSecondIds[0] ?? null;
      }
      return null;
    };

    if (!updatedMatch.teamAId) {
      const bestSecond = assignBestSecond(match.teamAPlaceholder);
      if (bestSecond) updatedMatch.teamAId = bestSecond;
    }
    if (!updatedMatch.teamBId) {
      const bestSecond = assignBestSecond(match.teamBPlaceholder);
      if (bestSecond) updatedMatch.teamBId = bestSecond;
    }

    // Update status: if both teams are assigned and no dependencies, mark as scheduled
    if (updatedMatch.teamAId && updatedMatch.teamBId && !updatedMatch.dependsOn) {
      updatedMatch.status = 'scheduled';
    } else if (updatedMatch.teamAId && updatedMatch.teamBId) {
      // Both teams assigned but has dependencies - check if dependencies are met
      updatedMatch.status = 'scheduled';
    }

    return updatedMatch;
  });

  const matchesWithByes = handleByeMatches(updatedMatches);

  // Initialize standings for knockout phase
  const standings: StandingEntry[] = teams.map(t => ({
    teamId: t.id,
    played: 0,
    won: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  }));

  return {
    tournament: {
      ...knockoutTournament,
      teams,
      matches: matchesWithByes,
      standings,
      eliminatedTeamIds,
      updatedAt: new Date().toISOString(),
    },
    teams,
    eliminatedTeamIds,
  };
}
