/**
 * Group Phase Configuration Hook
 *
 * Manages group phase settings and computed values.
 * Extracted from useConfigureForm to reduce complexity.
 */

import { useState, useEffect, useMemo } from 'react';
import type { Team, Group } from '../types/tournament';
import { generateGroups, calculateGroupConfiguration } from '../domain';

interface UseGroupPhaseConfigParams {
  teams: Team[];
  isGroupBasedSystem: boolean;
}

export function useGroupPhaseConfig({ teams, isGroupBasedSystem }: UseGroupPhaseConfigParams) {
  // Group phase settings
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSeeding, setGroupSeeding] = useState<'snake' | 'random' | 'manual'>('snake');
  const [teamsPerGroup, setTeamsPerGroup] = useState<3 | 4 | 5>(4);

  // Calculate group configuration with bye support
  const groupConfig = useMemo(() => {
    if (!isGroupBasedSystem) return null;
    return calculateGroupConfiguration(teams.length, teamsPerGroup);
  }, [isGroupBasedSystem, teams.length, teamsPerGroup]);

  // Computed values
  const numberOfGroups = groupConfig?.numberOfGroups ?? Math.floor(teams.length / teamsPerGroup);
  const byesNeeded = groupConfig?.byesNeeded ?? 0;
  const groupConfigError = groupConfig?.isValid === false ? groupConfig.errorMessage : undefined;

  // Generate preview groups when teams change (for group-based systems)
  const previewGroups = useMemo(() => {
    if (!isGroupBasedSystem || !groupConfig?.isValid || numberOfGroups < 2) return [];
    return generateGroups(teams, numberOfGroups, groupSeeding, byesNeeded);
  }, [teams, isGroupBasedSystem, numberOfGroups, groupSeeding, groupConfig?.isValid, byesNeeded]);

  // Update groups when preview changes (only if not manually edited)
  useEffect(() => {
    if (isGroupBasedSystem && previewGroups.length > 0 && groupSeeding !== 'manual') {
      setGroups(previewGroups);
    }
  }, [previewGroups, isGroupBasedSystem, groupSeeding]);

  return {
    // State
    groups,
    setGroups,
    groupSeeding,
    setGroupSeeding,
    teamsPerGroup,
    setTeamsPerGroup,

    // Computed values
    numberOfGroups,
    byesNeeded,
    groupConfigError,
  };
}
