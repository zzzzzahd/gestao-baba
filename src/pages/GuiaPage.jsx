// src/pages/GuiaPage.jsx
// Artigo público (/guias/:slug). Sem login, sem anúncios (só depois da aprovação do AdSense).

import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LogIn, Zap, ChevronRight } from 'lucide-react';
import GuiasLayout from '../components/GuiasLayout';
import NotFoundPage from './NotFoundPage';
import useDocumentHead from '../hooks/useDocumentHead';
import { GUIAS, getGuia } from '../data/guias';

const BASE_URL = 'https://www.draftplay.app.br';

// '2026-10-12' -> '12/10/2026' (sem passar por Date, evita deslocamento de fuso)
const formatDate = (iso) => {
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const GuiaPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const guia = getGuia(slug);

  const url = guia ? `${BASE_URL}/guias/${guia.slug}` : '';

  // Hook sempre chamado; com guia nulo não faz nada.
  useDocumentHead(
    guia
      ? {
          title: `${guia.title} | Draft Play`,
          description: guia.description,
          canonical: url,
          ogType: 'article',
          jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Article',
                headline: guia.title,
                description: guia.description,
                datePublished: guia.published,
                dateModified: guia.updated,
                mainEntityOfPage: url,
                inLanguage: 'pt-BR',
                author: { '@type': 'Organization', name: 'Draft Play' },
                publisher: { '@type': 'Organization', name: 'Draft Play', url: BASE_URL },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Início', item: `${BASE_URL}/` },
                  { '@type': 'ListItem', position: 2, name: 'Guias', item: `${BASE_URL}/guias` },
                  { '@type': 'ListItem', position: 3, name: guia.title, item: url },
                ],
              },
            ],
          },
        }
      : null
  );

  if (!guia) return <NotFoundPage />;

  const outros = GUIAS.filter((g) => g.slug !== guia.slug);

  return (
    <GuiasLayout>
      <article className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <nav aria-label="Trilha de navegação" className="flex items-center flex-wrap gap-1 text-xs opacity-70">
          <Link to="/" className="hover:text-cyan-electric transition-colors">Início</Link>
          <ChevronRight size={12} />
          <Link to="/guias" className="hover:text-cyan-electric transition-colors">Guias</Link>
        </nav>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tight leading-tight">{guia.title}</h1>
          <p className="text-xs opacity-50">Atualizado em {formatDate(guia.updated)}</p>
          <p className="text-base opacity-80 leading-relaxed">{guia.intro}</p>
        </header>

        {guia.sections.map((s) => (
          <section key={s.h2} className="space-y-3">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">{s.h2}</h2>
            {(s.p || []).map((txt, i) => (
              <p key={i} className="text-sm md:text-base opacity-80 leading-relaxed">{txt}</p>
            ))}
            {s.ul && (
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base opacity-80 leading-relaxed">
                {s.ul.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
            {s.media && s.media.length > 0 && (
              <div className="flex flex-wrap justify-center gap-5 pt-2">
                {s.media.map((m) => (
                  <figure key={m.src} className="w-full max-w-[15rem] space-y-2">
                    <img
                      src={m.src}
                      alt={m.alt}
                      width={m.width}
                      height={m.height}
                      loading="lazy"
                      decoding="async"
                      // Se o arquivo não existir, some a figura inteira (sem imagem quebrada).
                      onError={(e) => {
                        const fig = e.currentTarget.closest('figure');
                        if (fig) fig.style.display = 'none';
                      }}
                      className="w-full h-auto rounded-2xl border border-border-mid bg-surface-2"
                    />
                    <figcaption className="text-xs opacity-60 text-center leading-relaxed">{m.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        ))}

        <section className="card-glass p-6 rounded-2xl border border-border-mid text-center space-y-4">
          <h2 className="text-lg font-black">Quer organizar seu baba sem planilha?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 py-3 rounded-2xl font-black text-black flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
            >
              <LogIn size={16} /> Organizar meu baba
            </button>
            <button
              type="button"
              onClick={() => navigate('/visitor')}
              className="px-6 py-3 rounded-2xl font-bold border border-cyan-electric/40 text-cyan-electric hover:bg-cyan-electric/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <Zap size={16} /> Testar sem conta
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black">Outros guias</h2>
          <ul className="space-y-2">
            {outros.map((g) => (
              <li key={g.slug}>
                <Link to={`/guias/${g.slug}`} className="text-sm text-cyan-electric hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </GuiasLayout>
  );
};

export default GuiaPage;
