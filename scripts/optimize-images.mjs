// scripts/optimize-images.mjs
// Gera as variantes responsivas (srcset) das imagens de public/marketing/.
// Uso (manual, só quando trocar um print):  npm i --no-save sharp && node scripts/optimize-images.mjs
// Os arquivos gerados são versionados no repositório; o build NÃO roda este script.
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const DIR = 'public/marketing';

// 384 ≈ 212px x DPR 1,75 (celulares comuns); 424 = DPR 2.
// arquivo (sem extensão) -> larguras a gerar. O original continua sendo a maior variante.
const JOBS = {
  'mascote-prancheta': [320],            // exibido a 320px; original 560 cobre telas 2x
  'app-baba': [212, 384, 424],                // exibidos a 212px; 424 = 2x; original 540 = ~2,5x
  'app-sorteio': [212, 384, 424],
  'app-rankings': [212, 384, 424],
  'app-comparacao': [212, 384, 424],
  'app-perfil': [212, 384, 424],
  'app-caixa': [212, 384, 424],
  'app-visitante': [212, 384, 424],
  'sorteio-times': [202],                // exibidos a ~101px; 202 = 2x; original 360 = ~3,5x
  'placar-ao-vivo': [202],
};

for (const [name, widths] of Object.entries(JOBS)) {
  for (const w of widths) {
    const out = `${DIR}/${name}-${w}.webp`;
    if (existsSync(out)) continue;
    await sharp(`${DIR}/${name}.webp`)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(out);
    console.log('gerado', out);
  }
}
