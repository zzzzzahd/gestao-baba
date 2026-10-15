import React, { useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList, Segmented } from '../../components/tools/ui';
import { resultsSheetText, scheduleFor } from '../../utils/modelosTorneio';

export default function ControleResultados() {
  const teams = useTeams(6);
  const [format, setFormat] = useState('roundrobin');
  const [legs, setLegs] = useState('1');
  const text = teams.errors.length ? '' : resultsSheetText(scheduleFor(format, teams.names, { legs: legs === '2' ? 2 : 1 }));
  return (
    <ModeloLayout
      slug="controle-de-resultados"
      intro="Uma súmula por rodada para anotar data, hora, campo e placar de cada jogo do torneio. Imprima e deixe com quem controla a mesa."
      howTo={[
        'Liste as equipes e escolha o formato (pontos corridos ou mata-mata).',
        'Imprima a súmula e preencha jogo a jogo. Ao final, a organização confere e confirma o responsável.',
        'Para calcular a classificação automaticamente, use o modelo de pontos corridos.',
      ]}
      premises={[
        'Pontos corridos usa o método do círculo (todos jogam uma vez por rodada; número ímpar gera uma folga por rodada).',
        'Mata-mata usa cabeças de chave na ordem da lista, com byes quando necessário.',
      ]}
    >
      <Panel>
        <TeamsField teams={teams} />
        <Segmented label="Formato" options={[{ value: 'roundrobin', label: 'Pontos corridos' }, { value: 'knockout', label: 'Mata-mata' }]} value={format} onChange={setFormat} />
        {format === 'roundrobin' && <Segmented label="Turnos" options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]} value={legs} onChange={setLegs} />}
      </Panel>
      <ErrorList errors={teams.errors} />
      {text && (
        <section aria-live="polite" aria-labelledby="previa" className="space-y-3">
          <h2 id="previa" className="text-base font-black">Prévia</h2>
          <Preview text={text} label="Prévia da súmula de resultados" />
          <OutputActions text={text} title="Controle de resultados" filename="controle-de-resultados" />
        </section>
      )}
    </ModeloLayout>
  );
}
