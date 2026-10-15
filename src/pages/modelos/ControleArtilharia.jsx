import React, { useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { ModeloLayout, Preview, OutputActions } from '../../components/tools/ModeloUI';
import { Panel, inputCls } from '../../components/tools/ui';
import { rankScorers, scorersToText } from '../../utils/modelosTorneio';
import { toCsv } from '../../utils/exportFile';

let seq = 0;
const blank = () => ({ id: `g${seq++}`, player: '', team: '', goals: '' });

export default function ControleArtilharia() {
  const [rows, setRows] = useState(() => [blank(), blank(), blank()]);
  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const ranking = useMemo(() => rankScorers(rows.map((r) => ({ ...r, goals: r.goals === '' ? NaN : Number(r.goals) }))), [rows]);
  const text = scorersToText(ranking);
  const csv = toCsv([['Pos', 'Jogador', 'Equipe', 'Gols'], ...ranking.map((r) => [r.pos, r.player, r.team, r.goals])]);
  const ignored = rows.filter((r) => r.player.trim() || r.team.trim() || r.goals !== '').length - rows.filter((r) => r.player.trim() && Number.isInteger(Number(r.goals)) && Number(r.goals) >= 1 && Number(r.goals) <= 99 && r.goals !== '').length;

  return (
    <ModeloLayout
      slug="artilharia"
      intro="Registre quantos gols cada jogador fez e acompanhe o ranking de artilheiros do torneio. Se você lançar o mesmo jogador mais de uma vez, os gols são somados."
      howTo={[
        'Digite o nome do jogador, a equipe e os gols. Adicione uma linha por jogo em que ele marcou, ou o total acumulado.',
        'O ranking se atualiza sozinho. Copie, imprima ou baixe em CSV.',
      ]}
      premises={[
        'Jogadores com o mesmo nome em equipes diferentes são contados separadamente; maiúsculas e acentos não diferenciam o mesmo jogador na mesma equipe.',
        'Quem tem o mesmo número de gols divide a posição (1º, 1º, 3º...). A ordem entre empatados é alfabética, só para exibição.',
        'Linhas sem nome ou com gols fora de 1 a 99 são ignoradas.',
      ]}
      limitations="Os dados ficam só nesta página: ao recarregar, são apagados. Copie ou baixe antes de sair."
    >
      <Panel>
        <h2 className="text-base font-black">Gols registrados</h2>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1fr_1fr_4.5rem_auto] gap-2 items-center">
              <input type="text" maxLength={40} aria-label={`Jogador ${i + 1}`} placeholder="Jogador" value={r.player} onChange={(e) => patch(r.id, { player: e.target.value })} className={inputCls} />
              <input type="text" maxLength={40} aria-label={`Equipe do jogador ${i + 1}`} placeholder="Equipe" value={r.team} onChange={(e) => patch(r.id, { team: e.target.value })} className={inputCls} />
              <input type="number" inputMode="numeric" min={1} max={99} aria-label={`Gols do jogador ${i + 1}`} placeholder="Gols" value={r.goals} onChange={(e) => patch(r.id, { goals: e.target.value })} className={inputCls} />
              <button type="button" aria-label={`Remover linha ${i + 1}`} onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [blank()]))} className="p-2 text-red-400"><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-4 items-center">
          <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-electric"><Plus size={12} aria-hidden="true" /> Adicionar linha</button>
          <button type="button" onClick={() => setRows([blank(), blank(), blank()])} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">Limpar tudo</button>
        </div>
        {ignored > 0 && <p role="status" className="text-xs text-yellow-300">{ignored} linha(s) incompleta(s) ou com gols inválidos ficaram fora do ranking.</p>}
      </Panel>

      <section aria-live="polite" aria-labelledby="rank" className="space-y-3">
        <h2 id="rank" className="text-base font-black">Ranking de artilheiros</h2>
        {ranking.length === 0 ? (
          <p className="text-sm opacity-60">Registre pelo menos um jogador com gols para ver o ranking.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-mid">
            <table className="w-full text-sm">
              <caption className="sr-only">Ranking de artilheiros</caption>
              <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
                <tr><th scope="col" className="p-3">#</th><th scope="col" className="p-3">Jogador</th><th scope="col" className="p-3">Equipe</th><th scope="col" className="p-3">Gols</th></tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={`${r.player}|${r.team}`} className="border-t border-white/5">
                    <td className="p-3">{r.pos}º</td><th scope="row" className="p-3 text-left font-bold">{r.player}</th><td className="p-3">{r.team || '—'}</td><td className="p-3 font-black text-cyan-electric">{r.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Preview text={text} label="Texto do ranking de artilheiros" />
        <OutputActions text={text} csv={ranking.length ? csv : undefined} title="Artilharia" filename="artilharia" />
      </section>
    </ModeloLayout>
  );
}
