// src/pages/PrivacyPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Política de Privacidade — LGPD (Lei 13.709/2018). Sprint 10.5 Fase C.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">{title}</h2>
    <div className="text-[13px] text-text-low leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="max-w-xl mx-auto px-5 pt-6 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-surface-2 border border-border-subtle rounded-2xl text-text-low hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Privacidade</h1>
            <p className="text-[10px] text-text-muted font-bold uppercase">Versão 1.0 — Mai/2026</p>
          </div>
        </div>

        {/* Intro */}
        <div className="p-5 rounded-3xl bg-cyan-electric/5 border border-cyan-electric/20 flex gap-4">
          <Shield size={20} className="text-cyan-electric shrink-0 mt-0.5" />
          <p className="text-[12px] text-text-mid leading-relaxed">
            O Draft Play respeita a sua privacidade e cumpre a Lei Geral de Proteção de Dados
            (LGPD — Lei 13.709/2018). Esta política explica quais dados coletamos, como usamos
            e quais são seus direitos.
          </p>
        </div>

        {/* Seções */}
        <div className="space-y-7">

          <Section title="1. Quais dados coletamos">
            <p>Coletamos apenas o mínimo necessário para o funcionamento do app:</p>
            <ul className="space-y-1 pl-4">
              {[
                'Nome e email (cadastro)',
                'Foto de perfil (opcional)',
                'Dados de partidas: gols, assistências, presenças',
                'Avaliações técnicas recebidas de outros membros do grupo',
                'Dados financeiros: cobranças e pagamentos dentro do grupo',
                'Chave Pix (opcional, para receber pagamentos)',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cyan-electric mt-1 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="2. Como usamos seus dados">
            <ul className="space-y-1 pl-4">
              {[
                'Identificação e autenticação no app',
                'Gerenciamento de grupos de futebol (babas)',
                'Sorteio e balanceamento de times',
                'Controle de presença e financeiro do grupo',
                'Ranking e estatísticas dentro do grupo',
                'Monitoramento de erros técnicos (Sentry) — sem dados pessoais',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cyan-electric mt-1 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="3. Com quem compartilhamos">
            <p>Seus dados <strong className="text-white">nunca são vendidos</strong>. São compartilhados apenas com:</p>
            <ul className="space-y-1 pl-4">
              {[
                'Supabase (banco de dados e autenticação — servidores na região sa-east-1, Brasil)',
                'Sentry (monitoramento de erros — sem dados pessoais identificáveis)',
                'Vercel (hospedagem do app)',
                'Outros membros do seu grupo (apenas nome, foto e estatísticas de jogo)',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cyan-electric mt-1 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="4. Por quanto tempo guardamos">
            <p>
              Seus dados ficam armazenados enquanto sua conta estiver ativa.
              Histórico de partidas é mantido mesmo após exclusão da conta
              (anonimizado — sem vínculo ao seu perfil) por obrigação de
              rastreabilidade do grupo.
            </p>
          </Section>

          <Section title="5. Seus direitos (LGPD)">
            <p>Você tem direito a:</p>
            <ul className="space-y-1 pl-4">
              {[
                'Acessar seus dados — disponível no seu perfil',
                'Corrigir dados incorretos — edite no perfil',
                'Exportar seus dados em formato JSON — em Perfil → Exportar dados',
                'Excluir sua conta e dados — em Perfil → Excluir conta',
                'Revogar consentimento — exclua sua conta',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cyan-electric mt-1 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="6. Segurança">
            <p>
              Utilizamos criptografia em trânsito (HTTPS), controle de acesso
              por linha (Row Level Security) no banco de dados, e autenticação
              segura via Supabase Auth. Senhas nunca são armazenadas em texto
              simples.
            </p>
          </Section>

          <Section title="7. Encarregado de Dados (DPO)">
            <p>
              Nos termos do Art. 41 da LGPD, o responsável pelo tratamento de dados pessoais
              no Draft Play é o próprio desenvolvedor da plataforma.
            </p>
            <p className="mt-2">
              <strong>Canal oficial de privacidade / DPO:</strong>{' '}
              <a href="mailto:privacidade@gestao-baba.app" className="text-cyan-electric underline">
                privacidade@gestao-baba.app
              </a>
            </p>
            <p className="mt-2 text-[11px] text-text-low">
              Você pode exercer seus direitos previstos na LGPD (acesso, correção,
              exclusão, portabilidade, revogação de consentimento) por este canal.
              O prazo de resposta é de até 15 dias úteis.
            </p>
          </Section>

          <Section title="8. Exercício de direitos">
            <p>
              Para exercer seus direitos como titular de dados, você pode:
            </p>
            <ul className="mt-2 space-y-1 text-[12px]">
              <li>• <strong>Acessar seus dados:</strong> Perfil → Exportar dados</li>
              <li>• <strong>Corrigir dados:</strong> Perfil → Editar</li>
              <li>• <strong>Excluir conta:</strong> Perfil → Excluir conta</li>
              <li>• <strong>Revogar consentimento:</strong> Perfil → Privacidade</li>
              <li>• <strong>Portabilidade:</strong> Exportar dados em formato JSON</li>
            </ul>
          </Section>

          <Section title="9. Contato">
            <p>
              Dúvidas gerais sobre privacidade:{' '}
              <a href="mailto:privacidade@gestao-baba.app" className="text-cyan-electric underline">
                privacidade@gestao-baba.app
              </a>
            </p>
            <p className="mt-1 text-[11px] text-text-low">
              Para denúncias à autoridade nacional: <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-electric underline"
              >www.gov.br/anpd</a>
            </p>
          </Section>
        </div>

        <p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-widest pb-4">
          Draft Play · LGPD v1.0 · Mai/2026
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;
