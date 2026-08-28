import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

// Cloudflare Turnstile — protege LOGIN, CADASTRO e RECUPERAÇÃO DE SENHA
// contra bots/scripts automatizados.
//
// Estratégia de UX: no LOGIN o widget roda em modo "invisible" — não aparece
// nada na tela na maioria das vezes, só dispara um desafio visual se o
// Cloudflare desconfiar do acesso. No CADASTRO e na RECUPERAÇÃO DE SENHA o
// widget é visível (managed), já que são ações mais sensíveis/raras e o
// atrito extra é aceitável ali.
//
// Importante: o "CAPTCHA protection" do Supabase Auth (Dashboard →
// Authentication → Attack Protection) é global — se estiver habilitado, ele
// exige captchaToken em TODOS os endpoints protegidos (/token, /signup,
// /recover). Por isso os três fluxos abaixo usam um widget Turnstile cada.
//
// Pré-requisitos (fora deste arquivo):
//   1. Criar um site no Cloudflare Turnstile e definir
//      VITE_TURNSTILE_SITE_KEY no .env / variáveis de ambiente do Vercel.
//   2. Habilitar "CAPTCHA protection" no Supabase Auth, colando lá a SECRET
//      key do Turnstile — é o Supabase Auth que valida o token no servidor.
//   3. AuthContext.signIn / signUp / resetPasswordForEmail precisam aceitar
//      e repassar o captchaToken pra supabase-js.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

