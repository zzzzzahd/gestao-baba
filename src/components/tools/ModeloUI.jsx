// src/components/tools/ModeloUI.jsx
// Peças compartilhadas da biblioteca de modelos: layout, campo de equipes,
// prévia em texto e ações de saída (copiar, imprimir, baixar).
import React, { useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { ToolLayout, Field, CopyButton, inputCls } from './ui';
import { MODELOS, MODELOS_HUB, modeloPath } from '../../content/modelosCatalog';
import { parsePlayerList } from '../../utils/teamBalancer';
import { downloadTextFile, printText } from '../../utils/exportFile';

export function ModeloLayout({ slug, title, intro, howTo, premises, limitations, children }) {
  const m = MODELOS.find((x) => x.slug === slug);
  const related = MODELOS.filter((x) => x.slug !== slug).map((x) => ({ key: x.slug, path: modeloPath(x.slug), name: x.name, short: x.short }));
  return (
    <ToolLayout
      slug={slug}
      title={title ?? m.name}
      metaTitle={m.title}
      metaDescription={m.description}
      intro={intro}
      howTo={howTo}
      premises={premises}
      limitations={limitations}
      hub={{ to: MODELOS_HUB.path, label: 'Todos os modelos' }}
      relatedTitle="Outros modelos"
      related={related}
      footerCurrent="modelos"
      privacyNote="Tudo é gerado no seu navegador: os nomes e valores que você digita não são enviados a nenhum servidor do Draft Play. Os modelos são pontos de partida para você revisar e adaptar."
    >
      {children}
    </ToolLayout>
  );
}

/** Campo de equipes (uma por linha) com validação padrão. */
export function useTeams(initialCount = 8, label = 'Equipe') {
  const [text, setText] = useState(() => Array.from({ length: initialCount }, (_, i) => `${label} ${i + 1}`).join('\n'));
  const { names, duplicates } = useMemo(() => parsePlayerList(text), [text]);
  const errors = [];
  if (names.length < 2) errors.push('Informe pelo menos 2 equipes.');
  if (names.length > 64) errors.push('O limite é de 64 equipes.');
  if (duplicates.length) errors.push(`Há nomes repetidos: ${duplicates.join(', ')}.`);
  return { text, setText, names, errors };
}

export function TeamsField({ teams, label = 'Equipes (uma por linha)', rows = 7 }) {
  return (
    <Field label={label} hint={`${teams.names.length} equipe(s) reconhecida(s). A ordem da lista define os cabeças de chave.`}>
      <textarea rows={rows} value={teams.text} onChange={(e) => teams.setText(e.target.value)} className={inputCls} />
    </Field>
  );
}

export function Preview({ text, label = 'Prévia do modelo' }) {
  return (
    <pre tabIndex={0} aria-label={label}
      className="overflow-x-auto whitespace-pre rounded-xl border border-border-mid bg-white/5 p-4 text-[12.5px] leading-relaxed font-mono">
      {text}
    </pre>
  );
}

const btn = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider';

/** Copiar, imprimir e baixar (.txt e, quando houver, .csv). */
export function OutputActions({ text, title, filename, csv }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CopyButton text={text} label="Copiar modelo" />
      <button type="button" onClick={() => printText(title, text)} className={btn}>
        <Printer size={14} aria-hidden="true" /> Imprimir
      </button>
      <button type="button" onClick={() => downloadTextFile(`${filename}.txt`, text)} className={btn}>
        <Download size={14} aria-hidden="true" /> Baixar .txt
      </button>
      {csv && (
        <button type="button" onClick={() => downloadTextFile(`${filename}.csv`, csv, 'text/csv;charset=utf-8')} className={btn}>
          <Download size={14} aria-hidden="true" /> Baixar .csv
        </button>
      )}
    </div>
  );
}
