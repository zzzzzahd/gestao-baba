// src/pages/TermsPage.jsx
// Sprint 10.5 — Termos de Uso do Draft Play (LGPD art. 8)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-sm font-black uppercase tracking-widest text-cyan-electric">{title}</h2>
    <div className="text-xs text-text-mid leading-relaxed space-y-2 font-bold">{children}</div>
  </div>
);

export default function TermsPage() {
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
          <FileText size={16} className="text-cyan-electric" />
          <h1 className="text-sm font-black uppercase tracking-widest">Termos de Uso</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-6">

        <div className="p-4 rounded-2xl bg-cyan-electric/5 border border-cyan-electric/15">
          <p className="text-[10px] font-black text-cyan-electric uppercase tracking-widest mb-1">
            Última atualização
          </p>
          <p className="text-xs font-black text-text-mid">09 de maio de 2026 — Versão 1.0</p>
        </div>

        <Section title="1. Aceitação dos Termos">
          <p>
            Ao criar uma conta ou utilizar o Draft Play, você concorda com estes Termos de Uso.
            Se não concordar, não utilize o aplicativo.
          </p>
        </Section>

        <Section title="2. O que é o Draft Play">
          <p>
            Draft Play é uma plataforma para organização de grupos de futebol amador ("babas"),
            incluindo gerenciamento de jogadores, sorteio de times, confirmação de presença,
            histórico de partidas e avaliações entre jogadores.
          </p>
        </Section>

        <Section title="3. Elegibilidade">
          <p>
            Você deve ter pelo menos 13 anos de idade para usar o Draft Play.
            Ao utilizar o aplicativo, você declara ter capacidade legal para aceitar estes termos.
          </p>
        </Section>

        <Section title="4. Sua Conta">
          <p>
            Você é responsável por manter a segurança da sua conta e senha.
            Não compartilhe suas credenciais. Qualquer atividade realizada com sua conta
            é de sua responsabilidade.
          </p>
          <p>
            Você pode solicitar a exclusão da sua conta a qualquer momento pelo aplicativo,
            conforme previsto na Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </Section>

        <Section title="5. Uso Aceitável">
          <p>Você concorda em não utilizar o Draft Play para:</p>
          <ul className="list-disc list-inside space-y-1 text-text-low pl-2">
            <li>Praticar qualquer forma de assédio, discriminação ou abuso contra outros usuários</li>
            <li>Publicar conteúdo falso, enganoso ou fraudulento</li>
            <li>Tentar acessar contas de outros usuários sem autorização</li>
            <li>Usar bots ou automação para manipular o sistema</li>
          </ul>
        </Section>

        <Section title="6. Conteúdo do Usuário">
          <p>
            Ao usar o Draft Play, você pode inserir informações como nome, foto de perfil,
            avaliações e dados de partidas. Você mantém a propriedade desses dados e nos
            concede licença limitada para exibi-los dentro da plataforma conforme sua configuração
            de privacidade.
          </p>
        </Section>

        <Section title="7. Avaliações entre Jogadores">
          <p>
            O sistema de avaliação (notas de 1 a 10) é anônimo por padrão. As avaliações são
            usadas exclusivamente para balanceamento de times. Avaliações maliciosas ou
            coordenadas para prejudicar outros jogadores violam estes termos.
          </p>
        </Section>

        <Section title="8. Notificações Push">
          <p>
            Ao habilitar as notificações, você consente em receber alertas sobre confirmações
            de presença, sorteios e resultados de partidas. Você pode desativar a qualquer momento
            nas configurações do seu perfil.
          </p>
        </Section>

        <Section title="9. Limitação de Responsabilidade">
          <p>
            O Draft Play é fornecido "como está". Não nos responsabilizamos por danos
            decorrentes do uso ou impossibilidade de uso do aplicativo, incluindo problemas
            relacionados a partidas organizadas através da plataforma.
          </p>
        </Section>

        <Section title="10. Modificações">
          <p>
            Podemos atualizar estes Termos periodicamente. Mudanças significativas serão
            comunicadas dentro do aplicativo. O uso continuado após as alterações
            constitui aceitação dos novos termos.
          </p>
        </Section>

        <Section title="11. Privacidade">
          <p>
            O tratamento dos seus dados pessoais é descrito na nossa{' '}
            <span className="text-cyan-electric cursor-pointer" onClick={() => navigate('/privacidade')}>
              Política de Privacidade
            </span>
            , elaborada em conformidade com a LGPD.
          </p>
        </Section>

        <Section title="12. Contato">
          <p>
            Dúvidas sobre estes termos? Entre em contato pelo e-mail:{' '}
            <span className="text-cyan-electric">contato@draftplay.app</span>
          </p>
        </Section>

        <div className="pt-4 border-t border-border-subtle">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3.5 rounded-2xl border border-border-mid text-[10px] font-black uppercase tracking-widest text-text-low hover:text-white hover:border-border-high transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
