// src/pages/AboutPage.jsx
// Página institucional pública — reforça credibilidade do site pro crawler
// e pra qualquer visitante, sem depender de login.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Mail } from 'lucide-react';
import AdBanner from '../components/AdBanner';
import PublicPagesFooter from '../components/PublicPagesFooter';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-sm font-black uppercase tracking-widest text-cyan-electric">{title}</h2>
    <div className="text-xs text-text-mid leading-relaxed space-y-2 font-bold">{children}</div>
  </div>
);

const VideoDemo = ({ src, poster, title, desc }) => (
  <div className="space-y-2">
    <video
      controls
      preload="none"
      poster={poster}
      className="w-full rounded-xl border border-border-mid bg-black"
      style={{ aspectRatio: '9 / 16', maxHeight: '480px' }}
    >
      <source src={src} type="video/webm" />
      Seu navegador não suporta reprodução de vídeo.
    </video>
    <div>
      <p className="text-xs font-black text-white">{title}</p>
      <p className="text-[11px] text-text-mid font-bold leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pb-16">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-border-subtle px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-2 border border-border-mid flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Info size={16} className="text-cyan-electric" />
          <h1 className="text-sm font-black uppercase tracking-widest">Sobre o Draft Play</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-6">

        <Section title="O que é o Draft Play">
          <p>
            O Draft Play é uma plataforma de gestão de peladas e babas de futebol.
            Organiza sorteio equilibrado de times, controle de presença, financeiro
            do grupo e ranking dos jogadores — tudo em um só lugar, no lugar do
            grupo de WhatsApp lotado de mensagem discutindo escalação.
          </p>
        </Section>

        <Section title="Pra quem é">
          <p>
            Pra qualquer grupo de futebol amador que se organiza com regularidade —
            do racha de fim de semana entre amigos ao baba fixo semanal com
            mensalidade e cobrança de quem falta.
          </p>
        </Section>

        <Section title="Modo Visitante">
          <p>
            Quem só quer sortear os times de uma pelada avulsa, sem criar conta nem
            vincular a um grupo fixo, pode usar o{' '}
            <a href="/visitor" className="text-cyan-electric underline">Modo Visitante</a>{' '}
            — sorteio de times equilibrados na hora, de graça, sem cadastro.
          </p>
        </Section>

        <Section title="Como funciona">
          <p>
            O coordenador cria um baba e convida o grupo por link ou código. A partir
            daí, cada jogador confirma presença antes de cada rodada, e o app monta os
            times automaticamente levando em conta a avaliação de habilidade, físico e
            comprometimento que os próprios jogadores dão uns aos outros — em vez de
            deixar a escalação na base da discussão no grupo de WhatsApp.
          </p>
          <p>
            Durante a partida, o placar e o cronômetro ficam visíveis pra todo mundo em
            tempo real, com fila de próximos jogadores pra quem está de fora. No fim do
            dia, o histórico de gols, cartões e resultados fica registrado — e alimenta
            o ranking e as conquistas de cada jogador.
          </p>
        </Section>

        <Section title="Recursos principais">
          <p>
            Sorteio automático de times balanceados; controle de presença e falta, com
            substituição automática pela reserva; cobrança de mensalidade ou rateio via
            Pix direto no app; ranking e conquistas por jogador; e histórico completo de
            cada baba, incluindo estatísticas por jogo.
          </p>
        </Section>

        <Section title="Perguntas frequentes">
          <p>
            <strong>Preciso pagar pra usar?</strong> O Modo Visitante é gratuito e não
            exige cadastro. Criar conta e gerenciar um baba fixo também tem um plano
            gratuito, com limite de um grupo.
          </p>
          <p>
            <strong>Preciso ser o organizador do baba pra usar?</strong> Não. Qualquer
            jogador pode entrar em um baba já existente pelo link ou código de convite
            do coordenador — só quem cria o grupo assume o papel de coordenador.
          </p>
          <p>
            <strong>Funciona no celular?</strong> Sim, o Draft Play é um app web
            (PWA): dá pra instalar direto do navegador, sem passar pela loja de
            aplicativos.
          </p>
        </Section>

        <Section title="Veja funcionando">
          <p>
            Gravações de tela reais do app em uso (dados de um baba de demonstração).
            Toque em qualquer vídeo pra dar play, com som.
          </p>
        </Section>

        <div className="grid grid-cols-1 gap-6">
          <VideoDemo
            src="/videos/sorteio-e-partida-ao-vivo.webm"
            poster="/videos/sorteio-e-partida-ao-vivo.jpg"
            title="Sorteio de times e partida ao vivo"
            desc="Configuração do sorteio, adição de convidado avulso e acompanhamento da partida com cronômetro, placar e substituições em tempo real."
          />
          <VideoDemo
            src="/videos/rankings-e-comparacao.webm"
            poster="/videos/rankings-e-comparacao.jpg"
            title="Rankings e comparação entre jogadores"
            desc="Ranking de gols, assistências e MVP do grupo, com comparação 1x1 entre dois jogadores lado a lado."
          />
          <VideoDemo
            src="/videos/gestao-do-grupo.webm"
            poster="/videos/gestao-do-grupo.jpg"
            title="Gestão do grupo"
            desc="Confirmação de presença, partida em andamento e administração de atletas: suspender, nomear coordenador ou remover do baba."
          />
        </div>

        {/* ── Banner AdSense — página pública, com conteúdo editorial real ── */}
        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_ABOUT} className="my-2" />

        <Section title="Contato">
          <p className="flex items-center gap-2">
            <Mail size={14} className="text-cyan-electric shrink-0" />
            <a href="mailto:draftplayapp@gmail.com" className="text-cyan-electric underline">
              draftplayapp@gmail.com
            </a>
          </p>
        </Section>

        <PublicPagesFooter current="sobre" />

      </div>
    </div>
  );
}
