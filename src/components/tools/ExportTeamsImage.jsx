// src/components/tools/ExportTeamsImage.jsx
//
// "Baixar imagem dos times". Copiar o texto continua livre e sem anúncio.
// Se VITE_TOOLS_REWARDED_EXPORT=true, o download da IMAGEM passa por um anúncio
// recompensado opcional (RewardedAdGate); com a variável desligada (padrão),
// o download é direto. html2canvas vem do CDN já carregado no index.html.
import React, { useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import RewardedAdGate from '../RewardedAdGate';
import { rewardedExportEnabled } from '../../utils/adEligibility';

export default function ExportTeamsImage({ teams, reserves = [] }) {
  const cardRef = useRef(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setError('');
    if (typeof window.html2canvas !== 'function') {
      setError('Não foi possível gerar a imagem agora. Use "Copiar times".');
      return;
    }
    setBusy(true);
    try {
      const canvas = await window.html2canvas(cardRef.current, { backgroundColor: '#000000', scale: 2, useCORS: true });
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'times-do-baba.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Não foi possível gerar a imagem. Use "Copiar times".');
    } finally {
      setBusy(false);
    }
  };

  const onClick = () => (rewardedExportEnabled() ? setGateOpen(true) : download());

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider disabled:opacity-50"
      >
        <ImageIcon size={14} aria-hidden="true" />
        {busy ? 'Gerando imagem…' : 'Baixar imagem dos times'}
      </button>
      {rewardedExportEnabled() && (
        <span className="text-[11px] opacity-50">Exige assistir a um anúncio curto. Copiar o texto é sempre grátis.</span>
      )}
      {error && <p role="alert" className="w-full text-[12px] text-red-400 font-bold">{error}</p>}

      {/* Cartão usado só para gerar a imagem (fora da tela) */}
      <div aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={cardRef} style={{ width: 720, padding: 32, background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#00f2ff', margin: 0 }}>Times do baba</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            {teams.map((t) => (
              <div key={t.id} style={{ border: '1px solid #333', borderRadius: 12, padding: 14 }}>
                <p style={{ fontWeight: 900, color: '#00f2ff', margin: '0 0 8px' }}>{t.name}</p>
                {t.players.map((p) => (
                  <p key={p.id} style={{ margin: '3px 0', fontSize: 15 }}>{p.name}{p.position === 'goleiro' ? ' 🧤' : ''}</p>
                ))}
              </div>
            ))}
          </div>
          {reserves.length > 0 && (
            <p style={{ marginTop: 16, fontSize: 14 }}><strong>Reservas:</strong> {reserves.map((p) => p.name).join(', ')}</p>
          )}
          <p style={{ marginTop: 20, fontSize: 11, color: '#777' }}>Sorteado em draftplay.app.br/ferramentas/sorteador</p>
        </div>
      </div>

      <RewardedAdGate
        open={gateOpen}
        placementName="exportar-times"
        title="Baixar imagem dos times"
        description="Assista a um anúncio curto para baixar a imagem. Copiar o texto continua grátis."
        onGranted={() => { setGateOpen(false); download(); }}
        onCancel={() => setGateOpen(false)}
      />
    </>
  );
}
