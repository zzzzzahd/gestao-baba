// scripts/generate-report.mjs
// Gera relatório HTML após npm run test:coverage
// Uso: node scripts/generate-report.mjs

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const readJSON = (p) => { try { return existsSync(p) ? JSON.parse(readFileSync(p,'utf-8')) : null; } catch { return null; } };
const readText = (p) => { try { return existsSync(p) ? readFileSync(p,'utf-8') : null; } catch { return null; } };

const SUMMARY = readJSON(resolve(ROOT, 'coverage/coverage-summary.json'));
const JUNIT   = readText(resolve(ROOT, 'test-results/junit.xml'));

// ── Parse JUnit XML ────────────────────────────────────────────────────────────
function parseJUnit(xml) {
  if (!xml) return { suites:[], total:0, passed:0, failed:0, skipped:0, duration:0 };
  const suiteRx = /<testsuite\s([^>]+)>([\s\S]*?)<\/testsuite>/g;
  const caseRx  = /<testcase\s([^>]+?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  const attrRx  = /(\w[\w-]*)="([^"]+)"/g;
  const attrs   = (s) => { const o={}; let m; attrRx.lastIndex=0; while((m=attrRx.exec(s))!==null) o[m[1]]=m[2]; return o; };

  let suites=[], total=0, passed=0, failed=0, skipped=0, duration=0;
  let sm;
  while((sm=suiteRx.exec(xml))!==null) {
    const sa=attrs(sm[1]), body=sm[2], cases=[];
    let cm; caseRx.lastIndex=0;
    while((cm=caseRx.exec(body))!==null) {
      const ca=attrs(cm[1]), inner=cm[2]||'';
      const isFail=inner.includes('<failure')||inner.includes('<error');
      const isSkip=inner.includes('<skipped');

      // Extrair mensagem de erro completa
      const msgMatch  = inner.match(/<(?:failure|error)[^>]*message="([^"]*)"[^>]*>/);
      const bodyMatch = inner.match(/<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/);
      const message   = msgMatch?.[1] || '';
      const detail    = bodyMatch?.[1]?.trim() || '';

      cases.push({
        name:    ca.name    || 'Sem nome',
        classname: ca.classname || sa.name || '',
        time:    parseFloat(ca.time||'0'),
        failed:  isFail,
        skipped: isSkip,
        message,
        detail,
      });
      total++; if(isFail) failed++; else if(isSkip) skipped++; else passed++;
    }
    const dur=parseFloat(sa.time||'0'); duration+=dur;
    suites.push({ name:sa.name||'Suite', failures:parseInt(sa.failures||'0'), time:dur, cases });
  }
  return { suites, total, passed, failed, skipped, duration };
}

