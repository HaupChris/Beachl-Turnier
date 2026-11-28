import { describe, expect, it } from 'vitest';
import { renderGroupFormat, renderRoundRobin } from './renderPlan';

/**
 * Freigabe-Dateien (architecture.md „Teststrategie“): Der Nutzer prüft die Dateien in
 * __approved__/ einmal. Jede spätere Änderung am Plan zeigt sich als Diff und lässt den Test
 * fehlschlagen, bis die neue Fassung bewusst übernommen wird (vitest -u).
 */

const teamCounts = Array.from({ length: 27 }, (_, i) => i + 6);
const name = (n: number) => `${String(n).padStart(2, '0')}-teams.txt`;

describe('Freigabe: Full Placement', () => {
  it.each(teamCounts)('%i Teams', async (n) => {
    await expect(renderGroupFormat('full', n)).toMatchFileSnapshot(
      `./__approved__/full-placement/${name(n)}`,
    );
  });
});

describe('Freigabe: Short Main', () => {
  it.each(teamCounts)('%i Teams', async (n) => {
    await expect(renderGroupFormat('split', n)).toMatchFileSnapshot(
      `./__approved__/short-main/${name(n)}`,
    );
  });
});

describe('Freigabe: Jeder gegen jeden', () => {
  it.each([3, 4, 5, 6, 7, 8])('%i Teams', async (n) => {
    await expect(renderRoundRobin(n)).toMatchFileSnapshot(`./__approved__/round-robin/${name(n)}`);
  });
});
