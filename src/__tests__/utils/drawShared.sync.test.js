// As cópias em supabase/functions/_shared (usadas pela Edge Function auto-draw)
// precisam ser idênticas às de src/utils — é isso que garante que sorteio manual
// e automático usam o MESMO algoritmo e a MESMA agenda.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

describe('cópias compartilhadas com a Edge Function', () => {
  it.each(['drawAlgorithm.js', 'drawSchedule.js'])('%s é idêntico em src/utils e supabase/functions/_shared', (f) => {
    expect(
      read(`supabase/functions/_shared/${f}`),
      `Divergiu. Rode: cp src/utils/${f} supabase/functions/_shared/${f}`,
    ).toBe(read(`src/utils/${f}`));
  });
});
