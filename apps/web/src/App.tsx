import { formatPlace } from '@beachl/domain';

export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">BeachL Turnier</h1>
      <p>
        Neuaufbau in Arbeit. Fachlogik geladen: Platzanzeige <strong>{formatPlace(1)}</strong>
      </p>
    </main>
  );
}
