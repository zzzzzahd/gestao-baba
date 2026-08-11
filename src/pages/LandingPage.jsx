import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import {
  LogIn, Zap, Users, Shuffle, Radio, Star,
  UserCheck, Wallet, Trophy, ShieldCheck, Sparkles, CheckCircle2,
} from 'lucide-react';

// Passos do fluxo mostrados na landing: criar baba → sorteio → placar ao vivo.
// "criar" ainda usa um mockup em CSS (não existe print real desse fluxo ainda).
// "sorteio" e "placar" usam prints reais do Modo Rápido (screenshots/03 e 04),
// copiados para public/marketing/.
//
// Como adicionar um print novo depois que rodar screenshots-playstore.js
// corrigido: copie o arquivo de screenshots/<nome>.png para
// public/marketing/<nome-legivel>.png e adicione (ou troque) o campo
// `image`/`imageAlt` do passo correspondente abaixo. Não precisa mexer em
// mais nada — se o arquivo em public/marketing/ ainda não existir, o
// StepMockup cai sozinho pro mockup em CSS (veja o onError logo abaixo).
// Sugestão de mapeamento com as rotas do script (screenshots/05-home.png,
// 06-dashboard.png etc. depois de corrigidos): dá pra criar um 4º passo
// "Gestão" usando 06-dashboard ou 10-financeiro como print, por exemplo.
const steps = [
  {
    key: 'criar',
    label: 'Criar baba',
    icon: Users,
    title: 'Crie ou entre em um baba',
    desc: 'Cadastre seu grupo, ou entre em um já existente com o link/código de convite do coordenador.',
  },
  {
    key: 'sorteio',
    label: 'Sorteio',
    icon: Shuffle,
    title: 'Sorteio automático e balanceado',
    desc: 'O app monta os times com base na avaliação dos jogadores, sem discussão pra escalar.',
    image: '/marketing/sorteio-times.png',
    imageAlt: 'Tela do Draft Play mostrando o Modo Rápido com jogadores cadastrados e configuração de sorteio de times',
  },
  {
    key: 'placar',
    label: 'Placar ao vivo',
    icon: Radio,
    title: 'Acompanhe o placar em tempo real',
    desc: 'Todo mundo vê o resultado, o tempo de jogo e quem está na fila pra próxima partida.',
    image: '/marketing/placar-ao-vivo.png',
    imageAlt: 'Tela do Draft Play mostrando uma partida ao vivo com cronômetro, placar entre Time A e Time B e fila de próximos jogadores',
  },
];

