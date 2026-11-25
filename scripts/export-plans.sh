#!/usr/bin/env bash
# Exportiert die lokalen Vereinspläne (docs/Aktuelle Turnierpläne, nicht im Repo) als CSV
# nach .local/plans-csv/. Jedes Blatt wird eine eigene CSV-Datei.
# Die Excel-Abgleich-Tests lesen diese CSVs; ohne sie werden die Tests übersprungen.
# Voraussetzung: LibreOffice (soffice) ist installiert.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$root/docs/Aktuelle Turnierpläne"
out="$root/.local/plans-csv"
profile="$root/.local/soffice-profile"

if [[ ! -d "$src" ]]; then
  echo "Keine Vereinspläne gefunden unter: $src" >&2
  exit 1
fi
command -v soffice >/dev/null || { echo "soffice (LibreOffice) nicht gefunden" >&2; exit 1; }

# Feldtrenner Komma, Anführungszeichen ", UTF-8, alle Blätter exportieren (letzter Parameter -1)
filter='csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1'

rm -rf "$out"
find "$src" -type f \( -name '*.xlsx' -o -name '*.xls' \) ! -name '.~lock*' -print0 |
  while IFS= read -r -d '' file; do
    rel="$(dirname "${file#"$src"/}")"
    mkdir -p "$out/$rel"
    soffice -env:UserInstallation="file://$profile" --headless \
      --convert-to "$filter" --outdir "$out/$rel" "$file" >/dev/null
    echo "exportiert: ${file#"$src"/}"
  done
