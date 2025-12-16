import type { Match } from '../../../types/tournament';
import { generateRound1FourGroups } from './fourGroupsRound1';
import { generateRound2FourGroups } from './fourGroupsRound2';
import { generateRound3FourGroups } from './fourGroupsRound3';
import { generateRound4FourGroups } from './fourGroupsRound4';

/**
 * Generate placeholder matches for 4-group tournaments (classic format)
 */
export function generateFourGroupPlaceholder(numberOfCourts: number): Match[] {
  const matches: Match[] = [];
  let matchNumber = 1;
  let bracketPosition = 1;

  // Generate Round 1
  const { qualificationMatches, bottomSemis, nextMatchNumber, nextBracketPosition } =
    generateRound1FourGroups(numberOfCourts, matchNumber, bracketPosition);
  matches.push(...qualificationMatches, ...bottomSemis);
  matchNumber = nextMatchNumber;
  bracketPosition = nextBracketPosition;

  // Generate Round 2
  const round2Result = generateRound2FourGroups(
    numberOfCourts, matchNumber, bracketPosition, qualificationMatches, bottomSemis
  );
  matches.push(...round2Result.matches);
  matchNumber = round2Result.nextMatchNumber;
  bracketPosition = round2Result.nextBracketPosition;

  // Generate Round 3
  const round3Result = generateRound3FourGroups(
    numberOfCourts, matchNumber, bracketPosition,
    round2Result.quarterfinalMatches, round2Result.bracket912Semis
  );
  matches.push(...round3Result.matches);
  matchNumber = round3Result.nextMatchNumber;
  bracketPosition = round3Result.nextBracketPosition;

  // Generate Round 4 (Finals)
  const round4Result = generateRound4FourGroups(
    numberOfCourts, matchNumber, bracketPosition,
    round3Result.semifinalMatches, round3Result.bracket58Semis
  );
  matches.push(...round4Result.matches);

  return matches;
}
