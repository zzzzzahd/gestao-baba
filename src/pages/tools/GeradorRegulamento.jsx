// src/pages/tools/GeradorRegulamento.jsx
import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Printer, Download } from 'lucide-react';
import { ToolLayout, Panel, ErrorList, Segmented, IntField, Field, CopyButton, inputCls, toInt } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import { TIEBREAKERS, defaultRegulamento, validateRegulamento, buildRegulamento } from '../../utils/regulamento';
import { downloadTextFile, printText } from '../../utils/exportFile';

const tool = TOOLS.find((t) => t.slug === 'gerador-de-regulamento');

const FORMATS = [
  { value: 'knockout', label: 'Mata-mata' },
  { value: 'roundrobin', label: 'Pontos corridos' },
  { value: 'groups', label: 'Grupos' },
];

const initial = () => {
  const d = defaultRegulamento();
  return {
    ...d,
    teams: String(d.teams), legs: String(d.legs), groupCount: String(d.groupCount), advancePerGroup: String(d.advancePerGroup),
    playersPerTeam: String(d.playersPerTeam), minPlayers: String(d.minPlayers), maxRegistered: String(d.maxRegistered),
    matchMinutes: String(d.matchMinutes), pointsWin: String(d.pointsWin), pointsDraw: String(d.pointsDraw), pointsLoss: String(d.pointsLoss),
    lateTolerance: String(d.lateTolerance), woLimit: String(d.woLimit), yellowSuspensionAt: String(d.yellowSuspensionAt),
  };
};

const NUMERIC = ['teams', 'groupCount', 'advancePerGroup', 'playersPerTeam', 'minPlayers', 'maxRegistered', 'matchMinutes',
  'pointsWin', 'pointsDraw', 'pointsLoss', 'lateTolerance', 'woLimit', 'yellowSuspensionAt'];

const toConfig = (f) => {
  const cfg = { ...f, legs: f.legs === '2' ? 2 : 1 };
  NUMERIC.forEach((k) => { cfg[k] = toInt(f[k]); });
  return cfg;
};

