import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import AdBanner from '../components/AdBanner';
import PublicPagesFooter from '../components/PublicPagesFooter';
import {
  LogIn, Zap, Users, Shuffle, Radio, UserCheck, Wallet, Trophy,
  Sparkles, MessageCircle, Clock, Flame, ChevronDown, ClipboardCheck,
  Lock, Smartphone, CheckCircle2, Mail, BookOpen, BarChart3, Globe, Check,
} from 'lucide-react';

// Prints reais ficam em public/marketing/. Se o arquivo não existir, a
// imagem some e o bloco mostra o ícone do passo (sem imagem quebrada).
const Shot = ({ src, alt, icon: Icon, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`w-full object-contain object-top rounded-xl ${className}`}
      />
    );
  }
  return (
    <div className={`w-full rounded-xl bg-surface-2 border border-border-mid flex items-center justify-center ${className}`}>
      <Icon size={36} className="text-cyan-electric opacity-70" />
    </div>
  );
};

// Dor → solução (uma linha cada), com o custo da dor.
const pains = [
  { icon: MessageCircle, pain: 'Confirmação perdida no WhatsApp', fix: 'Presença em tempo real, com reserva automática.' },
  { icon: Clock, pain: 'Falta e atraso de última hora', fix: 'O primeiro da reserva entra no lugar, sem correria.' },
  { icon: Flame, pain: 'Discussão na hora de dividir os times', fix: 'Times justos, balanceados pelo nível de cada jogador.' },
  { icon: Wallet, pain: 'Cobrar mensalidade e rateio da quadra', fix: 'Cobrança via Pix com QR code dentro do app.' },
];

// Passos: criar → convidar → confirmar → sortear/jogar.
const steps = [
  { icon: Users, mock: 'criar', title: 'Crie o baba', desc: 'Você vira presidente do grupo e convida o pessoal.' },
  { icon: UserCheck, mock: 'presenca', title: 'Convidados confirmam', desc: 'Entram pelo convite e confirmam presença. Faltou, a reserva entra.' },
  {
    icon: Shuffle, title: 'Sorteie os times', desc: 'O app monta times equilibrados pelo nível dos jogadores.',
    image: '/marketing/sorteio-times.png',
    alt: 'Tela do Draft Play com jogadores cadastrados e configuração de sorteio de times',
  },
  {
    icon: Radio, title: 'Jogue e registre', desc: 'Placar, cronômetro e fila ao vivo. Gols e assistências alimentam o ranking e o perfil de cada um.',
    image: '/marketing/placar-ao-vivo.png',
    alt: 'Tela do Draft Play com partida ao vivo, cronômetro, placar e fila de próximos jogadores',
  },
];

// Recursos pelo que resolvem, na ordem da jornada.
const features = [
  { icon: UserCheck, title: 'Presença em tempo real', desc: 'Evite ir pra quadra com o time desfalcado.' },
  { icon: Shuffle, title: 'Sorteio balanceado', desc: 'Times parelhos em segundos, sem briga.' },
  { icon: Radio, title: 'Placar e fila ao vivo', desc: 'Cronômetro, gols, assistências e cartões registrados.' },
  { icon: BarChart3, title: 'Ranking de gols e assistências', desc: 'Quem mais joga e quem mais decide, partida após partida.' },
  { icon: Trophy, title: 'Divisões e conquistas', desc: 'Badges e divisões de Ferro a Diamante que sobem e descem.' },
  { icon: Globe, title: 'Perfil público', desc: 'Mostre seus feitos e conquistas num perfil que você pode divulgar.' },
  { icon: Wallet, title: 'Caixa do baba', desc: 'Controle o caixa do grupo e cobre mensalidade ou rateio via Pix.' },
  { icon: Sparkles, title: 'Resumo do dia', desc: 'No fim do baba, os destaques de cada time.' },
  { icon: ClipboardCheck, title: 'Histórico do grupo', desc: 'Partidas e estatísticas salvas, sem caçar mensagem antiga.' },
];

// Cada papel dentro do baba.
const roles = [
  { icon: Users, title: 'Presidente', desc: 'Cria o baba, define o nível de convidados avulsos e acompanha o contador de faltas.' },
  { icon: ClipboardCheck, title: 'Coordenador', desc: 'Ajuda a tocar o dia a dia: registra faltas e atrasos e cuida da cobrança.' },
  { icon: Trophy, title: 'Participante', desc: 'Confirma presença, vota no nível do grupo, joga e constrói o próprio perfil e ranking.' },
];

