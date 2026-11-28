import { type AreaSettings, defaultMatchDuration, type SetFormat } from '@beachl/domain';
import { SET_FORMAT_LABELS } from '../../format';

interface AreaFieldsProps {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly value: AreaSettings;
  /** K.o.-Runde: „2 Sätze“ nicht möglich (Q24). */
  readonly allowTwoSets: boolean;
  readonly onChange: (value: AreaSettings) => void;
}

/** Satzmodus, Spieldauer und Schiedsrichter eines Bereichs (Q22–Q24, Q49, Q50). */
export function AreaFields({ id, title, hint, value, allowTwoSets, onChange }: AreaFieldsProps) {
  const kinds = (Object.keys(SET_FORMAT_LABELS) as SetFormat['kind'][]).filter(
    (k) => allowTwoSets || k !== 'twoSets',
  );
  const setFormat = (next: SetFormat) => {
    // Spieldauer folgt dem Satzmodus, solange sie nicht von Hand geändert wurde (Q50).
    const wasDefault = value.matchDuration === defaultMatchDuration(value.setFormat);
    onChange({
      ...value,
      setFormat: next,
      matchDuration: wasDefault ? defaultMatchDuration(next) : value.matchDuration,
    });
  };

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4">
      <legend className="px-1 font-display text-lg font-bold">{title}</legend>
      <p className="text-sm text-muted">{hint}</p>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-kind`}>
          Sätze
          <select
            id={`${id}-kind`}
            value={value.setFormat.kind}
            onChange={(e) =>
              setFormat({ ...value.setFormat, kind: e.target.value as SetFormat['kind'] })
            }
            className="rounded-lg border-2 border-line px-3 py-2 font-normal"
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {SET_FORMAT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-points`}>
          Punkte pro Satz
          <select
            id={`${id}-points`}
            value={value.setFormat.pointsPerSet}
            onChange={(e) =>
              setFormat({ ...value.setFormat, pointsPerSet: e.target.value === '15' ? 15 : 21 })
            }
            className="rounded-lg border-2 border-line px-3 py-2 font-normal"
          >
            <option value={21}>bis 21</option>
            <option value={15}>bis 15</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-duration`}>
          Spieldauer (min)
          <input
            id={`${id}-duration`}
            type="number"
            min={5}
            step={5}
            value={value.matchDuration}
            onChange={(e) => onChange({ ...value, matchDuration: Number(e.target.value) })}
            className="w-28 rounded-lg border-2 border-line px-3 py-2 font-normal tabular-nums"
          />
        </label>
      </div>
      <label className="flex items-center gap-2" htmlFor={`${id}-referees`}>
        <input
          id={`${id}-referees`}
          type="checkbox"
          checked={value.referees}
          onChange={(e) => onChange({ ...value, referees: e.target.checked })}
          className="size-5"
        />
        Schiedsrichter einteilen
      </label>
    </fieldset>
  );
}
