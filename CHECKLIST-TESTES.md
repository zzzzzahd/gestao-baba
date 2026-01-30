# ✅ CHECKLIST DE TESTES - MVP

## 🎯 ANTES DE COMPARTILHAR COM AMIGOS

Use este checklist para garantir que está tudo funcionando!

---

## 📱 TESTES DE INSTALAÇÃO PWA

### Android (Chrome/Edge)
- [ ] Site abre normalmente no navegador
- [ ] Banner de instalação aparece (rodapé)
- [ ] Botão "Adicionar à tela inicial" funciona
- [ ] Ícone aparece na tela inicial do Android
- [ ] App abre em tela cheia (sem barra do navegador)
- [ ] Tema escuro (#0d0d0d) aplicado
- [ ] Splash screen aparece ao abrir

### iOS (Safari)
- [ ] Site abre normalmente no Safari
- [ ] Menu compartilhar > "Adicionar à Tela de Início"
- [ ] Ícone aparece na tela inicial do iOS
- [ ] App abre em tela cheia
- [ ] Status bar configurada corretamente
- [ ] Não mostra barra do Safari

### Desktop (Chrome/Edge)
- [ ] Ícone de instalação aparece na barra de endereços
- [ ] Instalação via menu funciona
- [ ] App abre em janela própria
- [ ] Atalho criado no desktop/menu iniciar

---

## 🔐 TESTES DE AUTENTICAÇÃO

### Criar Conta
- [ ] Formulário de cadastro visível
- [ ] Campo nome funciona
- [ ] Campo email valida formato
- [ ] Campo senha exige mínimo 6 caracteres
- [ ] Mensagem de sucesso aparece
- [ ] Email de confirmação enviado (Supabase)
- [ ] Redirecionamento após cadastro

### Login
- [ ] Formulário de login visível
- [ ] Email e senha validam
- [ ] Login com credenciais corretas funciona
- [ ] Erro com credenciais incorretas
- [ ] Mensagem de erro clara
- [ ] Redirecionamento para dashboard

### Logout
- [ ] Botão de logout visível
- [ ] Logout funciona corretamente
- [ ] Redirecionamento para tela de login
- [ ] Dados sensíveis limpos

---

## 🏆 TESTES DE CRIAÇÃO DE BABA

### Criar Novo Baba
- [ ] Botão "Criar Baba" visível
- [ ] Modal de criação abre
- [ ] Campo nome obrigatório
- [ ] Seleção de modalidade (Futsal/Society)
- [ ] Configuração de horário funciona
- [ ] Toggle privado/público funciona
- [ ] Duração da partida configurável
- [ ] Código de convite gerado automaticamente
- [ ] Baba aparece na lista
- [ ] Presidente definido corretamente

### Visualizar Babas
- [ ] Lista de babas carrega
- [ ] Babas do usuário aparecem
- [ ] Informações corretas (nome, modalidade, etc)
- [ ] Click no baba seleciona corretamente
- [ ] Redirecionamento para home do baba

---

## 📅 TESTES DE PARTIDAS

### Confirmação de Presença
- [ ] Próximo jogo visível
- [ ] Countdown funcionando
- [ ] Data e hora corretas
- [ ] Botão "Confirmar Presença" funciona
- [ ] Status muda para "confirmado"
- [ ] Nome aparece na lista de confirmados
- [ ] Botão muda para "Cancelar Presença"
- [ ] Cancelamento funciona
- [ ] Trava 10min antes do jogo (testar timestamp)

### Lista de Confirmados
- [ ] Jogadores confirmados aparecem
- [ ] Ícone de goleiro diferenciado
- [ ] Contagem de jogadores correta
- [ ] Atualização em tempo real

---

## ⚽ TESTES DE PARTIDA (Quadra)

### Cronômetro
- [ ] Tempo inicial correto (10min ou configurado)
- [ ] Botão play inicia contagem
- [ ] Contagem regressiva funciona
- [ ] Botão pause para cronômetro
- [ ] Botão reset funciona
- [ ] Alerta quando tempo acaba

### Placar
- [ ] Times A e B visíveis
- [ ] Nomes dos times corretos
- [ ] Placar inicia em 0-0
- [ ] Botão "GOL" incrementa corretamente
- [ ] Morte súbita detectada (2 gols diferença)
- [ ] Empate detectado corretamente

### Finalizar Partida
- [ ] Botão "Finalizar" visível
- [ ] Modal de confirmação
- [ ] Vencedor definido corretamente
- [ ] Empate permite escolher vencedor (par/ímpar)
- [ ] Fila reorganizada (quem ganha fica)
- [ ] Estatísticas atualizadas

---

## 📊 TESTES DE RANKINGS

### Visualização
- [ ] Página de rankings carrega
- [ ] Toggle Mensal/Anual funciona
- [ ] Artilharia exibida corretamente
- [ ] Assistências exibidas corretamente
- [ ] Top 10 de cada categoria
- [ ] Medalhas (ouro, prata, bronze) corretas
- [ ] Posições dos jogadores

### Dados
- [ ] Gols contabilizados
- [ ] Assistências contabilizadas
- [ ] Empate de gols ordenado por nome
- [ ] Reset mensal (dia 1º) - verificar lógica
- [ ] Reset anual (1º jan) - verificar lógica

---

## 💰 TESTES FINANCEIROS

### Criar Cobrança (Presidente)
- [ ] Botão "Nova Cobrança" visível
- [ ] Modal de criação abre
- [ ] Campos: título, valor, vencimento
- [ ] Validação de valor numérico
- [ ] Cobrança criada com sucesso
- [ ] Aparece na lista

### Pagar Cobrança (Jogador)
- [ ] Lista de cobranças visível
- [ ] Botão "Já Paguei" funciona
- [ ] Status muda para "pendente confirmação"
- [ ] Chave PIX visível e copiável

### Confirmar Pagamento (Presidente)
- [ ] Lista de pendentes visível
- [ ] Botão de confirmar aparece
- [ ] Confirmação atualiza status
- [ ] Contador de confirmados atualiza

---

## 🌐 TESTES DE CONECTIVIDADE

### Offline
- [ ] Service Worker registrado
- [ ] Assets em cache
- [ ] App funciona sem internet (navegação)
- [ ] Página offline aparece quando necessário
- [ ] Ícones e estilos carregam do cache
- [ ] Sincronização ao voltar online

### Performance
- [ ] Lighthouse score PWA > 90
- [ ] Lighthouse Performance > 80
- [ ] Carregamento inicial < 3s
- [ ] Interatividade < 2s
- [ ] Fontes carregam rápido

---

## 🔒 TESTES DE SEGURANÇA

### Proteção de Rotas
- [ ] Usuário não logado não acessa dashboard
- [ ] Redirecionamento para login funciona
- [ ] Jogador não pode editar baba de outro
- [ ] Apenas presidente pode confirmar pagamentos
- [ ] Apenas coordenador pode gerenciar partida

### Dados
- [ ] RLS (Row Level Security) ativo no Supabase
- [ ] Usuário só vê babas que participa
- [ ] Dados sensíveis não expostos
- [ ] Tokens de autenticação seguros

---

## 📱 TESTES MOBILE

### Responsividade
- [ ] Layout adapta para mobile
- [ ] Textos legíveis em telas pequenas
- [ ] Botões tocáveis (min 44x44px)
- [ ] Não precisa zoom horizontal
- [ ] Inputs não causam zoom indesejado

### Touch/Gestos
- [ ] Botões respondem ao toque
- [ ] Scroll funciona suavemente
- [ ] Sem atraso no tap
- [ ] Modals fecham com gesto

### Orientação
- [ ] Modo retrato funcional
- [ ] Modo paisagem aceitável
- [ ] Rotação não quebra layout

---

## 🎨 TESTES VISUAIS

### Tema Cyberpunk
- [ ] Cores corretas (cyan #00f2ff, green #39ff14)
- [ ] Fundo escuro (#0d0d0d)
- [ ] Background grid pattern visível
- [ ] Glassmorphism nos cards
- [ ] Sombras e glows aplicados

### Animações
- [ ] Fade-in nas telas
- [ ] Slide-up em modals
- [ ] Transições suaves
- [ ] Loading spinners
- [ ] Sem lag perceptível

### Tipografia
- [ ] Fontes carregam (Rajdhani, Orbitron)
- [ ] Hierarquia clara
- [ ] Legibilidade boa
- [ ] Font Awesome icons aparecem

---

## 🐛 TESTES DE BUGS COMUNS

### Erros Conhecidos
- [ ] Refresh não perde estado
- [ ] Voltar do navegador funciona
- [ ] Dados carregam após reconexão
- [ ] Modals não travam
- [ ] Formulários limpam após submit
- [ ] Toast notifications aparecem

### Edge Cases
- [ ] Baba sem jogadores
- [ ] Partida sem gols
- [ ] Empate em 0-0
- [ ] Nome muito longo
- [ ] Caracteres especiais em nomes
- [ ] Múltiplos clicks simultâneos

---

## 🎯 TESTES COM USUÁRIOS REAIS

### Primeira Impressão (1 min)
- [ ] Visual agradável
- [ ] Identifica que é app de pelada
- [ ] Entende como começar

### Onboarding (5 min)
- [ ] Consegue criar conta sozinho
- [ ] Consegue criar baba sozinho
- [ ] Entende conceito do app

### Uso Real (30 min)
- [ ] Confirma presença
- [ ] Vê times sorteados
- [ ] Entende placar ao vivo
- [ ] Navega entre telas

### Feedback
- [ ] Coletar o que gostou
- [ ] Coletar o que não entendeu
- [ ] Coletar sugestões
- [ ] Nota de 0-10

---

## 🚀 CHECKLIST PRÉ-LANÇAMENTO

### Técnico
- [ ] Todas as funcionalidades testadas
- [ ] Zero erros no console
- [ ] Lighthouse score > 85
- [ ] Supabase configurado
- [ ] Vercel configurado
- [ ] PWA instalável

### Conteúdo
- [ ] Textos revisados
- [ ] Sem lorem ipsum
- [ ] Ícones criados
- [ ] Screenshots tirados
- [ ] QR Code gerado

### Marketing
- [ ] Instagram criado
- [ ] Post de lançamento pronto
- [ ] Mensagem de WhatsApp pronta
- [ ] 5 amigos confirmados para testar

### Suporte
- [ ] Link de feedback criado
- [ ] WhatsApp de suporte definido
- [ ] FAQ básico escrito

---

## 📈 MÉTRICAS PARA ACOMPANHAR

### Primeira Semana
- [ ] Quantos instalaram
- [ ] Quantos criaram conta
- [ ] Quantos criaram baba
- [ ] Quantos confirmaram presença
- [ ] Taxa de retenção (voltaram?)

### Feedback
- [ ] NPS (Net Promoter Score)
- [ ] Feature mais usada
- [ ] Feature menos usada
- [ ] Bug mais reportado
- [ ] Elogio mais comum

---

## ✅ APROVAÇÃO FINAL

Só compartilhe com amigos quando:

- [ ] ✅ Todos os testes passaram
- [ ] ✅ App instalável em Android e iOS
- [ ] ✅ Funciona offline
- [ ] ✅ Zero bugs críticos
- [ ] ✅ Visual polido
- [ ] ✅ Você mesmo usaria

---

## 🎉 ESTÁ PRONTO?

Se marcou **TODOS** os itens acima:

🚀 **PODE LANÇAR!**

Compartilhe com 5-10 amigos primeiro, colete feedback, ajuste, e depois escale!

---

**DRAFT - Gestão de Baba** 🏆  
Checklist de Qualidade MVP
