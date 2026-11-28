import { useState } from 'react';

interface TeamListEditorProps {
  readonly names: readonly string[];
  readonly onChange: (names: string[]) => void;
}

/**
 * Teams und Setzliste (Q41): Reihenfolge = Setzplatz. Umsortieren per Drag & Drop oder mit
 * Pfeiltasten-Buttons; mehrere Teams auf einmal einfügen (eine Zeile pro Team).
 */
export function TeamListEditor({ names, onChange }: TeamListEditorProps) {
  const [draft, setDraft] = useState('');
  const [dragIndex, setDragIndex] = useState<number | undefined>();

  const add = () => {
    const added = draft
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (added.length === 0) return;
    onChange([...names, ...added]);
    setDraft('');
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= names.length || from === to) return;
    const next = [...names];
    const [item] = next.splice(from, 1);
    if (item !== undefined) next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          id="team-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          rows={2}
          placeholder="Teamname, z. B. „Anna + Ben“. Mehrere Teams: eine Zeile pro Team einfügen."
          className="min-h-12 flex-1 rounded-lg border-2 border-line px-3 py-2"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-blue px-4 py-2 font-semibold text-paper"
        >
          Hinzufügen
        </button>
      </div>
      <p className="text-sm text-muted">
        Die Reihenfolge ist die Setzliste: oben steht Seed 1. Ziehen oder Pfeile zum Umsortieren.
      </p>
      <ol className="flex flex-col gap-1">
        {names.map((name, i) => (
          <li
            key={`${name}-${String(i)}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== undefined) move(dragIndex, i);
              setDragIndex(undefined);
            }}
            className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2"
          >
            <span className="w-8 font-semibold tabular-nums text-violet">#{i + 1}</span>
            <input
              aria-label={`Name Team ${String(i + 1)}`}
              value={name}
              onChange={(e) => onChange(names.map((n, k) => (k === i ? e.target.value : n)))}
              className="min-w-0 flex-1 rounded border border-transparent px-1 hover:border-line"
            />
            <button
              type="button"
              aria-label="nach oben"
              onClick={() => move(i, i - 1)}
              className="rounded px-2 py-1 text-lg"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="nach unten"
              onClick={() => move(i, i + 1)}
              className="rounded px-2 py-1 text-lg"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="entfernen"
              onClick={() => onChange(names.filter((_, k) => k !== i))}
              className="rounded px-2 py-1 text-muted"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
