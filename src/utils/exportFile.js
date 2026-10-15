// src/utils/exportFile.js
// Utilitários de saída das ferramentas públicas: CSV seguro, download de arquivo
// de texto e impressão. Tudo local no navegador (nada é enviado a servidor).

const FORMULA_START = /^[=+\-@\t\r]/;

/** Célula de CSV: aspas duplicadas e proteção contra injeção de fórmula no Excel/Sheets. */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV no padrão pt-BR (separador ";", vírgula decimal nos valores já formatados). */
export function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}

/** Baixa um arquivo de texto. BOM no CSV para o Excel reconhecer acentos. */
export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const withBom = mime.startsWith('text/csv') ? `\uFEFF${content}` : content;
  const blob = new Blob([withBom], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML imprimível de um texto (usado por printText; separado para ser testável). */
export function printableHtml(title, text) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.45;color:#000;margin:18mm}
  h1{font-size:16pt;margin:0 0 12pt}
  pre{white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0}
</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre></body></html>`;
}

/** Imprime um texto simples via iframe oculto (não depende de pop-up). */
export function printText(title, text) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(printableHtml(title, text));
  doc.close();
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(cleanup, 60000); // garante a limpeza mesmo sem o evento afterprint
    }
  }, 100);
}
