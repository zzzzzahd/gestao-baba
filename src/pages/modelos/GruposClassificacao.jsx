import React, { useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList, IntField, toInt } from '../../components/tools/ui';
import { groupsSheetText } from '../../utils/modelosTorneio';
import { groupSizes } from '../../utils/tournamentMath';

export default function GruposClassificacao() {
  const teams = useTeams(8);
  const [groups, setGroups] = useState('2');
  const g = toInt(groups);
  const errors = [...teams.errors];
  if (!teams.errors.length) {
    if (!Number.isInteger(g) || g < 2) errors.push('Informe pelo menos 2 grupos.');
    else if (g > teams.names.length / 2) errors.push('Cada grupo precisa de pelo menos 2 equipes: reduza a quantidade de grupos.');
  }
  const text = errors.length ? '' : groupsSheetText(teams.names, g);
  return (
    <ModeloLayout
      slug="grupos-e-classificacao"
      intro="Divida as equipes em grupos e imprima a tabela de classificação de cada um, pronta para preencher a cada rodada."
      howTo={[
        'Liste as equipes, da melhor para a pior cabeça de chave, e escolha quantos grupos quer.',
        'Imprima as tabelas e preencha P (pontos), J (jogos), V, E, D, GP, GC e SG a cada jogo.',
        'Para classificação automática com placares, use o modelo de pontos corridos.',
      ]}
      premises={[
        'Os grupos são formados em serpentina pela ordem da lista (A, B, B, A...), para equilibrar a força entre eles.',
        'Colunas: P pontos, J jogos, V vitórias, E empates, D derrotas, GP gols pró, GC gols contra, SG saldo de gols (GP − GC).',
        'Se o número de equipes não divide igualmente, os primeiros grupos ficam com uma equipe a mais.',
      ]}
    >
      <Panel>
        <TeamsField teams={teams} />
        <IntField label="Quantidade de grupos" value={groups} onChange={setGroups} min={2} max={32}
          hint={!errors.length ? `Tamanhos: ${groupSizes(teams.names.length, g).join(' + ')}` : undefined} />
      </Panel>
      <ErrorList errors={errors} />
      {text && (
        <section aria-live="polite" aria-labelledby="previa" className="space-y-3">
          <h2 id="previa" className="text-base font-black">Prévia</h2>
          <Preview text={text} label="Prévia dos grupos e classificações" />
          <OutputActions text={text} title="Fase de grupos" filename="grupos-e-classificacao" />
        </section>
      )}
    </ModeloLayout>
  );
}
