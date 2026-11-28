import { MAX_GROUP_PHASE_TEAMS, MIN_GROUP_PHASE_TEAMS } from '../groups/groupLayout';
import type { SetFormat, Team } from '../model/types';
import { MIN_ROUND_ROBIN_TEAMS } from '../roundRobin/planRoundRobin';
import { defaultMatchDuration } from '../schedule/durations';
import { deriveGroupTournament } from './deriveGroups';
import { deriveRoundRobinTournament } from './deriveRoundRobin';
import type { AreaSettings, TournamentConfig, TournamentDocument, TournamentFormat } from './types';
import type { TournamentView } from './view';

export type Outcome<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });
const fail = <T>(error: string): Outcome<T> => ({ ok: false, error });

/** Bereichseinstellungen mit Standardwerten: Dauer aus dem Satzmodus (Q50), Schiedsrichter aus (Q49). */
export function areaSettings(
  setFormat: SetFormat,
  overrides: Partial<AreaSettings> = {},
): AreaSettings {
  return {
    setFormat,
    matchDuration: defaultMatchDuration(setFormat),
    referees: false,
    ...overrides,
  };
}

/** Prüft eine Konfiguration gegen die fachlichen Regeln. */
export function validateConfig(config: TournamentConfig): string | undefined {
  const n = config.teams.length;
  if (config.name.trim() === '') return 'Das Turnier braucht einen Namen.';
  if (config.teams.some((t) => t.name.trim() === '')) return 'Jedes Team braucht einen Namen.';
  if (new Set(config.teams.map((t) => t.id)).size !== n) return 'Team-IDs müssen eindeutig sein.';
  const seeds = config.teams.map((t) => t.seed).sort((a, b) => a - b);
  if (!seeds.every((s, i) => s === i + 1))
    return 'Setzplätze müssen lückenlos von 1 bis N vergeben sein.';
  if (!Number.isInteger(config.courts) || config.courts < 1)
    return 'Mindestens ein Feld ist nötig.';
  if (config.format === 'round-robin' && n < MIN_ROUND_ROBIN_TEAMS) {
    return `„Jeder gegen jeden“ braucht mindestens ${String(MIN_ROUND_ROBIN_TEAMS)} Teams.`;
  }
  if (config.format !== 'round-robin' && (n < MIN_GROUP_PHASE_TEAMS || n > MAX_GROUP_PHASE_TEAMS)) {
    return `Gruppenmodi sind mit ${String(MIN_GROUP_PHASE_TEAMS)}–${String(MAX_GROUP_PHASE_TEAMS)} Teams möglich.`;
  }
  // Q24: In der K.o.-Runde gibt es „2 Sätze“ nicht, damit kein 1:1 entsteht.
  if (config.knockout.setFormat.kind === 'twoSets')
    return 'In der K.o.-Runde ist „2 Sätze“ nicht möglich.';
  for (const area of [config.preliminary, config.knockout]) {
    if (!(area.matchDuration > 0)) return 'Die Spieldauer muss größer als 0 sein.';
  }
  return undefined;
}

export function createTournament(
  config: TournamentConfig,
  meta: { readonly id: string; readonly createdAt: string },
): Outcome<TournamentDocument> {
  const error = validateConfig(config);
  if (error) return fail(error);
  return ok({ schemaVersion: 1, id: meta.id, createdAt: meta.createdAt, config, events: [] });
}

export function deriveTournament(doc: TournamentDocument): TournamentView {
  return doc.config.format === 'round-robin'
    ? deriveRoundRobinTournament(doc)
    : deriveGroupTournament(doc);
}

/** Rückgängig: Das letzte Ereignis wird entfernt (Q28, Q40). */
export function undoLastEvent(doc: TournamentDocument): TournamentDocument {
  return { ...doc, events: doc.events.slice(0, -1) };
}

export function serializeTournament(doc: TournamentDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** Liest eine exportierte JSON-Datei und prüft Aufbau und Konfiguration. */
export function parseTournament(json: string): Outcome<TournamentDocument> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return fail('Die Datei ist kein gültiges JSON.');
  }
  if (!isRecord(data) || data['schemaVersion'] !== 1)
    return fail('Unbekanntes Dateiformat oder unbekannte Version.');
  const { id, createdAt, config, events } = data;
  if (
    typeof id !== 'string' ||
    typeof createdAt !== 'string' ||
    !isRecord(config) ||
    !Array.isArray(events)
  ) {
    return fail('Die Datei ist unvollständig.');
  }
  if (!isConfig(config)) return fail('Die Turnier-Einstellungen in der Datei sind unvollständig.');
  if (!events.every(isEvent)) return fail('Die Datei enthält unbekannte Ereignisse.');
  const error = validateConfig(config);
  if (error) return fail(error);
  return ok({ schemaVersion: 1, id, createdAt, config, events });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const FORMATS: readonly TournamentFormat[] = [
  'round-robin',
  'groups-full-placement',
  'groups-split-bracket',
];

function isSetFormat(v: unknown): v is SetFormat {
  return (
    isRecord(v) &&
    ['singleSet', 'twoSets', 'bestOfThree'].includes(v['kind'] as string) &&
    (v['pointsPerSet'] === 15 || v['pointsPerSet'] === 21)
  );
}

function isArea(v: unknown): v is AreaSettings {
  return (
    isRecord(v) &&
    isSetFormat(v['setFormat']) &&
    typeof v['matchDuration'] === 'number' &&
    typeof v['referees'] === 'boolean'
  );
}

function isTeam(v: unknown): v is Team {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['seed'] === 'number'
  );
}

function isConfig(c: Record<string, unknown>): c is Record<string, unknown> & TournamentConfig {
  return (
    typeof c['name'] === 'string' &&
    FORMATS.includes(c['format'] as TournamentFormat) &&
    Array.isArray(c['teams']) &&
    c['teams'].every(isTeam) &&
    typeof c['courts'] === 'number' &&
    typeof c['startTime'] === 'number' &&
    isArea(c['preliminary']) &&
    isArea(c['knockout']) &&
    typeof c['placementMatches'] === 'boolean'
  );
}

const isId = (v: unknown) => typeof v === 'string';
const isScore = (v: unknown) =>
  isRecord(v) && typeof v['a'] === 'number' && typeof v['b'] === 'number';

function isEvent(v: unknown): v is TournamentDocument['events'][number] {
  if (!isRecord(v)) return false;
  switch (v['type']) {
    case 'ResultEntered':
    case 'ResultCorrected':
      return (
        isId(v['matchId']) &&
        Array.isArray(v['teams']) &&
        v['teams'].length === 2 &&
        v['teams'].every(isId) &&
        Array.isArray(v['sets']) &&
        v['sets'].every(isScore)
      );
    case 'RockPaperScissorsDecided':
      return (
        (v['groupIndex'] === null || typeof v['groupIndex'] === 'number') &&
        Array.isArray(v['order']) &&
        v['order'].every(isId)
      );
    case 'TeamWithdrawn':
    case 'WithdrawalReverted':
      return isId(v['teamId']);
    case 'RefereeChanged':
      return isId(v['matchId']) && (v['teamId'] === null || isId(v['teamId']));
    default:
      return false;
  }
}
