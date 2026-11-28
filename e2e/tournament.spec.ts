import { expect, type Page, test } from '@playwright/test';

/**
 * Hauptablauf: Turnier anlegen, alle Ergebnisse eintragen, Ansichten und Aushang prüfen.
 * Screenshots landen in .local/e2e-results/ (nicht im Repo).
 */

async function createTournament(page: Page, format: RegExp, teams: number) {
  await page.goto('/#/neu');
  await page.getByLabel('Name des Turniers').fill('Testturnier');
  await page.getByLabel(format).check();
  await page
    .locator('#team-draft')
    .fill(Array.from({ length: teams }, (_, i) => `Team ${String(i + 1)}`).join('\n'));
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByText(`Teams (${String(teams)})`)).toBeVisible();
  await page.getByRole('button', { name: 'Turnier starten' }).click();
  await expect(page.getByRole('heading', { name: 'Feld 1' })).toBeVisible();
}

/** Trägt auf „Jetzt“ so lange Ergebnisse ein, bis kein Spiel mehr offen ist. Team A gewinnt immer. */
async function playAll(page: Page) {
  for (let i = 0; i < 100; i++) {
    const button = page.getByRole('button', { name: 'Ergebnis', exact: true }).first();
    if ((await button.count()) === 0) return;
    await button.click();
    await page.locator('#set-0-a').fill('21');
    await page.locator('#set-0-b').fill('15');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  throw new Error('Turnier endet nicht');
}

test('Full Placement mit 8 Teams: anlegen, durchspielen, Endstand und Aushang', async ({
  page,
}, info) => {
  await createTournament(page, /Full Placement/, 8);
  await page.screenshot({ path: info.outputPath('01-jetzt.png'), fullPage: true });

  await playAll(page);
  await expect(page.getByText('Das Turnier ist beendet.')).toBeVisible();

  await page.getByRole('link', { name: 'Gruppen' }).click();
  await expect(page.getByRole('heading', { name: 'Gruppe A' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('02-gruppen.png'), fullPage: true });

  await page.getByRole('link', { name: 'Baum' }).click();
  await expect(page.getByRole('heading', { name: /Platzierungsbaum/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath('03-baum.png'), fullPage: true });

  await page.getByRole('link', { name: 'Endstand' }).click();
  const places = page.locator('ol li');
  await expect(places).toHaveCount(8);
  await page.screenshot({ path: info.outputPath('04-endstand.png'), fullPage: true });

  const id = /turnier\/([^/]+)/.exec(page.url())?.[1] ?? '';
  await page.goto(`/#/aushang/${id}`);
  await expect(page.getByText('1.').first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('05-aushang.png'), fullPage: true });
});

test('Ungültiges Ergebnis wird im Dialog erklärt und nicht gespeichert', async ({ page }) => {
  await createTournament(page, /Jeder gegen jeden/, 4);
  await page.getByRole('button', { name: 'Ergebnis', exact: true }).first().click();
  await page.locator('#set-0-a').fill('21');
  await page.locator('#set-0-b').fill('20');
  await expect(page.getByText('Ein Satz ist erst mit 2 Punkten Vorsprung gewonnen.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeDisabled();
});

test('Rückgängig nimmt das letzte Ergebnis zurück', async ({ page }) => {
  await createTournament(page, /Short Main/, 8);
  await page.getByRole('button', { name: 'Ergebnis', exact: true }).first().click();
  await page.locator('#set-0-a').fill('21');
  await page.locator('#set-0-b').fill('15');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.getByRole('link', { name: 'Spielplan' }).click();
  await page.getByRole('button', { name: 'Beendet' }).click();
  await expect(page.getByText('✓ beendet')).toHaveCount(1);
  await page.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(page.getByText('✓ beendet')).toHaveCount(0);
});
