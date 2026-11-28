import { areaSettings } from '@beachl/domain';

/** Standard für neue Turniere: 1 Satz bis 21, Dauer nach Q50, Schiedsrichter aus (Q49). */
export const DEFAULT_PRELIMINARY = areaSettings({ kind: 'singleSet', pointsPerSet: 21 });
export const DEFAULT_KNOCKOUT = areaSettings({ kind: 'singleSet', pointsPerSet: 21 });
