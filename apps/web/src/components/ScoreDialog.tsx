import {
  enterResult,
  evaluateResult,
  type MatchView,
  type SetScore,
  type TournamentView,
} from '@beachl/domain';
import { useEffect, useRef, useState } from 'react';
import { matchTitle, setFormatLabel, sideLabel } from '../format';
import { useApp } from '../state/appStore';

interface ScoreDialogProps {
  readonly view: TournamentView;
  readonly match: MatchView;
  readonly onClose: () => void;
}

/** Ergebnis satzweise eintragen oder korrigieren; Prüfung live über die Fachlogik (Q22–Q24). */
export function ScoreDialog({ view, match, onClose }: ScoreDialogProps) {
  const run = useApp((s) => s.run);
  const area = match.phase === 'group' || match.phase === 'roundRobin' ? 'preliminary' : 'knockout';
  const format = view.config[area].setFormat;
  const maxSets = format.kind === 'singleSet' ? 1 : format.kind === 'twoSets' ? 2 : 3;
  const [rows, setRows] = useState<{ a: string; b: string }[]>(() =>
    Array.from({ length: maxSets }, (_, i) => ({
      a: match.sets?.[i] ? String(match.sets[i].a) : '',
      b: match.sets?.[i] ? String(match.sets[i].b) : '',
    })),
  );
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => firstInput.current?.focus(), []);

  const sets: SetScore[] = rows
    .filter((r) => r.a !== '' || r.b !== '')
    .map((r) => ({ a: Number(r.a), b: Number(r.b) }));
  const check = evaluateResult(format, sets);
  const update = (i: number, side: 'a' | 'b', value: string) => {
    setRows((prev) =>
      prev.map((r, k) => (k === i ? { ...r, [side]: value.replace(/\D/g, '') } : r)),
    );
  };
  const save = async () => {
    if (await run((doc) => enterResult(doc, match.id, sets))) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-title"
    >
      <form
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-paper p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (check.ok) void save();
        }}
      >
        <div>
          <h2 id="score-title" className="font-display text-xl font-bold">
            {matchTitle(view, match)}
          </h2>
          <p className="text-sm text-muted">
            {setFormatLabel(format)}, dritter Satz bis 15, 2 Punkte Vorsprung
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2">
          <span />
          <span className="w-16 truncate text-center text-sm font-semibold">
            {sideLabel(view, match, 'a')}
          </span>
          <span className="w-16 truncate text-center text-sm font-semibold">
            {sideLabel(view, match, 'b')}
          </span>
          {rows.map((row, i) => (
            <div key={i} className="contents">
              <label htmlFor={`set-${String(i)}-a`} className="text-sm text-muted">
                Satz {i + 1}
                {i === 2 ? ' (falls nötig)' : ''}
              </label>
              {(['a', 'b'] as const).map((side) => (
                <input
                  key={side}
                  id={`set-${String(i)}-${side}`}
                  ref={i === 0 && side === 'a' ? firstInput : undefined}
                  inputMode="numeric"
                  value={row[side]}
                  onChange={(e) => update(i, side, e.target.value)}
                  className="h-14 w-16 rounded-lg border-2 border-line text-center text-2xl tabular-nums"
                />
              ))}
            </div>
          ))}
        </div>
        <p
          className={`min-h-6 text-sm ${check.ok ? 'text-blue' : 'text-orange'}`}
          aria-live="polite"
        >
          {sets.length === 0
            ? 'Punkte eintragen.'
            : check.ok
              ? resultText(view, match, check.summary.winner)
              : check.error}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-3 font-semibold"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!check.ok}
            className="rounded-lg bg-blue px-5 py-3 font-semibold text-paper disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}

function resultText(view: TournamentView, match: MatchView, winner: 'a' | 'b' | null): string {
  if (winner === null) return 'Unentschieden (1:1 Sätze).';
  return `Sieger: ${sideLabel(view, match, winner)}`;
}
