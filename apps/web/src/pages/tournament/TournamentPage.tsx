import type { MatchView } from '@beachl/domain';
import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { ScoreDialog } from '../../components/ScoreDialog';
import type { TournamentTab } from '../../router';
import { useApp, useTournamentView } from '../../state/appStore';
import { BracketView } from './BracketView';
import { FinalStandingsView } from './FinalStandingsView';
import { GroupsView } from './GroupsView';
import { NowView } from './NowView';
import { ScheduleView } from './ScheduleView';
import { TeamsView } from './TeamsView';

export function TournamentPage({ id, tab }: { id: string; tab: TournamentTab }) {
  const loaded = useApp((s) => s.loaded);
  const view = useTournamentView(id);
  const [editing, setEditing] = useState<string | undefined>();

  if (!view) {
    return (
      <Layout title="Turnier">
        <p className="text-muted">{loaded ? 'Dieses Turnier gibt es nicht (mehr).' : 'Lädt …'}</p>
      </Layout>
    );
  }
  const onEnterResult = (match: MatchView) => setEditing(match.id);
  const editingMatch = view.matches.find((m) => m.id === editing);
  const isRoundRobin = view.config.format === 'round-robin';

  return (
    <Layout title={view.config.name} tournamentId={id} activeTab={tab} isRoundRobin={isRoundRobin}>
      {tab === 'jetzt' && <NowView view={view} onEnterResult={onEnterResult} />}
      {tab === 'spielplan' && <ScheduleView view={view} onEnterResult={onEnterResult} />}
      {tab === 'gruppen' && <GroupsView view={view} onEnterResult={onEnterResult} />}
      {tab === 'baum' && <BracketView view={view} onEnterResult={onEnterResult} />}
      {tab === 'endstand' && <FinalStandingsView view={view} />}
      {tab === 'teams' && <TeamsView view={view} />}
      {editingMatch && (
        <ScoreDialog view={view} match={editingMatch} onClose={() => setEditing(undefined)} />
      )}
    </Layout>
  );
}
