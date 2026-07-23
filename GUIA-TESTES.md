# 🧪 Guia de Testes — Draft Play

Configuração simples, em português, para rodar testes unitários, integração e E2E.

---

## Configuração rápida (5 minutos)

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

```bash

```

```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edite o `.env` com as chaves do Supabase (**Project Settings → API**):


| Variável                        | Obrigatória | Onde pegar        |
| ------------------------------- | ----------- | ----------------- |
| `VITE_SUPABASE_URL`             | Sim         | Project URL       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim         | anon / public key |
| `VITE_VAPID_PUBLIC_KEY`         | Não         | Push (opcional)   |
| `VITE_SENTRY_DSN`               | Não         | Sentry (opcional) |


> Os testes unitários (Vitest) **não precisam** do `.env` — usam mocks.
> O app (`npm run dev`) e os E2E reais **precisam** do `.env`.

### 3. Subir o app (para testes manuais / E2E)

```bash
npm run dev
```

Abra: [http://localhost:3000](http://localhost:3000)

### 4. Instalar navegadores do Playwright (só na primeira vez)

```bash
npx playwright install
```

No Windows, se faltar dependência do sistema:

```bash
npx playwright install --with-deps chromium
```

---

## Comandos de teste


| Comando                    | O que faz                                      |
| -------------------------- | ---------------------------------------------- |
| `npm test`                 | Todos os testes Vitest (unitário + integração) |
| `npm run test:watch`       | Reexecuta ao salvar arquivos                   |
| `npm run test:ui`          | Interface visual do Vitest                     |
| `npm run test:coverage`    | Cobertura de código                            |
| `npm run test:pages`       | Só testes de páginas                           |
| `npm run test:components`  | Só componentes                                 |
| `npm run test:hooks`       | Só hooks                                       |
| `npm run test:utils`       | Só utils                                       |
| `npm run test:services`    | Só services                                    |
| `npm run test:integration` | Só integração                                  |
| `npm run test:security`    | Só segurança                                   |
| `npm run test:e2e`         | E2E Playwright (Chromium)                      |
| `npm run test:e2e:ui`      | Playwright com UI                              |
| `npm run test:e2e:report`  | Abre o relatório HTML do E2E                   |
| `npm run test:report`      | Vitest + relatório HTML                        |
| `npm run test:all`         | Vitest + E2E em sequência                      |


---

## Estrutura dos testes

```
src/__tests__/
├── setup.js           # Mocks globais (Supabase, router, toast…)
├── helpers.jsx        # renderWithRouter, factories
├── components/        # Testes de componentes
├── contexts/          # Auth / Baba
├── hooks/
├── pages/
├── services/
├── utils/
├── integration/       # Fluxos (auth, presença, sorteio, financeiro)
└── security/          # XSS, rotas, LGPD, convites

e2e/
├── smoke.spec.js      # Páginas públicas e rotas básicas
└── navegacao.spec.js  # Navegação e links principais
```

---

## Testes manuais (todas as funções)

Use o checklist completo:

➡️ **[CHECKLIST-TESTES.md](CHECKLIST-TESTES.md)**

Ele cobre: landing, login, visitante, home, criar baba, dashboard, presença, sorteio, partida, rankings, histórico, comparação, financeiro, perfil, torneios, convites, PWA, LGPD e modos.

---

## O que cada tipo de teste cobre


| Tipo                  | Ferramenta | Precisa de Supabase? | Quando usar                   |
| --------------------- | ---------- | -------------------- | ----------------------------- |
| Unitário / componente | Vitest     | Não (mock)           | Ao mudar um arquivo           |
| Integração            | Vitest     | Não (mock)           | Fluxos entre telas/hooks      |
| Segurança             | Vitest     | Não                  | Antes de release              |
| E2E smoke             | Playwright | Opcional*            | Páginas públicas no browser   |
| Manual                | Checklist  | Sim                  | Validação completa do produto |


 O E2E sobe o Vite automaticamente. Páginas públicas funcionam sem login. Fluxos autenticados no E2E exigem `.env` + conta de teste (futuro).

---

## Problemas comuns

### `Supabase não configurado`

Falta `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.  
Copie de `.env.example` e preencha.

### Playwright não acha o browser

```bash
npx playwright install chromium
```

### Porta 3000 ocupada

Feche o outro processo ou altere a porta em `vite.config.js` (`server.port`) e em `playwright.config.js` (`baseURL` / `webServer.url`).

### Testes falhando só no CI

O CI usa placeholders de env. Confirme que os testes unitários não dependem de API real (devem usar o mock em `src/__tests__/setup.js`).

---

## Checklist mínimo antes de abrir PR

- `npm test` passou
- `npm run build` passou
- Fluxo manual que você alterou marcado no [CHECKLIST-TESTES.md](CHECKLIST-TESTES.md)
- Sem secrets no commit (`.env` está no `.gitignore`)

