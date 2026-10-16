// src/pages/GuiasPage.jsx
// Índice público dos guias (/guias). Sem login, sem anúncios.

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import GuiasLayout from '../components/GuiasLayout';
import useDocumentHead from '../hooks/useDocumentHead';
import { GUIAS } from '../data/guias';
import { GUIAS_INDEX_SEO } from '../content/guiasSeo';

const GuiasPage = () => {
  useDocumentHead(GUIAS_INDEX_SEO);

  return (
    <GuiasLayout>
      <section className="max-w-3xl mx-auto px-6 py-14 space-y-8">
        <header className="space-y-3 text-center">
          <BookOpen size={32} className="mx-auto text-cyan-electric" />
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tight">Guias para organizar seu baba</h1>
          <p className="text-sm opacity-70 leading-relaxed">
            Textos práticos para quem organiza futebol de várzea, society, futsal ou rachão de quadra:
            como montar times parelhos, confirmar presença, cobrar sem constrangimento e manter o
            grupo funcionando a temporada inteira. Valem com ou sem o app.
          </p>
        </header>

        <ul className="space-y-4">
          {GUIAS.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/guias/${g.slug}`}
                className="card-glass block p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors"
              >
                <h2 className="text-lg font-black leading-snug">{g.title}</h2>
                <p className="text-sm opacity-60 leading-relaxed mt-2">{g.description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-electric mt-3">
                  Ler guia <ArrowRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </GuiasLayout>
  );
};

export default GuiasPage;
