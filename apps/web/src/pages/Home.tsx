import { useState } from 'react';
import { Layout } from '../components/Layout';
import { FORMAT_LABELS } from '../format';
import { href, navigate } from '../router';
import { useApp } from '../state/appStore';

/** Startseite: Turniere öffnen, anlegen, importieren, exportieren, löschen (Q41). */
export function Home() {
  const documents = useApp((s) => s.documents);
  const importJson = useApp((s) => s.importJson);
  const exportJson = useApp((s) => s.exportJson);
  const remove = useApp((s) => s.remove);
  const [confirmDelete, setConfirmDelete] = useState<string | undefined>();
  const list = Object.values(documents).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const download = (id: string, name: string) => {
    const json = exportJson(id);
    if (!json) return;
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/[^\wäöüÄÖÜß-]+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await importJson(await file.text());
    if (result.ok) navigate({ page: 'tournament', id: result.value.id, view: 'jetzt' });
  };

  return (
    <Layout title="Turniere">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          <a
            href={href({ page: 'setup' })}
            className="rounded-lg bg-violet px-5 py-3 font-semibold text-paper"
          >
            + Neues Turnier
          </a>
          <label className="cursor-pointer rounded-lg border-2 border-line bg-paper px-5 py-3 font-semibold">
            Turnier importieren (JSON)
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </label>
        </div>
        {list.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-line bg-paper p-8 text-center">
            <p className="font-display text-xl font-bold">Noch kein Turnier</p>
            <p className="text-muted">
              Lege ein neues Turnier an oder importiere eine exportierte Datei.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4"
              >
                <a
                  href={href({ page: 'tournament', id: doc.id, view: 'jetzt' })}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate font-display text-lg font-bold">
                    {doc.config.name}
                  </span>
                  <span className="text-sm text-muted">
                    {FORMAT_LABELS[doc.config.format]} · {doc.config.teams.length} Teams · angelegt{' '}
                    {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => download(doc.id, doc.config.name)}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                >
                  Exportieren
                </button>
                {confirmDelete === doc.id ? (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void remove(doc.id)}
                      className="rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-paper"
                    >
                      Endgültig löschen
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(undefined)}
                      className="rounded-lg border border-line px-3 py-2 text-sm"
                    >
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(doc.id)}
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    Löschen
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
