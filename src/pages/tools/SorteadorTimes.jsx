// src/pages/tools/SorteadorTimes.jsx
//
// Substitui o antigo "Modo Visitante" (/visitor): mesma lógica de sorteio
// (src/utils/teamBalancer.js), agora como ferramenta pública com explicação,
// colagem de lista e resultado na própria página (sem anúncio recompensado).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Shuffle } from 'lucide-react';
import { ToolLayout, Panel, ErrorList, Segmented, Field, CopyButton, inputCls } from '../../components/tools/ui';
import ExportTeamsImage from '../../components/tools/ExportTeamsImage';
import { TOOLS } from '../../content/toolsCatalog';
import { balanceTeams, teamCount, parsePlayerList } from '../../utils/teamBalancer';

const tool = TOOLS.find((t) => t.slug === 'sorteador');
const STORAGE_KEY = 'visitor_players_list'; // mesma chave do modo visitante: listas antigas continuam valendo
const LEVELS = { 1: 'Abaixo da média', 2: 'Na média', 3: 'Acima da média' };
const MIN_PER_TEAM = 2;
const MAX_PER_TEAM = 11;

let idSeq = 0;
const newId = () => `${Date.now()}-${idSeq++}`;

export default function SorteadorTimes() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('linha');
  const [stars, setStars] = useState(2);
  const [paste, setPaste] = useState('');
  const [perTeam, setPerTeam] = useState(5);
  const [perTeamText, setPerTeamText] = useState('5'); // texto digitado (permite apagar/digitar livremente)
  const [leftover, setLeftover] = useState('reserve');
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const resultRef = useRef(null);

  // Carrega/salva só no navegador (nada vai para servidor).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        setPlayers(saved.filter((p) => p && typeof p.name === 'string').map((p) => ({
          id: p.id ?? newId(), name: p.name, position: p.position === 'goleiro' ? 'goleiro' : 'linha',
          stars: [1, 2, 3].includes(p.stars) ? p.stars : 2,
        })));
      }
    } catch { /* lista corrompida: começa vazia */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); } catch { /* storage cheio */ }
  }, [players, loaded]);

  const need = perTeam * 2;
  const numTeams = teamCount(players.length, perTeam, leftover);
  const allEqualLevels = players.length > 0 && players.every((p) => p.stars === players[0].stars);

  const exists = (n) => players.some((p) => p.name.toLowerCase() === n.toLowerCase());

  // Campo "Jogadores por time": deixa digitar/apagar livremente e só aplica o limite ao sair do campo.
  const handlePerTeamChange = (e) => {
    const raw = e.target.value;
    setPerTeamText(raw);
    const n = Number(raw);
    if (raw !== '' && Number.isFinite(n) && n >= MIN_PER_TEAM && n <= MAX_PER_TEAM) {
      setPerTeam(Math.floor(n));
      setResult(null);
    }
  };
  const handlePerTeamBlur = () => {
    const n = Math.max(MIN_PER_TEAM, Math.min(MAX_PER_TEAM, Math.floor(Number(perTeamText)) || MIN_PER_TEAM));
    setPerTeam(n);
    setPerTeamText(String(n));
    setResult(null);
  };

  const addPlayer = () => {
    const n = name.trim();
    if (!n) { setFormError('Digite o nome do jogador.'); return; }
    if (exists(n)) { setFormError(`"${n}" já está na lista.`); return; }
    setFormError('');
    setPlayers((prev) => [...prev, { id: newId(), name: n.slice(0, 40), position, stars }]);
    setName('');
    setResult(null);
  };

  const importPaste = () => {
    const { names, duplicates } = parsePlayerList(paste);
    const fresh = names.filter((n) => !exists(n));
    if (!names.length) { setFormError('Nenhum nome encontrado no texto colado.'); return; }
    setFormError(duplicates.length || fresh.length < names.length ? 'Alguns nomes repetidos foram ignorados.' : '');
    setPlayers((prev) => [...prev, ...fresh.map((n) => ({ id: newId(), name: n, position: 'linha', stars: 2 }))]);
    setPaste('');
    setResult(null);
  };

  const update = (id, patch) => { setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); setResult(null); };
  const remove = (id) => { setPlayers((prev) => prev.filter((p) => p.id !== id)); setResult(null); };

  const errors = useMemo(() => {
    const e = [];
    if (players.length < need) e.push(`Com ${perTeam} por time, são necessários pelo menos ${need} jogadores (faltam ${need - players.length}).`);
    else if (numTeams < 2) e.push('Jogadores insuficientes para formar 2 times.');
    return e;
  }, [players.length, need, perTeam, numTeams]);

  const draw = () => {
    if (errors.length) return;
    const r = balanceTeams(players, numTeams, perTeam, leftover);
    setResult(r);
    setTimeout(() => resultRef.current?.focus(), 0);
  };

  const resultText = result && [
    ...result.teams.map((t) => `${t.name}\n${t.players.map((p) => `- ${p.name}${p.position === 'goleiro' ? ' (goleiro)' : ''}`).join('\n')}`),
    result.reserves.length ? `RESERVAS\n${result.reserves.map((p) => `- ${p.name}`).join('\n')}` : null,
  ].filter(Boolean).join('\n\n');

  const toScoreboard = () => {
    localStorage.setItem('temp_teams', JSON.stringify(result.teams));
    if (result.reserves.length) localStorage.setItem('temp_reserves', JSON.stringify(result.reserves));
    else localStorage.removeItem('temp_reserves');
    navigate('/visitor-match');
  };

  return (
    <ToolLayout
      slug={tool.slug}
      title="Sorteador de times equilibrados"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Monte a lista de jogadores, informe o nível e a posição de cada um (se quiser) e sorteie times parelhos para o baba. Sem cadastro, direto no navegador."
      howTo={[
        'Adicione os jogadores um a um ou cole a lista do grupo (um nome por linha). Quem for colado entra como "na média" e "linha".',
        'Ajuste o nível (abaixo, na média ou acima) e a posição (linha ou goleiro) de cada jogador na lista.',
        'Defina quantos jogam por time e o que fazer com quem sobrar. Clique em sortear; sorteie de novo quantas vezes quiser.',
        'Copie os times para mandar no grupo ou use o placar rápido para marcar a partida.',
      ]}
      premises={[
        'Goleiros são distribuídos primeiro, um por time. Se houver mais goleiros que times, os que sobram jogam na linha.',
        'Os demais jogadores são ordenados por nível e distribuídos em serpentina (A B C D, D C B A, A B C D…), para que cada time receba craques, medianos e iniciantes em proporção parecida. Dentro do mesmo nível, a ordem é aleatória.',
        'Com "Sobra vira reserva", todos os times têm o mesmo tamanho e quem sobra fica na reserva. Com "Time com suplente", todos jogam e os primeiros times ficam com um jogador a mais.',
      ]}
      limitations="O equilíbrio depende dos níveis que você informar: o método é uma heurística e não garante times idênticos, principalmente com poucos jogadores. Se ninguém tiver nível definido, o sorteio é praticamente aleatório."
    >
      <Panel>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="col-span-3 sm:col-span-1">
            <Field label="Jogadores por time" hint={`Mínimo de ${need} jogadores`}>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_PER_TEAM}
                max={MAX_PER_TEAM}
                value={perTeamText}
                onChange={handlePerTeamChange}
                onBlur={handlePerTeamBlur}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="col-span-3 sm:col-span-2">
            <Segmented label="Se sobrar gente" options={[{ value: 'reserve', label: 'Vira reserva' }, { value: 'substitute', label: 'Time com suplente' }]} value={leftover} onChange={(v) => { setLeftover(v); setResult(null); }} />
          </div>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-base font-black">Adicionar jogador</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Nome">
            <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()} className={inputCls} />
          </Field>
          <Field label="Posição">
            <select value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls}>
              <option value="linha">Linha</option>
              <option value="goleiro">Goleiro</option>
            </select>
          </Field>
          <Field label="Nível">
            <select value={stars} onChange={(e) => setStars(Number(e.target.value))} className={inputCls}>
              {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <button type="button" onClick={addPlayer} className="px-5 py-3 rounded-xl border border-cyan-electric/30 bg-cyan-electric/10 text-cyan-electric text-xs font-black uppercase tracking-wider">
          + Adicionar
        </button>

        <Field label="Ou cole uma lista (um nome por linha)">
          <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} className={inputCls} placeholder={'1. João\n2. Maria'} />
        </Field>
        <button type="button" onClick={importPaste} disabled={!paste.trim()} className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider disabled:opacity-40">
          Importar lista
        </button>
        {formError && <p role="alert" className="text-[12px] text-red-400 font-bold">{formError}</p>}
      </Panel>

      {players.length > 0 && (
        <section aria-labelledby="lista" className="card-glass rounded-2xl border border-border-mid p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="lista" className="text-base font-black">Jogadores ({players.length})</h2>
            <button type="button" onClick={() => { setPlayers([]); setResult(null); }} className="flex items-center gap-1 text-[11px] font-black text-red-400 uppercase tracking-wider">
              <Trash2 size={12} aria-hidden="true" /> Limpar tudo
            </button>
          </div>
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-white/5 rounded-xl border border-white/5 p-2.5">
                <span className="text-sm font-bold truncate pl-1">{p.name}</span>
                <select aria-label={`Posição de ${p.name}`} value={p.position} onChange={(e) => update(p.id, { position: e.target.value })} className="bg-black/40 border border-white/10 rounded-lg text-xs px-2 py-2">
                  <option value="linha">Linha</option>
                  <option value="goleiro">Goleiro</option>
                </select>
                <select aria-label={`Nível de ${p.name}`} value={p.stars} onChange={(e) => update(p.id, { stars: Number(e.target.value) })} className="bg-black/40 border border-white/10 rounded-lg text-xs px-2 py-2">
                  {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button type="button" aria-label={`Remover ${p.name}`} onClick={() => remove(p.id)} className="p-2 text-red-400">
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] opacity-50">A lista fica salva só neste navegador, para você não perdê-la ao recarregar. "Limpar tudo" apaga.</p>
        </section>
      )}

      {players.length > 0 && <ErrorList errors={errors} />}

      {players.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={draw} disabled={errors.length > 0}
            className="w-full py-4 rounded-2xl font-black text-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}>
            <Shuffle size={18} aria-hidden="true" /> {result ? 'Sortear de novo' : 'Sortear times'}
          </button>
          {allEqualLevels && !errors.length && (
            <p role="status" className="text-xs text-yellow-300">Todos os jogadores estão com o mesmo nível: o sorteio será praticamente aleatório. Ajuste os níveis para equilibrar melhor.</p>
          )}
        </div>
      )}

      {result && (
        <section ref={resultRef} tabIndex={-1} aria-live="polite" aria-labelledby="times" className="space-y-4 outline-none">
          <h2 id="times" className="text-base font-black">Times sorteados</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.teams.map((t) => (
              <div key={t.id} className="card-glass rounded-xl border border-border-mid p-4">
                <h3 className="text-sm font-black text-cyan-electric">{t.name}</h3>
                <p className="text-[11px] opacity-50 mb-2">{t.players.length} jogadores · soma de níveis {t.starSum}</p>
                <ul className="text-sm space-y-1">
                  {t.players.map((p) => <li key={p.id}>{p.name}{p.position === 'goleiro' ? ' 🧤' : ''}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {result.reserves.length > 0 && (
            <p className="text-sm"><strong>Reservas:</strong> {result.reserves.map((p) => p.name).join(', ')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={resultText} label="Copiar times" />
            <ExportTeamsImage teams={result.teams} reserves={result.reserves} />
            <button type="button" onClick={toScoreboard} className="text-xs font-black uppercase tracking-wider text-cyan-electric underline">
              Usar no placar rápido →
            </button>
          </div>
        </section>
      )}
    </ToolLayout>
  );
}