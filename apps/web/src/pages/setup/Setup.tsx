import type { AreaSettings, TournamentConfig, TournamentFormat } from '@beachl/domain';
import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { FORMAT_LABELS, formatTime, parseTime } from '../../format';
import { navigate } from '../../router';
import { useApp } from '../../state/appStore';
import { AreaFields } from './AreaFields';
import { DEFAULT_KNOCKOUT, DEFAULT_PRELIMINARY } from './defaults';
import { SetupPreview } from './SetupPreview';
import { TeamListEditor } from './TeamListEditor';

const FORMATS: { value: TournamentFormat; hint: string }[] = [
  {
    value: 'round-robin',
    hint: '3–8 Teams. Alle gegen alle, optional Platzierungsspiele 1–2, 3–4, …',
  },
  {
    value: 'groups-full-placement',
    hint: '6–32 Teams. Gruppen, danach spielen alle jeden Platz aus.',
  },
  {
    value: 'groups-split-bracket',
    hint: '6–32 Teams. Gruppen, die ersten 3 ins Hauptfeld, die übrigen eigene Felder.',
  },
];

/** Einrichtung (Q41, Q42): Teams und Setzliste, Modus, Felder, Satzmodus, Zeiten. */
export function Setup() {
  const create = useApp((s) => s.create);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('groups-full-placement');
  const [teams, setTeams] = useState<string[]>([]);
  const [courts, setCourts] = useState(4);
  const [start, setStart] = useState('10:00');
  const [preliminary, setPreliminary] = useState<AreaSettings>(DEFAULT_PRELIMINARY);
  const [knockout, setKnockout] = useState<AreaSettings>(DEFAULT_KNOCKOUT);
  const [placementMatches, setPlacementMatches] = useState(true);

  const startTime = parseTime(start);
  const config: TournamentConfig = {
    name,
    format,
    teams: teams.map((teamName, i) => ({
      id: `team-${String(i + 1)}`,
      name: teamName,
      seed: i + 1,
    })),
    courts,
    startTime: startTime ?? 600,
    preliminary,
    knockout,
    placementMatches,
  };
  const isRoundRobin = format === 'round-robin';

  const submit = async () => {
    if (startTime === undefined) return;
    const result = await create(config);
    if (result.ok) navigate({ page: 'tournament', id: result.value.id, view: 'jetzt' });
  };

  return (
    <Layout title="Neues Turnier">
      <form
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-1 font-semibold" htmlFor="name">
            Name des Turniers
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. BeachL Sommerturnier"
              className="rounded-lg border-2 border-line px-3 py-2 font-normal"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-display text-lg font-bold">Modus</legend>
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={`flex gap-3 rounded-xl border-2 bg-paper p-3 ${format === f.value ? 'border-violet' : 'border-line'}`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="mt-1 size-5"
                />
                <span>
                  <span className="block font-semibold">{FORMAT_LABELS[f.value]}</span>
                  <span className="text-sm text-muted">{f.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-bold">Teams ({teams.length})</h2>
            <TeamListEditor names={teams} onChange={setTeams} />
          </section>

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 font-semibold" htmlFor="courts">
              Felder
              <input
                id="courts"
                type="number"
                min={1}
                max={20}
                value={courts}
                onChange={(e) => setCourts(Number(e.target.value))}
                className="w-24 rounded-lg border-2 border-line px-3 py-2 font-normal tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1 font-semibold" htmlFor="start">
              Beginn
              <input
                id="start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onBlur={() => startTime !== undefined && setStart(formatTime(startTime))}
                placeholder="10:00"
                className={`w-28 rounded-lg border-2 px-3 py-2 font-normal tabular-nums ${startTime === undefined ? 'border-orange' : 'border-line'}`}
              />
            </label>
          </div>

          <AreaFields
            id="preliminary"
            title="Vorrunde"
            hint={isRoundRobin ? 'Alle Spiele jeder gegen jeden.' : 'Alle Gruppenspiele.'}
            value={preliminary}
            allowTwoSets
            onChange={setPreliminary}
          />
          <AreaFields
            id="knockout"
            title={isRoundRobin ? 'Platzierungsspiele' : 'K.o.-Runde'}
            hint="„2 Sätze“ gibt es hier nicht, damit kein 1:1 entsteht."
            value={knockout}
            allowTwoSets={false}
            onChange={setKnockout}
          />

          {isRoundRobin && (
            <label className="flex items-center gap-2" htmlFor="placement">
              <input
                id="placement"
                type="checkbox"
                checked={placementMatches}
                onChange={(e) => setPlacementMatches(e.target.checked)}
                className="size-5"
              />
              Platzierungsspiele nach der Vorrunde (1–2, 3–4, …)
            </label>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <SetupPreview config={config} />
          <button
            type="submit"
            disabled={startTime === undefined}
            className="rounded-lg bg-violet px-5 py-3 font-semibold text-paper disabled:opacity-40"
          >
            Turnier starten
          </button>
        </div>
      </form>
    </Layout>
  );
}
