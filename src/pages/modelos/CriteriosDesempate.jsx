import React, { useState } from 'react';
import { ModeloLayout, Preview, OutputActions } from '../../components/tools/ModeloUI';
import { Panel, Segmented } from '../../components/tools/ui';
import { TIEBREAKERS } from '../../utils/regulamento';
import { TIEBREAK_PRESETS, TIEBREAK_HELP, tiebreakText } from '../../utils/modelosTorneio';

export default function CriteriosDesempate() {
  const [presetId, setPresetId] = useState('padrao');
  const preset = TIEBREAK_PRESETS.find((p) => p.id === presetId);
  const text = tiebreakText(preset.order);
  return (
    <ModeloLayout
      slug="criterios-de-desempate"
      intro="Quando duas equipes terminam com os mesmos pontos, quem fica na frente? Defina isso antes do torneio começar. Compare três ordens comuns e copie o texto pronto para o regulamento."
      howTo={[
        'Escolha uma das ordens de desempate e leia o que cada critério significa na prática.',
        'Copie o texto para o seu regulamento ou imprima para fixar no local do torneio.',
      ]}
      premises={[
        'As ordens são sugestões comuns no futebol amador, não regras oficiais de nenhuma federação.',
        'O sorteio fica sempre por último, para que a classificação nunca fique sem resposta.',
        'Confronto direto funciona bem com 2 equipes empatadas; com 3 ou mais, defina no regulamento como será a mini-classificação entre elas.',
      ]}
    >
      <Panel>
        <Segmented label="Ordem de desempate" options={TIEBREAK_PRESETS.map((p) => ({ value: p.id, label: p.name }))} value={presetId} onChange={setPresetId} />
      </Panel>
      <section aria-labelledby="entenda" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
        <h2 id="entenda" className="text-base font-black">O que cada critério significa</h2>
        <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed">
          {preset.order.map((id) => (
            <li key={id}>
              <strong>{TIEBREAKERS.find((t) => t.id === id).label}.</strong>{' '}
              <span className="opacity-75">{TIEBREAK_HELP[id]}</span>
            </li>
          ))}
          <li><strong>Sorteio.</strong> <span className="opacity-75">Realizado pela organização, na presença dos responsáveis, quando todo o resto empata.</span></li>
        </ol>
      </section>
      <section aria-labelledby="previa" className="space-y-3">
        <h2 id="previa" className="text-base font-black">Texto para o regulamento</h2>
        <Preview text={text} label="Texto dos critérios de desempate" />
        <OutputActions text={text} title="Critérios de desempate" filename="criterios-de-desempate" />
      </section>
    </ModeloLayout>
  );
}