// ── Parse cobertura ────────────────────────────────────────────────────────────
function parseCoverage(sum) {
  if (!sum) return null;
  const t=sum.total||{};
  const files=Object.entries(sum).filter(([k])=>k!=='total')
    .map(([f,d])=>({
      file:     f.replace(ROOT,'').replace(/\\/g,'/').replace(/^\//,''),
      lines:    d.lines?.pct??0,
      funcs:    d.functions?.pct??0,
      branches: d.branches?.pct??0,
      stmts:    d.statements?.pct??0,
    })).sort((a,b)=>a.lines-b.lines);
  return {
    total:{ lines:t.lines?.pct??0, funcs:t.functions?.pct??0, branches:t.branches?.pct??0, stmts:t.statements?.pct??0 },
    files
  };
}

const J = parseJUnit(JUNIT);
const C = parseCoverage(SUMMARY);
const NOW = new Date();
const dateStr = NOW.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const timeStr = NOW.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const passRate = J.total>0 ? ((J.passed/J.total)*100).toFixed(1) : '0.0';
const dur  = (s) => s<1 ? `${Math.round(s*1000)}ms` : `${Number(s).toFixed(2)}s`;
const pct  = (n) => `${Number(n).toFixed(1)}%`;
const esc  = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const badge = (v) => v>=80?'g':v>=60?'y':'r';

// ── Coletar todos os erros ─────────────────────────────────────────────────────
const allErrors = [];
J.suites.forEach(suite => {
  suite.cases.filter(c => c.failed).forEach(c => {
    allErrors.push({ suite: suite.name, test: c.name, message: c.message, detail: c.detail });
  });
});

// ── Seção: O que corrigir ──────────────────────────────────────────────────────
const fixSection = allErrors.length === 0
  ? `<div class="fix-empty">✅ Nenhum erro encontrado — todos os testes passaram!</div>`
  : allErrors.map((e, i) => {
      // Extrair arquivo e linha do detail (stack trace)
      const fileMatch = e.detail.match(/at\s+[\w.<>]+\s+\(([^)]+)\)/);
      const fileLine  = fileMatch?.[1] || '';
      const shortFile = fileLine.replace(/\\/g,'/').split('/src/').pop() || '';

      // Montar bloco para copiar para o Claude
      const copyBlock =
`ARQUIVO: ${e.suite}
TESTE:   ${e.test}
ERRO:    ${e.message}
${shortFile ? `LOCAL:   src/${shortFile}` : ''}
${e.detail ? `\nDETALHE:\n${e.detail.slice(0,400)}` : ''}`.trim();

      return `
      <div class="fix-card" id="fix-${i}">
        <div class="fix-header">
          <span class="fix-num">#${i+1}</span>
          <div class="fix-meta">
            <div class="fix-suite">${esc(e.suite)}</div>
            <div class="fix-test">↳ ${esc(e.test)}</div>
            ${shortFile ? `<div class="fix-loc">📍 src/${esc(shortFile)}</div>` : ''}
          </div>
        </div>
        ${e.message ? `<div class="fix-msg">💬 ${esc(e.message)}</div>` : ''}
        ${e.detail  ? `<pre class="fix-detail">${esc(e.detail.slice(0,600))}</pre>` : ''}
        <div class="fix-copy-wrap">
          <button class="fix-copy-btn" onclick="copyFix(${i})">📋 Copiar para o Claude</button>
          <span class="fix-copy-ok" id="ok-${i}">✓ Copiado!</span>
        </div>
        <textarea class="fix-textarea" id="txt-${i}" readonly>${esc(copyBlock)}</textarea>
      </div>`;
    }).join('');

// ── Suites HTML ────────────────────────────────────────────────────────────────
const suitesHTML = J.suites.map(suite => {
  const ok=suite.cases.filter(c=>!c.failed&&!c.skipped).length;
  const ko=suite.cases.filter(c=>c.failed).length;
  const sk=suite.cases.filter(c=>c.skipped).length;
  const rows=suite.cases.map(c=>`
    <tr class="${c.failed?'tr-fail':c.skipped?'tr-skip':'tr-ok'}">
      <td class="ic">${c.failed?'✗':c.skipped?'–':'✓'}</td>
      <td class="cn">${esc(c.name)}</td>
      <td class="ct2">${dur(c.time)}</td>
      <td class="cm">${c.message?esc(c.message.slice(0,120)):''}</td>
    </tr>`).join('');
  return `
  <details class="suite ${suite.failures>0?'sf':'sp2'}" ${suite.failures>0?'open':''}>
    <summary>
      <span class="sic">${suite.failures>0?'✗':'✓'}</span>
      <span class="sn">${esc(suite.name)}</span>
      <span class="sm">
        <span class="b bg">${ok} ok</span>
        ${ko>0?`<span class="b br">${ko} falhou</span>`:''}
        ${sk>0?`<span class="b by">${sk} pulado</span>`:''}
        <span class="sd">${dur(suite.time)}</span>
      </span>
    </summary>
    <table class="ct"><thead><tr><th></th><th>Teste</th><th>Tempo</th><th>Erro</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </details>`;
}).join('');

