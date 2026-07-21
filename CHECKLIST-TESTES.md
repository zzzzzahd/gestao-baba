# ✅ Checklist de Testes — Draft Play

Checklist completo para validar **todas as funções** do aplicativo antes de lançar ou após mudanças grandes.

**Como usar**
1. Configure o ambiente com o [GUIA-TESTES.md](GUIA-TESTES.md) (5 minutos).
2. Marque cada item com `[x]` conforme for testando.
3. Anote falhas na seção **Resultado** no final.
4. Rode também os testes automáticos: `npm test` e `npm run test:e2e`.

**Ambiente**
- [ ] App rodando em `http://localhost:3000`
- [ ] Conta de teste criada (e-mail + senha)
- [ ] Baba de teste criado (modo completo, se possível)
- [ ] Segundo usuário (membro) para testes de convite/presença

---

## 1. Páginas públicas

### 1.1 Landing (`/`)
- [ ] Página carrega sem erro
- [ ] Logo e título aparecem
- [ ] Botão **Entrar no Meu Baba** leva para `/login`
- [ ] Botão **Modo Visitante** leva para `/visitor`
- [ ] Links/recursos (sorteio, placar, rankings, financeiro) visíveis
- [ ] Layout ok no celular e no desktop

### 1.2 Login / Cadastro (`/login`)
- [ ] Formulário de login aparece
- [ ] Login com e-mail/senha válidos entra no app
- [ ] Login com senha errada mostra erro claro
- [ ] Cadastro de nova conta funciona
- [ ] Validação de campos vazios
- [ ] Usuário logado é redirecionado (não fica preso na tela de login)

### 1.3 Privacidade e Termos
- [ ] `/privacidade` carrega conteúdo LGPD
- [ ] `/termos` carrega os termos de uso
- [ ] Links são legíveis e navegáveis

### 1.4 Entrar por convite (`/join/:code`)
- [ ] Código inválido mostra mensagem clara
- [ ] Código expirado / limite atingido tratado
- [ ] Código válido permite entrar no baba (logado)
- [ ] Visitante sem conta é orientado a fazer login/cadastro

### 1.5 Perfil público (`/player/:userId`)
- [ ] Perfil de outro jogador abre
- [ ] Estatísticas básicas visíveis
- [ ] ID inexistente tratado sem quebrar a página

### 1.6 Seguidores (`/followers` e `/followers/:userId`)
- [ ] Lista de seguidores/seguindo carrega
- [ ] Navegação entre perfis funciona

---

## 2. Modo visitante (sem conta)

### 2.1 Visitante (`/visitor`)
- [ ] Entra sem login
- [ ] Consegue montar times localmente
- [ ] Nomes dos jogadores podem ser adicionados/editados
- [ ] Sorteio local funciona
- [ ] Dados não dependem do Supabase (offline ok)

### 2.2 Partida visitante (`/visitor-match`)
- [ ] Placar e cronômetro funcionam
- [ ] Gols podem ser registrados
- [ ] Ao sair, comportamento esperado (sem salvar na nuvem)

---

## 3. Autenticação e proteção de rotas

- [ ] Rotas protegidas (`/home`, `/dashboard`, `/draw`, etc.) redirecionam para `/login` se deslogado
- [ ] Após login, usuário volta ao fluxo normal
- [ ] Logout encerra a sessão
- [ ] Recarregar a página mantém a sessão (persistência)
- [ ] Banner offline aparece ao ficar sem internet
- [ ] Consentimento LGPD aparece para usuário sem `consent_at`
- [ ] Aceitar consentimento libera o app

---

## 4. Home e babas (`/home`)

- [ ] Lista de babas do usuário
- [ ] Estado vazio (sem babas) com CTA para criar/entrar
- [ ] Entrar em um baba seleciona o contexto
- [ ] Criar novo baba leva para `/create`
- [ ] Entrar com código de convite
- [ ] Torneios (se houver) aparecem / link funciona
- [ ] Pull-to-refresh atualiza a lista (mobile)
- [ ] FAB / botões principais acessíveis

---

## 5. Criar baba (`/create`)

- [ ] Passo identidade: nome, descrição, público/privado
- [ ] Passo agenda: dia, horário, modalidade (futsal/society)
- [ ] Passo confirmação: resumo correto
- [ ] Criação salva no Supabase e redireciona
- [ ] Validação impede avançar com campos obrigatórios vazios
- [ ] Usuário vira presidente do baba criado

---

## 6. Dashboard (`/dashboard`)

### 6.1 Visão geral
- [ ] Resumo do próximo jogo
- [ ] Badge do modo do baba (casual / competitivo / completo)
- [ ] Contagem de confirmados / vagas

### 6.2 Gestão (presidente / coordenador)
- [ ] Ver membros
- [ ] Convidar (código / QR)
- [ ] Configurações do baba
- [ ] Coordenadores (adicionar/remover, limite)
- [ ] Modo do baba alterável (se permitido)

### 6.3 Pós-jogo
- [ ] Card pós-partida quando houver partida recente
- [ ] Fluxo de avaliação / MVP acessível

---

## 7. Presença

- [ ] Jogador confirma presença
- [ ] Jogador cancela presença
- [ ] Prazo / trava de presença respeitada (se configurada)
- [ ] Fila de espera funciona quando lotado
- [ ] Presidente vê lista de confirmados
- [ ] Contadores atualizam após confirmar/cancelar

---

## 8. Sorteio e partida ao vivo (`/draw`)

