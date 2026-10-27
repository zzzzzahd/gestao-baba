// src/utils/parseDetailedPlayerList.js
//
// Lê uma lista colada (WhatsApp, planilha, anotação), uma pessoa por linha, em dois
// formatos que podem ser misturados:
//   "1. Joao"                 -> nome, posição "linha", nível 2
//   "1. Joao - Linha - 2"     -> nome, posição e nível
// Depois do nome, posição e nível podem vir em qualquer ordem e são opcionais.
//
// Mantém o comportamento do antigo parsePlayerList: remove numeração, marcadores
// e emojis de confirmação, ignora títulos terminados em ":", aceita ";" como
// separador de jogadores e ignora repetidos (sem diferenciar maiúsculas e acentos).

export const normalizeName = (s) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const POSITION_WORDS = {
  linha: 'linha',
  goleiro: 'goleiro',
  goleira: 'goleiro',
  gol: 'goleiro',
  gk: 'goleiro',
};

const LEVEL_WORDS = {
  '1': 1, '2': 2, '3': 3,
  abaixo: 1, baixo: 1, 'abaixo da media': 1,
  media: 2, medio: 2, 'na media': 2,
  acima: 3, alto: 3, 'acima da media': 3,
};

const EMOJIS = /[✅☑️✔️❌✖️🟢🔴]/gu;
// Numeração/marcadores no começo: "1.", "2)", "3 -", "4:", "-", "•", "*"
const LEADING = /^\s*(?:\d{1,3}\s*[.)\-–:]\s*|[-•*]\s+)/;
// Separadores de campo: " - " (com espaços, preserva "Jean-Pierre"), "|" e tab.
const FIELD_SEPARATOR = /\s+[-–—]\s+|\s*\|\s*|\t/;

function classify(part) {
  const key = normalizeName(part);
  if (Object.prototype.hasOwnProperty.call(POSITION_WORDS, key)) {
    return { position: POSITION_WORDS[key] };
  }
  if (Object.prototype.hasOwnProperty.call(LEVEL_WORDS, key)) {
    return { stars: LEVEL_WORDS[key] };
  }
  return null;
}

export function parseDetailedPlayerList(text) {
  const players = [];
  const duplicates = [];
  const warnings = [];
  const seen = new Set();

  const handleEntry = (segments, lineNumber) => {
    const first = segments[0].replace(LEADING, '').trim();
    if (!first) return;
    // Título da lista ("Lista do baba:"): só ignora quando é a linha inteira.
    if (segments.length === 1 && /:$/.test(first)) return;

    let parts = [first, ...segments.slice(1)]
      .flatMap((s) => s.split(FIELD_SEPARATOR))
      .map((p) => p.trim())
      .filter(Boolean);

    // Formato sem espaços ("Joao-Linha-2"): só vale se tudo após o nome for reconhecido.
    if (parts.length === 1) {
      const alt = parts[0].split('-').map((p) => p.trim()).filter(Boolean);
      if (alt.length > 1 && alt.slice(1).every((p) => classify(p))) parts = alt;
    }

    let name = parts[0];
    if (!name) return;
    if (name.length > 40) name = name.slice(0, 40).trim();

    const key = normalizeName(name);
    if (seen.has(key)) { duplicates.push(name); return; }
    seen.add(key);

    const player = { name, position: 'linha', stars: 2 };
    parts.slice(1).forEach((part) => {
      const found = classify(part);
      if (found) Object.assign(player, found);
      else warnings.push(`Linha ${lineNumber}: "${part}" não foi reconhecido (usado o padrão).`);
    });
    players.push(player);
  };

  String(text ?? '').split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const chunks = rawLine.replace(EMOJIS, '').split(';');

    // "Joao; Linha; 2": o que vem após o ";" é posição/nível -> são campos do mesmo jogador.
    if (chunks.length > 1 && chunks.slice(1).every((c) => classify(c.trim()))) {
      handleEntry(chunks, lineNumber);
    } else {
      // "Joao; Bruno": cada trecho é um jogador (comportamento antigo).
      chunks.forEach((chunk) => handleEntry([chunk], lineNumber));
    }
  });

  return { players, duplicates, warnings };
}