// Como o sorteio equilibra os times (descrição do funcionamento real do app).
const balanceSteps = [
  { t: 'Cada jogador tem um nível', d: 'O grupo vota se o jogador está abaixo da média, na média ou acima. O app descarta o voto mais alto e o mais baixo quando há 4 ou mais votos, pra uma implicância isolada não pesar.' },
  { t: 'Os confirmados entram na ordem de nível', d: 'Só quem confirmou presença participa. Convidados avulsos entram com o nível que o presidente definiu na hora.' },
  { t: 'Distribuição em serpentina', d: 'Os jogadores são divididos de time em time, indo e voltando, pra que cada equipe receba craques, medianos e iniciantes na mesma proporção.' },
];

// Guia curto, útil por si só pra quem organiza baba.
const tips = [
  { t: 'Fixe dia, hora e local', d: 'Quando o baba tem horário certo, a confirmação vira hábito e a lista fecha mais rápido.' },
  { t: 'Defina a regra antes de a bola rolar', d: 'Quantos jogam por time, como entra a reserva e o que vale em caso de empate. Combinar antes evita discussão depois.' },
  { t: 'Tenha sempre um reserva', d: 'Faltas acontecem. Com a fila pronta, o jogo não começa desfalcado.' },
  { t: 'Registre o que aconteceu', d: 'Placar, gols e cartões salvos fazem o ranking ficar justo e acabam com o "mas eu fiz dois".' },
  { t: 'Deixe a cobrança clara', d: 'Valor, data e chave Pix no mesmo lugar da lista de presença evitam cobrar um por um no grupo.' },
];

const faqs = [
  { q: 'Dá pra testar sem me cadastrar?', a: 'Não pra testar: no Modo Visitante você sorteia os times na hora, sem cadastro. Pra criar um baba e guardar histórico e ranking, é preciso ter conta.' },
  { q: 'Posso entrar só como jogador?', a: 'Pode. Você entra pelo convite do coordenador, confirma presença, acompanha o placar e ganha avaliação, badges e ranking, de graça.' },
  { q: 'O sorteio é automático?', a: 'Sim. O app distribui os confirmados em times equilibrados, com base no nível de cada jogador, definido por votação do próprio grupo.' },
  { q: 'Como o app decide o nível de cada jogador?', a: 'Pela votação do próprio grupo. Os votos extremos são descartados quando há 4 ou mais, e o resultado vira o nível usado no sorteio.' },
  { q: 'O que o presidente, os coordenadores e os participantes fazem?', a: 'O presidente cria e comanda o baba, os coordenadores ajudam na gestão do dia a dia e os participantes confirmam presença, jogam e ganham ranking e perfil. Cada papel só vê e faz o que lhe cabe.' },
  { q: 'Como funciona o perfil público?', a: 'Cada jogador tem um perfil onde aparecem suas conquistas e feitos, como gols, assistências e badges, pra mostrar a quem quiser.' },
  { q: 'O que acontece com convidados avulsos?', a: 'Participam do sorteio e da partida do dia, mas não entram no ranking nem nas conquistas. Gols, assistências e cartões ficam no histórico.' },
  { q: 'E se alguém faltar ou atrasar?', a: 'O coordenador registra e o primeiro da reserva entra no lugar. O contador de faltas só aparece pra presidente e coordenadores.' },
  { q: 'Preciso baixar algum aplicativo?', a: 'Sim, no navegador do celular ou do computador. Dá pra instalar como app no Android e no iPhone.' },
  { q: 'O que é grátis e o que é pago?', a: 'Jogar é grátis. Quem organiza pode assinar o plano de coordenador pra criar os próprios babas e torneios e liberar os recursos avançados.' },
  { q: 'Meus dados ficam seguros?', a: 'Seguimos a LGPD: você exporta ou exclui seus dados pelo perfil. Veja a Política de Privacidade e os Termos de Uso.' },
  { q: 'Como falo com o suporte?', a: 'Pelo e-mail draftplayapp@gmail.com.' },
];

