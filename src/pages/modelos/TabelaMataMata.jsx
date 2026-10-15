import React, { useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList } from '../../components/tools/ui';
import { bracketSheetText } from '../../utils/modelosTorneio';

export default function TabelaMataMata() {
  const teams = useTeams(8);
  const [thirdPlace, setThirdPlace] = useState(false);
  const text = teams.errors.length ? '' : bracketSheetText(teams.names, { thirdPlace });
  return (
    <ModeloLayout
      slug="tabela-mata-mata"
      intro="Digite as equipes e receba a chave do mata-mata com cabeças de chave, byes quando o número não fecha e espaço para anotar o placar de cada jogo."
      howTo={[
        'Escreva uma equipe por linha, da melhor para a pior cabeça de chave.',
        'Marque a disputa de 3º lugar, se houver. A chave se atualiza sozinha.',
        'Imprima para preencher à mão durante o torneio ou copie para o grupo.',
      ]}
      premises={[
        'Com n equipes há sempre n − 1 jogos. Se n não for potência de 2, as melhores cabeças de chave avançam direto na primeira rodada (bye).',
        'O chaveamento separa as melhores equipes: a 1ª e a 2ª só se encontram na final.',
        'As rodadas seguintes mostram "Vencedor do jogo X", que você preenche conforme os resultados.',
      ]}
    >
      <Panel>
        <TeamsField teams={teams} />
        <label className="flex items-center gap-3 text-sm font-bold">
          <input type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
          Incluir disputa de 3º lugar
        </label>
      </Panel>
      <ErrorList errors={teams.errors} />
      {text && (
        <section aria-live="polite" aria-labelledby="previa" className="space-y-3">
          <h2 id="previa" className="text-base font-black">Prévia</h2>
          <Preview text={text} label="Prévia da tabela de mata-mata" />
          <OutputActions text={text} title="Tabela de mata-mata" filename="tabela-mata-mata" />
        </section>
      )}
    </ModeloLayout>
  );
}
