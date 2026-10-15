import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ModeloLayout, Preview, OutputActions } from '../../components/tools/ModeloUI';
import { Panel, Segmented } from '../../components/tools/ui';
import { defaultRegulamento, buildRegulamento } from '../../utils/regulamento';

const FORMATS = [
  { value: 'roundrobin', label: 'Pontos corridos' },
  { value: 'knockout', label: 'Mata-mata' },
  { value: 'groups', label: 'Grupos' },
];
const TEAMS = { roundrobin: 6, knockout: 8, groups: 8 };

export default function RegulamentoModelo() {
  const [format, setFormat] = useState('roundrobin');
  const { text } = buildRegulamento({ ...defaultRegulamento(), name: 'Torneio Interno do Baba', format, teams: TEAMS[format], groupCount: 2 });
  return (
    <ModeloLayout
      slug="regulamento-torneio-interno"
      intro="Um regulamento-base para torneio interno de baba, já escrito: escolha o formato e veja o texto completo. Para trocar nome, número de equipes, pontuação e regras, use o gerador."
      howTo={[
        'Escolha o formato do torneio para ver o modelo correspondente.',
        'Copie, imprima ou baixe o texto, ou abra o gerador de regulamento para personalizar nome, equipes, pontuação, desempate e conduta.',
        'Revise com a organização antes de divulgar: o texto é um ponto de partida.',
      ]}
      premises={[
        'O modelo usa valores comuns no futebol amador: vitória 3 pontos, empate 1, partidas de 20 minutos, tolerância de 10 minutos e W.O. de 1 x 0.',
        'Em mata-mata, o empate é decidido por pênaltis; em pontos corridos e grupos, o texto traz os critérios de desempate em ordem.',
      ]}
      limitations="Não é um documento jurídico. Ajuste local, premiação, inscrição e regras da quadra ao seu caso."
    >
      <Panel>
        <Segmented label="Formato do modelo" options={FORMATS} value={format} onChange={setFormat} />
        <Link to="/ferramentas/gerador-de-regulamento" className="inline-block text-xs font-black uppercase tracking-wider text-cyan-electric underline">
          Personalizar no gerador de regulamento →
        </Link>
      </Panel>
      <section aria-labelledby="previa" className="space-y-3">
        <h2 id="previa" className="text-base font-black">Prévia</h2>
        <Preview text={text} label="Prévia do regulamento" />
        <OutputActions text={text} title="Regulamento de torneio interno" filename="regulamento-torneio-interno" />
      </section>
    </ModeloLayout>
  );
}