const INK = '#0b2545';
const INK_SOFT = '#243b5a';
const paperStyle = {
  backgroundColor: '#fdf8ec',
  backgroundImage:
    'linear-gradient(rgba(8,145,178,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.10) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};
const HAND_CSS = `
.font-hand{font-family:'Caveat','Segoe Print','Bradley Hand',cursive}
.dp-word{display:inline-block;animation:dpIn .5s ease-out both}
@keyframes dpIn{from{opacity:0;transform:translateY(6px) rotate(-1deg)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.dp-word{animation:none}}`;

// Texto "escrito" palavra por palavra (continua sendo texto real, indexável).
const Words = ({ text, start = 0 }) =>
  text.split(' ').map((w, i) => (
    <React.Fragment key={i}>
      <span className="dp-word" style={{ animationDelay: `${(start + i) * 0.09}s` }}>{w}</span>{' '}
    </React.Fragment>
  ));

// Marca-texto ciano, igual ao da prancheta do logo.
const Mark = ({ children }) => (
  <span style={{
    background: 'linear-gradient(transparent 58%, rgba(0,242,255,0.55) 58%)',
    WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone', padding: '0 .15em',
  }}>{children}</span>
);

// Mini-telas ilustrativas dos passos que ainda não têm print real.
const StepMock = ({ kind }) =>
  kind === 'criar' ? (
    <div className="w-full flex flex-col gap-2 px-2">
      <div className="h-2.5 w-1/2 rounded-full bg-white/15" />
      <div className="h-8 rounded-lg bg-surface-3 border border-border-mid flex items-center px-3 text-[10px] opacity-70">Nome do baba</div>
      <div className="h-8 rounded-lg bg-surface-3 border border-border-mid" />
      <div className="h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-black" style={{ background: 'linear-gradient(135deg,#00f2ff,#0066ff)' }}>Criar baba</div>
    </div>
  ) : (
    <div className="w-full flex flex-col gap-2 px-2">
      <div className="h-2.5 w-1/3 rounded-full bg-white/15" />
      {[['Vai', true], ['Vai', true], ['Reserva', false]].map(([label, ok], i) => (
        <div key={i} className="flex items-center gap-2 h-8 rounded-lg bg-surface-3 border border-border-mid px-2">
          <span className="w-4 h-4 rounded-full bg-white/20" />
          <span className="h-2 flex-1 rounded-full bg-white/15" />
          <span className={`text-[9px] font-bold ${ok ? 'text-cyan-electric' : 'text-yellow-400'}`}>{label}</span>
        </div>
      ))}
    </div>
  );

// Veio da madeira gerado em SVG (sem imagem externa): ruído esticado na vertical.
const woodSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
  "<filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.35 0.012' numOctaves='3' seed='7'/>" +
  "<feColorMatrix values='0 0 0 0 0.22  0 0 0 0 0.10  0 0 0 0 0.03  1.7 0 0 0 -0.35'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#w)'/></svg>";
const woodStyle = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(woodSvg)}"), linear-gradient(135deg,#c98f4e 0%,#a56d34 45%,#86521f 100%)`,
  border: '1px solid #3d2410',
  boxShadow:
    'inset 0 2px 2px rgba(255,230,190,0.45), inset 0 -3px 6px rgba(0,0,0,0.5), 0 22px 50px rgba(0,0,0,0.7), 0 0 60px rgba(0,242,255,0.08)',
};
const steel = {
  background: 'linear-gradient(180deg,#f7f9fb 0%,#cfd5db 28%,#98a0a8 52%,#e2e6ea 72%,#868e96 100%)',
  border: '1px solid #4d545b',
  boxShadow: '0 4px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.95)',
};
const rivet = { background: 'radial-gradient(circle at 35% 30%, #fff, #8a9199 55%, #4a5057)', boxShadow: '0 1px 1px rgba(0,0,0,0.6)' };

// Clipe de metal: arco com furo + corpo com rebites.
const Clip = () => (
  <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-10 pointer-events-none" style={{ width: 170 }}>
    <div className="relative mx-auto" style={{ width: 84, height: 26, borderRadius: '14px 14px 0 0', marginBottom: -2, ...steel }}>
      <span
        className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
        style={{ top: 7, background: 'radial-gradient(circle at 40% 35%, #000, #1b1f24 70%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.7)' }}
      />
    </div>
    <div className="relative" style={{ height: 34, borderRadius: 7, ...steel }}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={rivet} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={rivet} />
      <span className="absolute inset-x-8 bottom-2 h-[3px] rounded bg-black/30" />
    </div>
  </div>
);

