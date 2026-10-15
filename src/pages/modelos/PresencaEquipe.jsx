import React, { useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList, IntField, toInt } from '../../components/tools/ui';
import { attendanceSheetText } from '../../utils/modelosTorneio';

export default function PresencaEquipe() {
  const teams = useTeams(4);
  const [rows, setRows] = useState('12');
  const [games, setGames] = useState('4');
  const r = toInt(rows); const g = toInt(games);
  const errors = [...teams.errors];
  if (!Number.isInteger(r) || r < 1 || r > 40) errors.push('Linhas por equipe: informe de 1 a 40.');
  if (!Number.isInteger(g) || g < 1 || g > 10) errors.push('Jogos por folha: informe de 1 a 10.');
  const text = errors.length ? '' : attendanceSheetText(teams.names, { rows: r, games: g });
  return (
    <ModeloLayout
      slug="lista-presenca-por-equipe"
      intro="Uma folha de presença para cada equipe, com uma coluna por jogo. Entregue na inscrição e confira na mesa antes de cada partida."
      howTo={[
        'Liste as equipes e escolha quantas linhas (jogadores) e quantos jogos cada folha terá.',
        'Imprima uma folha por equipe. O responsável escreve os nomes e marca a presença jogo a jogo.',
      ]}
      premises={[
        'A folha sai em branco: o modelo não coleta nem guarda nenhum dado de jogador.',
        'Use o número de linhas igual ao máximo de inscritos por equipe definido no regulamento.',
      ]}
    >
      <Panel>
        <TeamsField teams={teams} rows={5} />
        <div className="grid grid-cols-2 gap-4">
          <IntField label="Linhas por equipe" value={rows} onChange={setRows} min={1} max={40} />
          <IntField label="Jogos (colunas)" value={games} onChange={setGames} min={1} max={10} />
        </div>
      </Panel>
      <ErrorList errors={errors} />
      {text && (
        <section aria-live="polite" aria-labelledby="previa" className="space-y-3">
          <h2 id="previa" className="text-base font-black">Prévia</h2>
          <Preview text={text} label="Prévia da lista de presença" />
          <OutputActions text={text} title="Lista de presença por equipe" filename="lista-presenca-por-equipe" />
        </section>
      )}
    </ModeloLayout>
  );
}