const StepMockup = ({ step }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (step.image && !imgFailed) {
    return (
      <img
        src={step.image}
        alt={step.imageAlt}
        loading="lazy"
        decoding="async"
        // Se o arquivo ainda não existir em public/marketing/ (ex: print
        // real ainda não gerado), cai pro mockup em CSS abaixo em vez de
        // mostrar um ícone de imagem quebrada.
        onError={() => setImgFailed(true)}
        className="w-full max-h-[320px] object-contain object-top rounded-xl"
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="h-3 w-2/3 rounded-full bg-white/10" />
      <div className="h-9 rounded-xl bg-surface-3 border border-border-mid" />
      <div className="h-9 rounded-xl bg-surface-3 border border-border-mid" />
      <div className="h-9 rounded-xl bg-gradient-to-r from-cyan-electric to-blue-500 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-black">
        Entrar / Criar baba
      </div>
    </div>
  );
};

// Recursos em destaque — visão geral do que o app resolve, além do fluxo de sorteio.
const features = [
  { icon: UserCheck, title: 'Presença e falta', desc: 'Confirmação de presença, atraso e substituição automática pela reserva.' },
  { icon: Trophy, title: 'Conquistas e ranking', desc: 'Avaliação entre jogadores, badges e ranking de quem mais joga e marca.' },
  { icon: Wallet, title: 'Cobrança via Pix', desc: 'O coordenador cobra a mensalidade ou o rateio da quadra direto pelo app.' },
  { icon: ShieldCheck, title: 'Sem zap lotado', desc: 'Fila, escalação e resultado ficam registrados — sem depender de mensagem perdida.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-10 py-6">

        {/* Logo */}
        <div className="flex justify-center animate-fade-in">
          <Logo size="large" />
        </div>

        {/* Título + contexto mais completo do produto, pra quem cai direto no link */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-white via-cyan-electric to-white bg-clip-text text-transparent">
            Organize o baba sem zap lotado
          </h1>
          <p className="text-xs font-medium opacity-60 px-2 leading-relaxed">
            O Draft Play é o app de gestão pra quem organiza (ou joga) futebol de várzea, pelada e baba entre amigos.
            Sorteio automático de times, controle de presença, avaliação dos jogadores, ranking, cobrança via Pix
            e placar em tempo real — tudo num só lugar, pra quem organiza e pra quem só quer jogar.
          </p>
        </div>

        {/* CTAs — texto neutro: serve tanto pra quem cria/coordena um baba quanto pra quem só entra como jogador */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-5 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            <LogIn size={20} />
            Começar agora
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-mid" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.3em]">
              <span className="bg-black px-4 text-text-muted">ou</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/visitor')}
            className="w-full py-4 rounded-2xl font-black bg-surface-2 border border-border-mid text-text-mid hover:text-white hover:bg-surface-3 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
          >
            <Zap size={18} />
            Modo Visitante (Sem Conta)
          </button>
          <p className="text-center text-[10px] opacity-40 leading-relaxed px-4">
            Sorteie os times agora mesmo, sem cadastro — ideal pra quem só quer resolver o jogo de hoje.
          </p>
        </div>

        {/* Showcase do fluxo: criar baba → sorteio → placar ao vivo */}
        <div className="card-glass p-5 border border-cyan-electric/30 rounded-[2rem] relative overflow-hidden animate-slide-up">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-electric/10 blur-[80px] rounded-full" />
          <div className="relative z-10 space-y-4">

            <div className="flex gap-2 justify-center flex-wrap">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i === activeStep;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveStep(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                      active
                        ? 'bg-cyan-electric text-black'
                        : 'bg-surface-2 text-text-muted border border-border-mid'
                    }`}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-surface-2 border border-border-mid p-4 min-h-[140px] flex flex-col justify-center items-center">
              <StepMockup step={step} />
            </div>

            <div className="text-center px-2">
              <p className="text-sm font-bold">{step.title}</p>
              <p className="text-[11px] opacity-50 mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        </div>

        {/* Recursos em destaque */}
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-center text-lg font-black uppercase italic tracking-tight">
            Tudo que o baba precisa
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-glass p-4 rounded-2xl border border-border-mid space-y-2">
                  <Icon size={18} className="text-cyan-electric" />
                  <p className="text-xs font-bold">{f.title}</p>
                  <p className="text-[10px] opacity-50 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Para quem organiza x para quem joga */}
        <div className="grid grid-cols-1 gap-3 animate-fade-in">
          <div className="card-glass p-5 rounded-2xl border border-border-mid space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-electric">Pra quem organiza</p>
            <ul className="space-y-1.5 text-[11px] opacity-70">
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Sorteio de times sem discussão</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Controle de falta, atraso e reserva</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Cobrança de mensalidade/quadra via Pix</li>
            </ul>
          </div>
          <div className="card-glass p-5 rounded-2xl border border-border-mid space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-electric">Pra quem joga</p>
            <ul className="space-y-1.5 text-[11px] opacity-70">
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Confirma presença em 1 toque</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Acompanha o placar e a fila ao vivo</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-cyan-electric" /> Ganha avaliação, badges e ranking</li>
            </ul>
          </div>
        </div>

        {/* Planos — sem valores fixos aqui até o plano de assinatura ser publicado no app */}
        <div className="card-glass p-5 rounded-2xl border border-border-mid space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 justify-center">
            <Sparkles size={16} className="text-cyan-electric" />
            <p className="text-xs font-black uppercase tracking-widest">Grátis pra jogar</p>
          </div>
          <p className="text-[11px] text-center opacity-60 leading-relaxed px-2">
            Qualquer jogador entra e participa de baba(s) de graça. Quem organiza pode assinar o plano de coordenador
            pra criar seus próprios babas e torneios e liberar os recursos avançados de gestão.
          </p>
        </div>

        {/* Depoimento social — troque pelo relato real de um coordenador ou jogador que já usa o app */}
        <div className="card-glass p-5 border border-border-mid rounded-[1.5rem] space-y-3 animate-fade-in">
          <div className="flex gap-0.5 text-cyan-electric">
            {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
          </div>
          <p className="text-xs leading-relaxed opacity-80 italic">
            "Antes era zap lotado de mensagem discutindo time. Hoje o app sorteia e todo mundo já sabe pra que lado vai."
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
            Coordenador de baba{/* TODO: trocar por nome real com autorização da pessoa */}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40">
            <a href="/termos" className="hover:text-cyan-electric transition-colors">Termos de uso</a>
            <span className="opacity-30">·</span>
            <a href="/privacidade" className="hover:text-cyan-electric transition-colors">Privacidade</a>
          </div>
          <p className="text-center text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
            Powered by Draft Baba v3.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