// Prancheta de madeira com clipe de metal e folha quadriculada.
const Clipboard = ({ children, rotate = -1 }) => (
  <div className="relative" style={{ transform: `rotate(${rotate}deg)` }}>
    <div className="rounded-xl pt-[30px] px-3 pb-3 md:px-4 md:pb-4" style={woodStyle}>
      <div className="relative overflow-hidden" style={{ ...paperStyle, color: INK, borderRadius: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.45)' }}>
        <div className="absolute inset-x-0 top-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(rgba(0,0,0,0.22), transparent)' }} />
        {children}
      </div>
    </div>
    <Clip />
  </div>
);

const Title = ({ id, children, sub, hand = false }) => (
  <div id={id} className="scroll-mt-20 text-center space-y-2 mb-8">
    <h2 className={hand ? 'font-hand text-4xl md:text-5xl font-bold' : 'text-2xl md:text-3xl font-black italic tracking-tight'}>{children}</h2>
    {sub && <p className="text-sm opacity-60">{sub}</p>}
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Draft Play Baba Manager | Gestão de baba: presença, sorteio, ranking e caixa';
  }, []);

  // Rolagem suave nas âncoras do menu (respeita "reduzir movimento").
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    return () => { root.style.scrollBehavior = prev; };
  }, []);

  // Par de CTAs usado no topo e no fim. O Modo Visitante segue em /visitor.
  const Ctas = ({ center = false }) => (
    <div className={`flex flex-col sm:flex-row gap-3 ${center ? 'justify-center' : ''}`}>
      <button
        onClick={() => navigate('/login')}
        className="px-8 py-4 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        <LogIn size={18} />
        Organizar meu baba
      </button>
      <button
        onClick={() => navigate('/visitor')}
        className="px-8 py-4 rounded-2xl font-bold border border-cyan-electric/40 text-cyan-electric hover:bg-cyan-electric/10 transition-all active:scale-95 flex items-center justify-center gap-3 text-sm"
      >
        <Zap size={18} />
        Testar sem conta
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans" style={{ overflowX: 'clip' }}>
      <style>{HAND_CSS}</style>
      {/* Menu: só âncoras + um link de entrada (sem botões duplicados) */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/5">
        <nav aria-label="Menu principal" className="max-w-5xl mx-auto px-6 py-3 min-h-14 flex items-center justify-between text-xs font-bold">
          <Link to="/" className="text-base font-black italic tracking-tighter text-cyan-electric">DRAFT PLAY <span className="font-bold not-italic tracking-widest text-[9px] opacity-70">BABA MANAGER</span></Link>
          <div className="flex items-center gap-5 text-text-mid">
            <a href="#como-funciona" className="hidden sm:inline hover:text-cyan-electric transition-colors">Como funciona</a>
            <a href="#recursos" className="hidden sm:inline hover:text-cyan-electric transition-colors">Recursos</a>
            <a href="#perguntas" className="hidden sm:inline hover:text-cyan-electric transition-colors">Perguntas</a>
            <Link to="/sobre" className="hover:text-cyan-electric transition-colors">Sobre</Link>
            <Link to="/login" className="text-white hover:text-cyan-electric transition-colors">Entrar</Link>
          </div>
        </nav>
      </header>

      {/* 1. Hero: prancheta com a promessa + mascote */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-20 grid md:grid-cols-[1.25fr_1fr] gap-12 items-center">
        <div className="space-y-8">
          <Clipboard rotate={-1.2}>
            <div className="p-6 md:p-8 space-y-4">
              <p className="font-hand text-xl md:text-2xl font-medium opacity-70">Draft Play Baba Manager</p>
              <h1 className="font-hand text-5xl md:text-6xl font-bold leading-[1.05]">
                <Words text="Gerencie seu baba" />
                <Mark><Words text="do sorteio ao caixa" start={3} /></Mark>
              </h1>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: INK_SOFT }}>
                Presença, sorteio de times balanceados, placar, ranking de gols e assistências, perfil público
                com conquistas e o caixa do baba. Presidente, coordenadores e jogadores, cada um no seu papel.
              </p>
            </div>
          </Clipboard>
          <Ctas />
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-70">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-cyan-electric" /> Convidados entram pelo convite</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-cyan-electric" /> Modo Visitante sem cadastro</li>
            <li className="flex items-center gap-1.5"><Lock size={13} className="text-cyan-electric" /> Dados protegidos (LGPD)</li>
            <li className="flex items-center gap-1.5"><Smartphone size={13} className="text-cyan-electric" /> Instala como app</li>
          </ul>
        </div>
        <div className="relative max-w-xs mx-auto w-full">
          <div className="absolute inset-0 bg-cyan-electric/20 blur-[80px] rounded-full" />
          <img
            src="/marketing/mascote-prancheta.png"
            alt="Mascote do Draft Play Baba Manager: um técnico de terno mostrando uma prancheta com a tática do time"
            width="560" height="497"
            className="relative w-full drop-shadow-[0_0_30px_rgba(0,242,255,0.25)]"
          />
          <p className="absolute -top-3 -right-2 font-hand text-2xl font-bold px-4 py-1 rounded-lg shadow-lg rotate-3" style={{ ...paperStyle, color: INK }}>
            Bora montar o time?
          </p>
        </div>
      </section>

      {/* Sobre o app: texto próprio, explicando o produto pra quem chega pela primeira vez */}
      <section className="max-w-3xl mx-auto px-6 pb-14 text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-black italic tracking-tight">Feito pro baba que dura a temporada inteira</h2>
        <p className="text-sm opacity-70 leading-relaxed">
          O Draft Play Baba Manager não serve só pro jogo de hoje. Você cria um baba, convida o grupo e acompanha
          tudo ao longo do tempo: quem apareceu, quem marcou, quem evoluiu de divisão e como está o caixa.
          O presidente e os coordenadores gerenciam, e cada participante constrói o próprio histórico.
        </p>
        <p className="text-sm opacity-70 leading-relaxed">
          Serve pra futebol de várzea, society, futsal, rachão de quadra e torneios entre amigos. Não precisa
          instalar nada pra começar: abra no navegador, ou instale como app se preferir.
        </p>
      </section>

      {/* 2. Dor → solução */}
      <section className="bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <Title sub="O que atrapalha todo organizador, e como o app resolve.">Chega de bagunça pra montar o baba</Title>
          <div className="grid sm:grid-cols-2 gap-4">
            {pains.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.pain} className="card-glass p-5 rounded-2xl border border-border-mid flex gap-4">
                  <Icon size={22} className="mt-0.5 shrink-0 text-cyan-electric" />
                  <div>
                    <p className="text-sm font-bold">{p.pain}</p>
                    <p className="text-sm opacity-60 mt-1 leading-relaxed">{p.fix}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Papéis dentro do baba */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <Title hand sub="Quem organiza e quem joga usam o mesmo app, com funções diferentes.">Cada um no seu papel</Title>
        <Clipboard rotate={0.8}>
          <ul className="p-6 md:p-8 space-y-5">
            {roles.map((r) => (
              <li key={r.title} className="flex gap-4 items-start">
                <Check size={26} strokeWidth={3} className="shrink-0 mt-1" style={{ color: '#0891b2' }} />
                <div>
                  <p className="font-hand text-3xl font-bold leading-none">{r.title}</p>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: INK_SOFT }}>{r.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </Clipboard>
      </section>

      {/* 3. Como funciona: 4 passos visíveis de uma vez, sem abas */}
      <section className="max-w-5xl mx-auto px-6 py-14 border-t border-white/5">
        <Title hand id="como-funciona" sub="Do convite ao apito final, em 4 passos.">Como funciona</Title>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card-glass p-4 rounded-2xl border border-border-mid flex flex-col gap-3">
              <div className="h-56 rounded-xl bg-black/60 border border-border-mid p-2 flex items-center justify-center overflow-hidden">
                {s.mock ? <StepMock kind={s.mock} /> : <Shot src={s.image} alt={s.alt} icon={s.icon} className="h-full" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-hand text-2xl font-bold w-8 h-8 shrink-0 rounded-full bg-cyan-electric text-black flex items-center justify-center">{i + 1}</span>
                <p className="font-hand text-2xl font-bold leading-none">{s.title}</p>
              </div>
              <p className="text-xs opacity-60 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
        <p className="text-center font-hand text-3xl font-bold text-cyan-electric mt-10">
          Resultado: times prontos, lista de presença confirmada e histórico do grupo salvo.
        </p>
      </section>

      {/* 4. Recursos */}
      <section className="bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <Title id="recursos" sub="Cada recurso resolve um problema do dia do baba.">Tudo que o baba precisa</Title>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card-glass p-5 rounded-2xl border border-border-mid space-y-2">
                  <Icon size={20} className="text-cyan-electric" />
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs opacity-60 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs opacity-60 mt-6">
            Grátis pra jogar. Quem organiza pode assinar o plano de coordenador pra criar babas e torneios.
          </p>
        </div>
      </section>

      {/* Como o sorteio equilibra os times */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <Title sub="Sem sorte nem favorecimento: o critério é sempre o mesmo.">Como o sorteio deixa os times parelhos</Title>
        <div className="grid md:grid-cols-3 gap-4">
          {balanceSteps.map((b) => (
            <div key={b.t} className="card-glass p-5 rounded-2xl border border-border-mid space-y-2">
              <p className="text-sm font-bold">{b.t}</p>
              <p className="text-xs opacity-60 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guia editorial */}
      <section className="bg-white/[0.02] border-y border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <Clipboard rotate={-0.7}>
            <div className="p-6 md:p-8">
              <h2 className="font-hand text-4xl md:text-5xl font-bold leading-tight flex items-center gap-3">
                <BookOpen size={30} style={{ color: '#0891b2' }} className="shrink-0" />
                <span><Mark>5 dicas</Mark> pra organizar um baba sem confusão</span>
              </h2>
              <p className="text-sm mt-1 mb-6" style={{ color: INK_SOFT }}>Vale com ou sem o app.</p>
              <ol className="space-y-5">
                {tips.map((t, i) => (
                  <li key={t.t} className="flex gap-4">
                    <span className="font-hand text-3xl font-bold w-9 shrink-0" style={{ color: '#0891b2' }}>{i + 1}.</span>
                    <div>
                      <p className="font-hand text-2xl font-bold leading-none">{t.t}</p>
                      <p className="text-sm leading-relaxed mt-1" style={{ color: INK_SOFT }}>{t.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Clipboard>
        </div>
      </section>

      {/* 5. FAQ com respostas visíveis */}
      <section className="max-w-2xl mx-auto px-6 py-14">
        <Title id="perguntas">Perguntas frequentes</Title>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="group card-glass rounded-xl border border-border-mid px-5 py-4">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold">
                {f.q}
                <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm opacity-70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Privacidade e contato */}
      <section className="max-w-3xl mx-auto px-6 pb-14">
        <div className="card-glass p-6 rounded-2xl border border-border-mid grid sm:grid-cols-2 gap-5 text-sm">
          <div className="flex gap-3">
            <Lock size={20} className="shrink-0 text-cyan-electric" />
            <p className="opacity-70 leading-relaxed"><strong className="text-white">Seus dados, sob seu controle.</strong> Pelo perfil você exporta ou exclui suas informações, conforme a LGPD. Veja a Política de Privacidade e os Termos de Uso no rodapé.</p>
          </div>
          <div className="flex gap-3">
            <Mail size={20} className="shrink-0 text-cyan-electric" />
            <p className="opacity-70 leading-relaxed"><strong className="text-white">Fale com a gente.</strong> Dúvidas, sugestões ou problemas: <a href="mailto:draftplayapp@gmail.com" className="text-cyan-electric underline">draftplayapp@gmail.com</a>.</p>
          </div>
        </div>
      </section>

      {/* 6. CTA final: o único outro lugar com o par de botões */}
      <section className="bg-white/[0.02] border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tight">Seu próximo baba pode ser mais tranquilo</h2>
          <Ctas center />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-10 space-y-6">
        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_LANDING} className="mt-2" />
        <div className="text-center space-y-3">
          <PublicPagesFooter current="home" className="opacity-80" />
          <p className="text-center text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
            Draft Play Baba Manager
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