export default function GeradorRegulamento() {
  const [f, setF] = useState(initial);
  const [text, setText] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setEvt = (k) => (e) => set(k)(e.target.value);

  const cfg = useMemo(() => toConfig(f), [f]);
  const errors = useMemo(() => validateRegulamento(cfg), [cfg]);
  const key = JSON.stringify(cfg);

  const generate = () => {
    if (errors.length) return;
    setText(buildRegulamento(cfg).text);
    setGeneratedKey(key);
  };

  const move = (i, d) => setF((p) => {
    const a = [...p.tiebreakers];
    const j = i + d;
    if (j < 0 || j >= a.length) return p;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...p, tiebreakers: a };
  });
  const removeTb = (id) => setF((p) => ({ ...p, tiebreakers: p.tiebreakers.filter((x) => x !== id) }));
  const addTb = (id) => id && setF((p) => ({ ...p, tiebreakers: [...p.tiebreakers, id] }));
  const available = TIEBREAKERS.filter((t) => !f.tiebreakers.includes(t.id));

  const showTable = f.format !== 'knockout';
  const showKnockoutDraw = f.format === 'knockout' || (f.format === 'groups' && f.knockoutAfterGroups);
  const fileBase = (f.name.trim() || 'regulamento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'regulamento';

  return (
    <ToolLayout
      slug={tool.slug}
      title="Gerador de regulamento"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Responda às perguntas sobre o seu torneio e receba um modelo de regulamento completo, em texto editável, para você revisar, ajustar e divulgar para as equipes."
      howTo={[
        'Preencha o nome, o formato e as regras que valem para o seu torneio. Os campos já vêm com valores comuns no futebol amador.',
        'Clique em "Gerar regulamento". O texto aparece numa caixa que você pode editar livremente.',
        'Revise tudo com a sua organização, copie, imprima ou baixe como arquivo de texto e divulgue para as equipes.',
      ]}
      premises={[
        'O texto é montado a partir das suas escolhas: formato, pontuação, critérios de desempate em ordem, regras de atraso e W.O., cartões e disposições finais. O número de jogos usa a mesma conta da calculadora de torneio.',
        'O sorteio é sempre o último critério de desempate, para que a classificação nunca fique sem resposta.',
        'Em mata-mata, o empate é resolvido por pênaltis (ou prorrogação seguida de pênaltis). Pontuação e critérios de classificação só aparecem para pontos corridos e grupos.',
      ]}
      limitations="É um modelo para revisão e adaptação, não um documento jurídico. Ele não conhece o seu local, o seguro, a arbitragem ou as regras da quadra: confira com quem organiza e complemente o que faltar."
    >
      <Panel>
        <h2 className="text-base font-black">1. Identificação</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do torneio"><input type="text" maxLength={80} value={f.name} onChange={setEvt('name')} className={inputCls} placeholder="Ex.: Copa Quarta-feira" /></Field>
          <Field label="Organização (opcional)"><input type="text" maxLength={80} value={f.organizer} onChange={setEvt('organizer')} className={inputCls} placeholder="Ex.: Grupo do Baba da Quarta" /></Field>
          <Field label="Local (opcional)"><input type="text" maxLength={80} value={f.place} onChange={setEvt('place')} className={inputCls} placeholder="Ex.: Quadra Central" /></Field>
          <Field label="Data ou período (opcional)"><input type="text" maxLength={60} value={f.dateText} onChange={setEvt('dateText')} className={inputCls} placeholder="Ex.: nos dias 8 e 9 de novembro" /></Field>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-base font-black">2. Formato</h2>
        <Segmented label="Formato" options={FORMATS} value={f.format} onChange={set('format')} />
        <div className="grid sm:grid-cols-2 gap-4">
          <IntField label="Equipes" value={f.teams} onChange={set('teams')} min={2} max={64} />
          {f.format === 'groups' && <IntField label="Grupos" value={f.groupCount} onChange={set('groupCount')} min={2} max={32} />}
        </div>
        {f.format !== 'knockout' && (
          <Segmented label="Turnos" options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]} value={f.legs} onChange={set('legs')} />
        )}
        {f.format === 'groups' && (
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={f.knockoutAfterGroups} onChange={(e) => set('knockoutAfterGroups')(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              Eliminatórias depois dos grupos
            </label>
            {f.knockoutAfterGroups && <IntField label="Classificados por grupo" value={f.advancePerGroup} onChange={set('advancePerGroup')} min={1} max={16} />}
          </div>
        )}
        {showKnockoutDraw && (
          <>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={f.thirdPlace} onChange={(e) => set('thirdPlace')(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              Disputa de 3º lugar
            </label>
            <Segmented label="Empate em jogo eliminatório" options={[{ value: 'penaltis', label: 'Pênaltis' }, { value: 'prorrogacao', label: 'Prorrogação + pênaltis' }]} value={f.knockoutDraw} onChange={set('knockoutDraw')} />
          </>
        )}
      </Panel>

      <Panel>
        <h2 className="text-base font-black">3. Equipes e partidas</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <IntField label="Jogadores em campo" value={f.playersPerTeam} onChange={set('playersPerTeam')} min={3} max={15} />
          <IntField label="Mínimo para iniciar" value={f.minPlayers} onChange={set('minPlayers')} min={1} max={15} />
          <IntField label="Máximo de inscritos" value={f.maxRegistered} onChange={set('maxRegistered')} min={3} max={40} />
          <IntField label="Duração da partida (min)" value={f.matchMinutes} onChange={set('matchMinutes')} min={5} max={120} />
          <IntField label="Tolerância de atraso (min)" value={f.lateTolerance} onChange={set('lateTolerance')} min={0} max={60} />
          <IntField label="W.O. para eliminar" value={f.woLimit} onChange={set('woLimit')} min={1} max={5} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Segmented label="Tempos" options={[{ value: 'unico', label: 'Tempo único' }, { value: 'dois', label: 'Dois tempos' }]} value={f.halves} onChange={set('halves')} />
          <Segmented label="Placar do W.O." options={[{ value: '1x0', label: '1 x 0' }, { value: '2x0', label: '2 x 0' }, { value: '3x0', label: '3 x 0' }]} value={f.woScore} onChange={set('woScore')} />
        </div>
      </Panel>

      {showTable && (
        <Panel>
          <h2 className="text-base font-black">4. Pontuação e desempate</h2>
          <div className="grid grid-cols-3 gap-4">
            <IntField label="Vitória" value={f.pointsWin} onChange={set('pointsWin')} min={0} max={10} />
            <IntField label="Empate" value={f.pointsDraw} onChange={set('pointsDraw')} min={0} max={10} />
            <IntField label="Derrota" value={f.pointsLoss} onChange={set('pointsLoss')} min={0} max={10} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Critérios de desempate, em ordem</p>
            {f.tiebreakers.length === 0 && <p className="text-xs opacity-60">Nenhum critério: o desempate será direto por sorteio.</p>}
            <ol className="space-y-2">
              {f.tiebreakers.map((id, i) => {
                const t = TIEBREAKERS.find((x) => x.id === id);
                return (
                  <li key={id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm">
                    <span className="font-black text-cyan-electric w-5 text-center">{i + 1}</span>
                    <span className="flex-1 leading-snug">{t.label}</span>
                    <button type="button" aria-label={`Subir ${t.label}`} disabled={i === 0} onClick={() => move(i, -1)} className="p-2 disabled:opacity-30"><ArrowUp size={14} aria-hidden="true" /></button>
                    <button type="button" aria-label={`Descer ${t.label}`} disabled={i === f.tiebreakers.length - 1} onClick={() => move(i, 1)} className="p-2 disabled:opacity-30"><ArrowDown size={14} aria-hidden="true" /></button>
                    <button type="button" aria-label={`Remover ${t.label}`} onClick={() => removeTb(id)} className="p-2 text-red-400"><X size={14} aria-hidden="true" /></button>
                  </li>
                );
              })}
            </ol>
            {available.length > 0 && (
              <Field label="Adicionar critério">
                <select value="" onChange={(e) => addTb(e.target.value)} className={inputCls}>
                  <option value="">Escolha…</option>
                  {available.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
            )}
            <p className="text-[11px] opacity-50">O sorteio é adicionado automaticamente como último critério.</p>
          </div>
        </Panel>
      )}

      <Panel>
        <h2 className="text-base font-black">{showTable ? '5' : '4'}. Conduta e extras</h2>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <IntField label="Amarelos para suspensão (0 = desligado)" value={f.yellowSuspensionAt} onChange={set('yellowSuspensionAt')} min={0} max={10} />
          <label className="flex items-center gap-3 text-sm font-bold">
            <input type="checkbox" checked={f.redSuspension} onChange={(e) => set('redSuspension')(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            Cartão vermelho suspende o jogador
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Inscrição (opcional)"><input type="text" maxLength={120} value={f.fee} onChange={setEvt('fee')} className={inputCls} placeholder="Ex.: R$ 100 por equipe, até dia 5" /></Field>
          <Field label="Premiação (opcional)"><input type="text" maxLength={160} value={f.prize} onChange={setEvt('prize')} className={inputCls} placeholder="Ex.: troféu e medalhas para o campeão" /></Field>
        </div>
      </Panel>

      <ErrorList errors={errors} />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={generate} disabled={errors.length > 0}
          className="px-6 py-3 rounded-xl font-black text-black text-xs uppercase tracking-widest disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}>
          {text ? 'Gerar novamente' : 'Gerar regulamento'}
        </button>
        <button type="button" onClick={() => { setF(initial()); setText(''); setGeneratedKey(''); }} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">
          Restaurar padrões
        </button>
      </div>

      {text && (
        <section aria-labelledby="regulamento-pronto" className="space-y-3">
          <h2 id="regulamento-pronto" className="text-base font-black">Seu regulamento (editável)</h2>
          {generatedKey !== key && (
            <p role="status" className="text-xs text-yellow-300">Você alterou o formulário depois de gerar. Clique em "Gerar novamente" para refletir as mudanças (isso substitui as edições feitas no texto).</p>
          )}
          <Field label="Texto do regulamento">
            <textarea rows={22} value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={text} label="Copiar texto" />
            <button type="button" onClick={() => printText(`Regulamento — ${f.name.trim()}`, text)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider">
              <Printer size={14} aria-hidden="true" /> Imprimir
            </button>
            <button type="button" onClick={() => downloadTextFile(`regulamento-${fileBase}.txt`, text)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider">
              <Download size={14} aria-hidden="true" /> Baixar .txt
            </button>
          </div>
        </section>
      )}
    </ToolLayout>
  );
}