### 8.1 Configuração
- [ ] Só presidente/coordenador inicia sorteio (permissão)
- [ ] Escolha de formato (futsal/society / times)
- [ ] Restrições / constraints (se disponíveis)
- [ ] Lista de jogadores confirmados correta

### 8.2 Times
- [ ] Sorteio equilibra times
- [ ] Goleiros separados (quando aplicável)
- [ ] Ajuste manual de times (se houver)
- [ ] Confirmar times e avançar

### 8.3 Partida ao vivo
- [ ] Cronômetro inicia / pausa / zera
- [ ] Registrar gol
- [ ] Assistência (se houver)
- [ ] Cartões (amarelo / azul / vermelho) se modo permitir
- [ ] Placar atualiza em tempo real
- [ ] Reações durante a partida
- [ ] Compartilhar partida
- [ ] Finalizar partida
- [ ] Tela de MVP / votação
- [ ] Avaliação de jogadores pós-jogo

---

## 9. Rankings (`/rankings`)

- [ ] Pódio / lista carrega
- [ ] Abas (gols, assistências, etc.)
- [ ] Filtro por período (mês / ano / geral)
- [ ] Dados batem com partidas finalizadas
- [ ] Compartilhar ranking (se disponível)

---

## 10. Histórico (`/history`)

- [ ] Lista de partidas passadas
- [ ] Expandir detalhes (placar, gols, times)
- [ ] Filtros funcionam
- [ ] Paginação / carregar mais (se houver)
- [ ] Partida vazia / sem histórico tratado

---

## 11. Comparação (`/comparison`)

- [ ] Selecionar dois jogadores
- [ ] Barras / stats comparam corretamente
- [ ] Parâmetros na URL (deep link) funcionam
- [ ] Jogador sem dados não quebra a tela

---

## 12. Financeiro (`/financial`)

> Depende do modo do baba (recursos progressivos / modo completo).

- [ ] Membro vê cobranças pendentes
- [ ] Copiar PIX / pagar
- [ ] Presidente cria cobrança
- [ ] Presidente aprova/rejeita pagamento
- [ ] Filtros (pendente / pago / todos)
- [ ] Valores e status corretos

---

## 13. Perfil (`/profile`)

- [ ] Dados do usuário (nome, foto, stats)
- [ ] Editar perfil
- [ ] Abas / seções (badges, estatísticas)
- [ ] Card compartilhável
- [ ] Link para perfil público
- [ ] Exportar dados (LGPD)
- [ ] Excluir conta (fluxo de confirmação)
- [ ] Tema claro/escuro (se disponível)

---

## 14. Torneios

### 14.1 Página do torneio (`/torneio/:id`)
- [ ] Bracket (mata-mata) ou tabela (pontos corridos)
- [ ] Abas / rodadas
- [ ] Criar torneio (presidente) via modal
- [ ] Status das partidas

### 14.2 Partida de torneio (`/torneio/:id/partida/:matchId`)
- [ ] Abrir partida do bracket
- [ ] Registrar resultado
- [ ] Avanço automático no chaveamento (se aplicável)

---

## 15. Convites e QR

- [ ] Gerar código de convite
- [ ] Modal QR abre e renderiza o código
- [ ] Copiar link de convite
- [ ] Convite funciona em outro dispositivo/usuário
- [ ] Convite expirado / limite tratado

---

## 16. Onboarding, changelog e feedback

- [ ] Onboarding aparece no primeiro uso (após consentimento)
- [ ] Pode pular / concluir
- [ ] Changelog aparece após atualização de versão
- [ ] Feedback modal envia / fecha corretamente
- [ ] Beta feedback em jogadores elegíveis (games_played)

---

## 17. Notificações e PWA

- [ ] Prompt de push aparece no momento certo
- [ ] Permitir / negar push sem quebrar o app
- [ ] Instalar PWA (Android / desktop)
- [ ] App instalado abre em standalone
- [ ] Offline: banner e cache básico
- [ ] Fila offline: ações enfileiradas e sincronizam ao voltar online

---

## 18. Segurança e LGPD

- [ ] XSS: campos de texto não executam HTML/script
- [ ] Dados sensíveis não aparecem no HTML (chaves, service_role)
- [ ] Rotas protegidas não vazam conteúdo deslogado
- [ ] Consentimento obrigatório antes do uso
- [ ] Privacidade e termos acessíveis
- [ ] Exclusão / exportação de dados disponíveis

---

## 19. Modos do baba e desbloqueios

- [ ] Modo casual: só funções básicas
- [ ] Modo competitivo: rankings etc.
- [ ] Modo completo: financeiro e demais recursos
- [ ] Features progressivas desbloqueiam com jogos jogados
- [ ] Toasts de desbloqueio aparecem

---

## 20. Testes automáticos (obrigatório no CI)

Rode na raiz do projeto:

```bash
# Unitários + integração (Vitest)
npm test

# Com cobertura
npm run test:coverage

# E2E no navegador (Playwright)
npm run test:e2e

# Relatório HTML
npm run test:report
```

- [ ] `npm test` passa
- [ ] `npm run test:coverage` atinge os limiares
- [ ] `npm run test:e2e` passa (páginas públicas)
- [ ] Build: `npm run build` conclui sem erro

---

## Resultado do ciclo

| Item | Valor |
|------|--------|
| Data | |
| Testador | |
| Branch / versão | |
| Ambiente (local / preview / prod) | |
| Itens OK | __ / __ |
| Bugs encontrados | |
| Bloqueadores para release | Sim / Não |

### Bugs anotados

1. …
2. …

---

**Próximo passo:** se algo falhar, abra uma issue ou corrija e rode de novo `npm test` + o trecho manual correspondente.