function useTurnstileScript() {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile);

  useEffect(() => {
    if (ready || typeof window === 'undefined') return;

    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => setReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [ready]);

  return ready;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, resetPasswordForEmail } = useAuth();
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [consent, setConsent]   = useState(false); // LGPD
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  // Recuperação de senha
  const [showForgot, setShowForgot]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent]     = useState(false);

  const turnstileReady = useTurnstileScript();

  // ── Widget INVISÍVEL — login ──────────────────────────────────────────
  // Não renderiza nada visível; é disparado sob demanda via execute() no
  // submit, e resolve/rejeita a Promise abaixo através do callback configurado.
  const loginContainerRef = useRef(null);
  const loginWidgetIdRef  = useRef(null);
  const pendingResolveRef = useRef(null);
  const pendingRejectRef  = useRef(null);

  useEffect(() => {
    if (!turnstileReady || !loginContainerRef.current || !TURNSTILE_SITE_KEY) return;
    if (loginWidgetIdRef.current !== null) return;

    loginWidgetIdRef.current = window.turnstile.render(loginContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      size: 'invisible',
      callback: (token) => {
        if (pendingResolveRef.current) {
          pendingResolveRef.current(token);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      },
      'error-callback': () => {
        if (pendingRejectRef.current) {
          pendingRejectRef.current(new Error('captcha_error'));
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      },
      'expired-callback': () => {
        if (pendingRejectRef.current) {
          pendingRejectRef.current(new Error('captcha_expired'));
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
        }
      },
    });

    return () => {
      if (loginWidgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(loginWidgetIdRef.current);
        loginWidgetIdRef.current = null;
      }
    };
  }, [turnstileReady]);

  // Dispara o desafio invisível e devolve uma Promise com o token.
  // Resolve com '' se o Turnstile não estiver configurado (sem site key).
  const executeInvisibleCaptcha = () => {
    if (!TURNSTILE_SITE_KEY) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      if (!window.turnstile || loginWidgetIdRef.current === null) {
        resolve('');
        return;
      }
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;
      window.turnstile.execute(loginWidgetIdRef.current);

      // Timeout de segurança — evita ficar preso pra sempre se o callback
      // nunca disparar por algum motivo de rede/bloqueio.
      setTimeout(() => {
        if (pendingResolveRef.current) {
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
          reject(new Error('captcha_timeout'));
        }
      }, 15000);
    });
  };

  // ── Widget VISÍVEL — cadastro ─────────────────────────────────────────
  const signupContainerRef = useRef(null);
  const signupWidgetIdRef  = useRef(null);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState('');
  const [signupCaptchaError, setSignupCaptchaError] = useState(false);

  useEffect(() => {
    if (isLogin || !turnstileReady || !signupContainerRef.current || !TURNSTILE_SITE_KEY) return;
    if (signupWidgetIdRef.current !== null) return;

    signupWidgetIdRef.current = window.turnstile.render(signupContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      callback: (token) => {
        setSignupCaptchaToken(token);
        setSignupCaptchaError(false);
      },
      'expired-callback': () => setSignupCaptchaToken(''),
      'error-callback': () => {
        setSignupCaptchaToken('');
        setSignupCaptchaError(true);
      },
    });

    return () => {
      if (signupWidgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(signupWidgetIdRef.current);
        signupWidgetIdRef.current = null;
      }
      setSignupCaptchaToken('');
    };
  }, [isLogin, turnstileReady]);

  // ── Widget VISÍVEL — recuperação de senha (dentro do modal) ───────────
  const forgotContainerRef = useRef(null);
  const forgotWidgetIdRef  = useRef(null);
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState('');
  const [forgotCaptchaError, setForgotCaptchaError] = useState(false);

  useEffect(() => {
    if (!showForgot || !turnstileReady || !forgotContainerRef.current || !TURNSTILE_SITE_KEY) return;
    if (forgotWidgetIdRef.current !== null) return;

    forgotWidgetIdRef.current = window.turnstile.render(forgotContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      callback: (token) => {
        setForgotCaptchaToken(token);
        setForgotCaptchaError(false);
      },
      'expired-callback': () => setForgotCaptchaToken(''),
      'error-callback': () => {
        setForgotCaptchaToken('');
        setForgotCaptchaError(true);
      },
    });

    return () => {
      if (forgotWidgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(forgotWidgetIdRef.current);
        forgotWidgetIdRef.current = null;
      }
      setForgotCaptchaToken('');
    };
  }, [showForgot, turnstileReady]);

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    if (TURNSTILE_SITE_KEY && !forgotCaptchaToken) return; // bloquear sem captcha
    setForgotLoading(true);
    const { error } = await resetPasswordForEmail(forgotEmail, forgotCaptchaToken);
    setForgotLoading(false);
    if (window.turnstile && forgotWidgetIdRef.current !== null) {
      window.turnstile.reset(forgotWidgetIdRef.current);
    }
    setForgotCaptchaToken('');
    if (!error) setForgotSent(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && !consent) return; // bloquear sem consentimento
    if (!isLogin && TURNSTILE_SITE_KEY && !signupCaptchaToken) return; // bloquear sem captcha (só cadastro)
    setLoading(true);

    if (isLogin) {
      let token = '';
      try {
        token = await executeInvisibleCaptcha();
      } catch {
        toast.error('Não foi possível confirmar que você não é um robô. Tente novamente.');
        setLoading(false);
        return;
      }
      const { error } = await signIn(formData.email, formData.password, token);
      if (window.turnstile && loginWidgetIdRef.current !== null) {
        window.turnstile.reset(loginWidgetIdRef.current);
      }
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        {
          name:            formData.name,
          consent_at:      new Date().toISOString(),
          consent_version: '1.0',
        },
        signupCaptchaToken,
      );
      if (!error) {
        setIsLogin(true);
        setFormData({ email: '', password: '', name: '' });
        setConsent(false);
        setSignupCaptchaToken('');
      } else if (window.turnstile && signupWidgetIdRef.current !== null) {
        // token pode ter sido consumido/rejeitado; força o usuário a resolver de novo
        window.turnstile.reset(signupWidgetIdRef.current);
        setSignupCaptchaToken('');
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const signupBlocked = !isLogin && (!consent || (TURNSTILE_SITE_KEY && !signupCaptchaToken));

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-black">
      <div className="w-full max-w-md">
        <div className="mb-16">
          <Logo size="large" />
        </div>

        {/* Container do widget invisível do login — não ocupa espaço visual */}
        <div ref={loginContainerRef} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text" name="name" placeholder="Nome completo"
              value={formData.name} onChange={handleChange} required
              className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
            />
          )}

          <input
            type="email" name="email" placeholder="Email"
            value={formData.email} onChange={handleChange} required
            className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
          />

          <input
            type="password" name="password" placeholder="Senha (mínimo 8 caracteres)"
            value={formData.password} onChange={handleChange} required minLength={8}
            className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
          />

          {/* Esqueci minha senha — só no login */}
          {isLogin && (
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={() => { setForgotEmail(formData.email); setShowForgot(true); }}
                className="text-cyan-electric text-xs hover:text-cyan-300 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {/* Consentimento LGPD — só no cadastro */}
          {!isLogin && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                  consent
                    ? 'bg-cyan-electric border-cyan-electric'
                    : 'bg-transparent border-border-strong group-hover:border-cyan-electric/50'
                }`}>
                  {consent && (
                    <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-text-low leading-relaxed">
                Li e aceito a{' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacidade')}
                  className="text-cyan-electric underline hover:text-white transition-colors"
                >
                  Política de Privacidade
                </button>
                {' '}e autorizo o uso dos meus dados para funcionamento do Draft Play.
              </span>
            </label>
          )}

          {/* Captcha visível — só no cadastro */}
          {!isLogin && TURNSTILE_SITE_KEY && (
            <div className="flex flex-col items-center gap-1 pt-1">
              <div ref={signupContainerRef} />
              {signupCaptchaError && (
                <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">
                  Falha ao carregar verificação, recarregue a página
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || signupBlocked}
            className="w-full p-4 bg-cyan-electric text-black font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Aguarde...' : isLogin ? 'ENTRAR' : 'CRIAR CONTA'}
          </button>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setConsent(false); setSignupCaptchaToken(''); }}
            className="w-full p-2 text-cyan-electric text-sm hover:text-cyan-300 transition-colors"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full p-2 text-text-mid text-sm hover:text-white transition-colors"
          >
            ← Voltar
          </button>
        </form>
      </div>

      {/* ── Modal: recuperar senha ── */}
      {showForgot && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={closeForgot}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-border-strong rounded-[2rem] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!forgotSent ? (
              <>
                <p className="text-base font-black text-white text-center uppercase tracking-tight leading-snug mb-1">
                  Recuperar senha
                </p>
                <p className="text-[11px] text-text-low text-center mb-5 leading-relaxed">
                  Informe seu email e enviaremos um link para você criar uma nova senha.
                </p>
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full p-4 bg-surface-3 border border-border-strong rounded-xl text-white placeholder-text-low"
                  />

                  {/* Captcha visível — recuperação de senha */}
                  {TURNSTILE_SITE_KEY && (
                    <div className="flex flex-col items-center gap-1">
                      <div ref={forgotContainerRef} />
                      {forgotCaptchaError && (
                        <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">
                          Falha ao carregar verificação, recarregue a página
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-mid font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || (TURNSTILE_SITE_KEY && !forgotCaptchaToken)}
                      className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest disabled:opacity-40 transition-all"
                    >
                      {forgotLoading ? 'Enviando...' : 'Enviar link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="text-base font-black text-white text-center uppercase tracking-tight leading-snug mb-1">
                  Verifique seu email
                </p>
                <p className="text-[11px] text-text-low text-center mb-5 leading-relaxed">
                  Se {forgotEmail} estiver cadastrado, você vai receber um link para redefinir sua senha em instantes.
                </p>
                <button
                  onClick={closeForgot}
                  className="w-full py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Entendi
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;