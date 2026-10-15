// src/components/tools/ui.jsx
// Peças compartilhadas das ferramentas públicas: layout com conteúdo
// explicativo, campos acessíveis, botão de copiar e avisos.

import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, AlertTriangle, Trash2, Plus } from 'lucide-react';
import Logo from '../Logo';
import PublicPagesFooter from '../PublicPagesFooter';
import { usePageMeta } from '../../hooks/usePageMeta';
import { TOOLS } from '../../content/toolsCatalog';

export const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-cyan-electric transition-colors';

export function ToolLayout({
  slug, title, metaTitle, metaDescription, intro, children, howTo = [], premises = [], limitations,
  hub = { to: '/ferramentas', label: 'Todas as ferramentas' },
  relatedTitle = 'Outras ferramentas',
  related,
  footerCurrent = 'ferramentas',
  privacyNote = 'Os cálculos acontecem no seu navegador: o que você digita aqui não é enviado a nenhum servidor do Draft Play. Os resultados são estimativas baseadas nos valores informados.',
}) {
  usePageMeta(metaTitle, metaDescription);
  const others = related ?? TOOLS.filter((t) => t.slug !== slug).map((t) => ({ key: t.slug, path: t.path, name: t.name, short: t.short }));
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/"><Logo size="small" as="p" /></Link>
          <Link
            to={hub.to}
            className="text-[10px] font-black opacity-60 hover:opacity-100 uppercase tracking-[0.2em] flex items-center gap-2"
          >
            <ArrowLeft size={12} aria-hidden="true" /> {hub.label}
          </Link>
        </header>

        <main id="main-content" className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-cyan-electric">{title}</h1>
            <p className="text-sm opacity-70 leading-relaxed">{intro}</p>
          </div>

          {children}

          {howTo.length > 0 && (
            <section aria-labelledby="como-usar" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
              <h2 id="como-usar" className="text-base font-black">Como usar</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm opacity-75 leading-relaxed">
                {howTo.map((h) => <li key={h}>{h}</li>)}
              </ol>
            </section>
          )}

          {premises.length > 0 && (
            <section aria-labelledby="premissas" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
              <h2 id="premissas" className="text-base font-black">Como o cálculo funciona</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm opacity-75 leading-relaxed">
                {premises.map((p) => <li key={p}>{p}</li>)}
              </ul>
              {limitations && <p className="text-xs opacity-55 leading-relaxed">{limitations}</p>}
            </section>
          )}

          <section aria-labelledby="privacidade-ferramenta" className="text-xs opacity-55 leading-relaxed">
            <h2 id="privacidade-ferramenta" className="sr-only">Privacidade</h2>
            {privacyNote}
          </section>

          <nav aria-label={relatedTitle} className="space-y-3">
            <h2 className="text-base font-black">{relatedTitle}</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {others.map((t) => (
                <li key={t.key}>
                  <Link to={t.path} className="block card-glass p-4 rounded-xl border border-border-mid hover:border-cyan-electric/40 transition-colors h-full">
                    <span className="block text-sm font-bold">{t.name}</span>
                    <span className="block text-xs opacity-60 mt-1 leading-relaxed">{t.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="card-glass p-5 rounded-2xl border border-cyan-electric/20 text-sm leading-relaxed flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="opacity-80">Quer guardar histórico, ranking e financeiro do seu baba?</p>
            <Link to="/login" className="shrink-0 bg-cyan-electric text-black font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl text-center">
              Conhecer o Draft Play
            </Link>
          </div>
        </main>

        <PublicPagesFooter current={footerCurrent} className="pb-6" />
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  const id = useId();
  const child = React.cloneElement(children, {
    id,
    'aria-describedby': [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : undefined,
  });
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-wider opacity-70">{label}</label>
      {child}
      {hint && <p id={`${id}-hint`} className="text-[11px] opacity-50">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-[11px] text-red-400 font-bold">{error}</p>}
    </div>
  );
}

/** Campo numérico inteiro: guarda texto, devolve número (ou NaN se vazio/ inválido). */
export function IntField({ label, value, onChange, min = 0, max = 999, hint, error }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </Field>
  );
}

export const toInt = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

export function ErrorList({ errors }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm space-y-1">
      <p className="font-black flex items-center gap-2 text-red-300"><AlertTriangle size={16} aria-hidden="true" /> Confira os dados</p>
      <ul className="list-disc pl-5 text-red-200/90">
        {errors.map((e) => <li key={e}>{e}</li>)}
      </ul>
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar resultado', className = '' }) {
  const [state, setState] = useState('idle');
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('copy failed');
      }
      setState('done');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 2200);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-electric/30 bg-cyan-electric/10 text-cyan-electric text-xs font-black uppercase tracking-wider active:scale-95 transition-transform ${className}`}
    >
      {state === 'done' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">
        {state === 'done' ? 'Copiado!' : state === 'error' ? 'Não foi possível copiar' : label}
      </span>
    </button>
  );
}

export const Panel = ({ children, className = '' }) => (
  <div className={`card-glass p-5 rounded-2xl border border-border-mid space-y-4 ${className}`}>{children}</div>
);

export const Stat = ({ label, value, sub }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    <p className="text-[10px] font-black uppercase tracking-wider opacity-50">{label}</p>
    <p className="text-2xl font-black text-cyan-electric mt-1">{value}</p>
    {sub && <p className="text-[11px] opacity-55 mt-1 leading-snug">{sub}</p>}
  </div>
);

export function Segmented({ label, options, value, onChange }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[11px] font-black uppercase tracking-wider opacity-70">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`py-2.5 px-2 rounded-xl text-[11px] font-black uppercase leading-tight border transition-all ${
              value === o.value ? 'bg-cyan-electric text-black border-cyan-electric' : 'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Linhas descrição + valor (receitas/despesas), compartilhadas por modelos
// ---------------------------------------------------------------------------
let rowSeq = 0;
export const newRow = (label = '') => ({ id: `row${rowSeq++}`, label, value: '' });

export function MoneyRows({ legend, rows, setRows, labelPlaceholder }) {
  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-[11px] font-black uppercase tracking-wider opacity-70 mb-2">{legend}</legend>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-center">
          <input type="text" aria-label={`${legend}: descrição ${i + 1}`} placeholder={labelPlaceholder} maxLength={60} value={r.label}
            onChange={(e) => patch(r.id, { label: e.target.value })} className={inputCls} />
          <input type="text" inputMode="decimal" aria-label={`${legend}: valor ${i + 1} (R$)`} placeholder="0,00" value={r.value}
            onChange={(e) => patch(r.id, { value: e.target.value })} className={inputCls} />
          <button type="button" aria-label={`Remover linha ${i + 1} de ${legend}`}
            onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [newRow()]))} className="p-2 text-red-400">
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((rs) => [...rs, newRow()])}
        className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-electric">
        <Plus size={12} aria-hidden="true" /> Adicionar linha
      </button>
    </fieldset>
  );
}