// ── Cobertura HTML ─────────────────────────────────────────────────────────────
const coverHTML = C ? (() => {
  const t=C.total;
  const rows=C.files.map(f=>`
    <tr>
      <td class="cf">${esc(f.file)}</td>
      <td><span class="b b${badge(f.stmts)}">${pct(f.stmts)}</span></td>
      <td><span class="b b${badge(f.branches)}">${pct(f.branches)}</span></td>
      <td><span class="b b${badge(f.funcs)}">${pct(f.funcs)}</span></td>
      <td><span class="b b${badge(f.lines)}">${pct(f.lines)}</span></td>
    </tr>`).join('');
  return `<section class="sec">
    <h2 class="st">📊 Cobertura de Código</h2>
    <div class="cg">
      <div class="cc"><div class="cl">Statements</div><div class="cv b${badge(t.stmts)}">${pct(t.stmts)}</div></div>
      <div class="cc"><div class="cl">Branches</div><div class="cv b${badge(t.branches)}">${pct(t.branches)}</div></div>
      <div class="cc"><div class="cl">Funções</div><div class="cv b${badge(t.funcs)}">${pct(t.funcs)}</div></div>
      <div class="cc"><div class="cl">Linhas</div><div class="cv b${badge(t.lines)}">${pct(t.lines)}</div></div>
    </div>
    <table class="covt">
      <thead><tr><th>Arquivo</th><th>Stmts</th><th>Branches</th><th>Funções</th><th>Linhas</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
})() : `<section class="sec"><p class="warn">⚠️ Dados de cobertura não encontrados. Execute <code>npm run test:coverage</code>.</p></section>`;

// ── HTML completo ──────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Relatório de Testes — Draft Play</title>
<style>
:root{--bg:#0a0a0f;--s1:#12121a;--s2:#1a1a26;--bd:#2a2a3e;--cy:#00f2ff;--gn:#22c55e;--yw:#eab308;--rd:#ef4444;--tx:#e2e8f0;--mu:#94a3b8;--r:12px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;line-height:1.6;padding:32px 24px;max-width:1100px;margin:0 auto}
.hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid var(--bd)}
.ht{font-size:22px;font-weight:900;letter-spacing:.05em}.ht span{color:var(--cy)}
.hm{color:var(--mu);font-size:12px;text-align:right}
.bn{display:flex;align-items:center;gap:20px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:20px 24px;margin-bottom:28px;flex-wrap:wrap}
.sp{font-size:13px;font-weight:900;letter-spacing:.1em;padding:6px 18px;border-radius:999px}
.pass{background:rgba(34,197,94,.15);color:var(--gn);border:1px solid rgba(34,197,94,.3)}
.fail{background:rgba(239,68,68,.15);color:var(--rd);border:1px solid rgba(239,68,68,.3)}
.sg{display:flex;gap:24px;flex-wrap:wrap}
.sv{display:flex;flex-direction:column}
.sn2{font-size:26px;font-weight:900;line-height:1}
.sl{font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
.cy{color:var(--cy)}.gn{color:var(--gn)}.rd{color:var(--rd)}.yw{color:var(--yw)}
.pb{flex:1;min-width:100px;height:8px;background:var(--s2);border-radius:999px;overflow:hidden;align-self:center}
.pf{height:100%;border-radius:999px;background:var(--gn)}
.pf.py{background:var(--yw)}
.sec{margin-bottom:32px}
.st{font-size:13px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--cy);margin-bottom:14px}

/* ── Seção de erros ── */
.fix-intro{font-size:12px;color:var(--mu);margin-bottom:14px;line-height:1.7}
.fix-intro strong{color:var(--tx)}
.fix-empty{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);padding:16px;color:var(--gn);font-size:13px}
.fix-card{background:var(--s1);border:1px solid var(--rd);border-left:4px solid var(--rd);border-radius:var(--r);margin-bottom:14px;overflow:hidden}
.fix-header{display:flex;align-items:flex-start;gap:12px;padding:14px 16px 10px}
.fix-num{background:var(--rd);color:#fff;font-size:11px;font-weight:900;padding:3px 8px;border-radius:999px;white-space:nowrap;margin-top:2px}
.fix-meta{flex:1}
.fix-suite{font-size:11px;color:var(--mu);font-family:monospace;word-break:break-all}
.fix-test{font-size:13px;font-weight:600;margin-top:2px}
.fix-loc{font-size:11px;color:var(--cy);margin-top:3px;font-family:monospace}
.fix-msg{background:rgba(239,68,68,.07);border-top:1px solid rgba(239,68,68,.15);padding:10px 16px;font-size:12px;color:#fca5a5}
.fix-detail{background:var(--s2);border-top:1px solid var(--bd);padding:12px 16px;font-size:11px;font-family:monospace;color:var(--mu);white-space:pre-wrap;word-break:break-all;max-height:180px;overflow-y:auto}
.fix-copy-wrap{padding:10px 16px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--bd)}
.fix-copy-btn{background:var(--cy);color:#000;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .2s}
.fix-copy-btn:hover{opacity:.85}
.fix-copy-ok{font-size:11px;color:var(--gn);opacity:0;transition:opacity .3s}
.fix-textarea{position:absolute;left:-9999px;top:-9999px;opacity:0}

/* ── Suites ── */
.suite{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;overflow:hidden}
.sp2{border-left:3px solid var(--gn)}.sf{border-left:3px solid var(--rd)}
details summary{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;list-style:none;user-select:none}
details summary::-webkit-details-marker{display:none}
.sic{font-size:13px;width:16px;text-align:center}.sn{flex:1;font-size:12px;font-weight:600}
.sm{display:flex;align-items:center;gap:8px}.sd{color:var(--mu);font-size:11px}
.b{font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid transparent}
.bg{background:rgba(34,197,94,.12);color:var(--gn);border-color:rgba(34,197,94,.3)}
.by{background:rgba(234,179,8,.12);color:var(--yw);border-color:rgba(234,179,8,.3)}
.br{background:rgba(239,68,68,.12);color:var(--rd);border-color:rgba(239,68,68,.3)}
.ct{width:100%;border-collapse:collapse;font-size:12px}
.ct thead tr{background:var(--s2);color:var(--mu);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.ct th,.ct td{padding:7px 12px;text-align:left;border-bottom:1px solid var(--bd)}
.tr-ok .ic{color:var(--gn)}.tr-fail .ic{color:var(--rd)}.tr-skip .ic{color:var(--mu)}
.tr-fail{background:rgba(239,68,68,.04)}
.cn{max-width:400px;word-break:break-word}.ct2{color:var(--mu);white-space:nowrap}
.cm{color:var(--rd);font-size:11px;max-width:260px;word-break:break-word}

/* ── Cobertura ── */
.cg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.cc{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:16px;text-align:center}
.cl{font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.cv{font-size:28px;font-weight:900}
.cv.bg{color:var(--gn)}.cv.by{color:var(--yw)}.cv.br{color:var(--rd)}
.covt{width:100%;border-collapse:collapse;font-size:12px}
.covt thead tr{background:var(--s2);color:var(--mu);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.covt th,.covt td{padding:8px 12px;border-bottom:1px solid var(--bd);text-align:left}
.cf{color:var(--mu);font-family:monospace;font-size:11px;word-break:break-all}
.warn{color:var(--yw);padding:12px;background:rgba(234,179,8,.08);border-radius:var(--r);border:1px solid rgba(234,179,8,.2)}
code{background:var(--s2);padding:2px 6px;border-radius:4px;font-size:12px}
.ft{text-align:center;color:var(--mu);font-size:11px;margin-top:40px;padding-top:20px;border-top:1px solid var(--bd)}
</style>
</head>
<body>

<header class="hd">
  <div class="ht">⚽ <span>Draft Play</span> — Relatório de Testes</div>
  <div class="hm">Gerado em ${dateStr} às ${timeStr}<br/>Vitest · Node ${process.version}</div>
</header>

<div class="bn">
  <span class="sp ${J.failed===0?'pass':'fail'}">${J.failed===0?'PASSOU':'FALHOU'}</span>
  <div class="sg">
    <div class="sv"><span class="sn2 cy">${J.total}</span><span class="sl">Total</span></div>
    <div class="sv"><span class="sn2 gn">${J.passed}</span><span class="sl">Passou</span></div>
    <div class="sv"><span class="sn2 rd">${J.failed}</span><span class="sl">Falhou</span></div>
    <div class="sv"><span class="sn2 yw">${J.skipped}</span><span class="sl">Pulado</span></div>
    <div class="sv"><span class="sn2">${dur(J.duration)}</span><span class="sl">Duração</span></div>
    <div class="sv"><span class="sn2 ${J.failed===0?'gn':'yw'}">${passRate}%</span><span class="sl">Aprovação</span></div>
  </div>
  <div class="pb"><div class="pf ${J.failed>0?'py':''}" style="width:${passRate}%"></div></div>
</div>

${allErrors.length > 0 ? `
<section class="sec">
  <h2 class="st">🔴 O Que Corrigir (${allErrors.length} ${allErrors.length===1?'erro':'erros'})</h2>
  <p class="fix-intro">
    Cada card abaixo mostra um teste que falhou.<br/>
    Clique em <strong>📋 Copiar para o Claude</strong> e cole diretamente na conversa para receber a correção.
  </p>
  ${fixSection}
</section>
` : `
<section class="sec">
  <h2 class="st">✅ Sem Erros</h2>
  <div class="fix-empty">Todos os ${J.total} testes passaram! 🎉</div>
</section>
`}

<section class="sec">
  <h2 class="st">🧪 Suites de Teste (${J.suites.length})</h2>
  ${suitesHTML||'<p class="warn">⚠️ Nenhum resultado encontrado. Execute <code>npm test</code> primeiro.</p>'}
</section>

${coverHTML}

<footer class="ft">Draft Play Test Report · ${dateStr} · ${J.total} testes em ${J.suites.length} suites</footer>

<script>
function copyFix(i) {
  const ta = document.getElementById('txt-' + i);
  const ok = document.getElementById('ok-' + i);
  try {
    navigator.clipboard.writeText(ta.value).then(() => {
      ok.style.opacity = '1';
      setTimeout(() => ok.style.opacity = '0', 2000);
    });
  } catch(e) {
    ta.style.position = 'static';
    ta.style.opacity  = '1';
    ta.select();
    document.execCommand('copy');
    ta.style.position = 'absolute';
    ta.style.left     = '-9999px';
    ok.style.opacity  = '1';
    setTimeout(() => ok.style.opacity = '0', 2000);
  }
}
</script>
</body>
</html>`;

const OUT = resolve(ROOT, 'test-report.html');
writeFileSync(OUT, HTML, 'utf-8');

console.log(`\n✅  Relatório gerado: ${OUT}`);
console.log('───────────────────────────────');
console.log(`    Total:    ${J.total}`);
console.log(`    Passou:   ${J.passed}`);
console.log(`    Falhou:   ${J.failed}`);
console.log(`    Taxa:     ${passRate}%`);
if(C) console.log(`    Cobertura: ${pct(C.total.lines)} linhas`);
if(J.failed > 0) {
  console.log('\n    ❌ Erros encontrados:');
  allErrors.forEach((e,i) => {
    console.log(`\n    #${i+1} ${e.suite}`);
    console.log(`       Teste: ${e.test}`);
    if(e.message) console.log(`       Erro:  ${e.message.slice(0,100)}`);
  });
}
console.log('───────────────────────────────\n');
