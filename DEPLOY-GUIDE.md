# 🚀 GUIA DE DEPLOY - GESTÃO DE BABA

Este guia detalha o processo completo de deploy da aplicação usando GitHub, Supabase e Vercel.

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se de ter:
- Conta no GitHub (gratuita)
- Conta no Supabase (gratuita)
- Conta no Vercel (gratuita)
- Git instalado em sua máquina
- Node.js 18+ instalado

---

## 🗄️ PARTE 1: CONFIGURAÇÃO DO SUPABASE

### 1.1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login ou crie uma conta
4. Clique em "New Project"
5. Preencha:
   - **Name**: gestao-baba (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte (anote!)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
6. Clique em "Create new project"
7. Aguarde alguns minutos até o projeto ser criado

### 1.2. Obter Credenciais

1. Na dashboard do projeto, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Anote as seguintes informações:
   - **Project URL**: `https://[seu-projeto].supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1.3. Criar Tabelas do Banco de Dados

1. No menu lateral, clique em **SQL Editor**
2. Clique em "New query"
3. Abra o arquivo `supabase-schema.sql` do projeto
4. Copie **TODO** o conteúdo do arquivo
5. Cole no editor SQL do Supabase
6. Clique em "Run" (ou pressione Ctrl + Enter)
7. Aguarde a execução (pode levar alguns segundos)
8. Verifique se apareceu "Success. No rows returned"

### 1.4. Verificar Tabelas Criadas

1. No menu lateral, clique em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - users
   - babas
   - players
   - matches
   - match_players
   - goals
   - cards
   - presences
   - financials
   - payments

### 1.5. Configurar Autenticação

1. No menu lateral, clique em **Authentication**
2. Clique em **Providers**
3. Em **Email**, certifique-se que está **habilitado**
4. Configure:
   - **Enable Email provider**: ✅ ON
   - **Confirm email**: ✅ ON (recomendado para produção)
   - **Secure email change**: ✅ ON

---

## 📦 PARTE 2: PREPARAÇÃO DO CÓDIGO

### 2.1. Configurar Variáveis de Ambiente

1. No diretório do projeto, copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2.2. Testar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o projeto:
   ```bash
   npm run dev
   ```

3. Abra o navegador em `http://localhost:3000`
4. Teste:
   - Criar uma conta
   - Fazer login
   - Criar um baba
   - Navegar pelas páginas

Se tudo funcionar, prossiga para o deploy!

---

## 🌐 PARTE 3: DEPLOY NO VERCEL VIA GITHUB

### 3.1. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Faça login ou crie uma conta
3. Clique no ícone **+** no canto superior direito
4. Selecione **New repository**
5. Preencha:
   - **Repository name**: gestao-baba
   - **Description**: Sistema de gestão de peladas
   - **Visibility**: Public ou Private (sua escolha)
6. **NÃO** marque "Initialize this repository with a README"
7. Clique em "Create repository"

### 3.2. Enviar Código para o GitHub

1. No terminal, dentro da pasta do projeto, execute:

   ```bash
   # Inicializar git (se ainda não foi feito)
   git init
   
   # Adicionar todos os arquivos
   git add .
   
   # Fazer o primeiro commit
   git commit -m "Initial commit: Gestão de Baba v1.0"
   
   # Adicionar o repositório remoto (substitua SEU_USUARIO)
   git remote add origin https://github.com/SEU_USUARIO/gestao-baba.git
   
   # Renomear branch para main
   git branch -M main
   
   # Enviar para o GitHub
   git push -u origin main
   ```

2. Digite suas credenciais do GitHub se solicitado
3. Aguarde o upload ser concluído
4. Acesse seu repositório no GitHub para confirmar que os arquivos foram enviados

### 3.3. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up" ou "Log In"
3. Escolha "Continue with GitHub"
4. Autorize a conexão do Vercel com o GitHub

#### 3.3.1. Importar Projeto

1. No dashboard da Vercel, clique em "Add New..."
2. Selecione "Project"
3. Encontre o repositório "gestao-baba" na lista
4. Clique em "Import"

#### 3.3.2. Configurar Projeto

1. Na tela de configuração:
   - **Project Name**: gestao-baba (ou mantenha o padrão)
   - **Framework Preset**: Vite (deve detectar automaticamente)
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `dist` (padrão)

2. Em **Environment Variables**, adicione:
   - Clique em "Add Environment Variable"
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Cole sua URL do Supabase
   - Clique em "Add"
   
   - Clique em "Add Environment Variable" novamente
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Cole sua Anon Key do Supabase
   - Clique em "Add"

3. Clique em "Deploy"

#### 3.3.3. Aguardar Deploy

1. A Vercel começará a fazer o build e deploy
2. Acompanhe o progresso na tela
3. O processo leva de 1 a 3 minutos
4. Quando aparecer "Congratulations!", o deploy foi concluído!

---

## ✅ PARTE 4: ACESSAR E TESTAR

### 4.1. Acessar o Site

1. A Vercel fornecerá uma URL do tipo:
   ```
   https://gestao-baba.vercel.app
   ```
   ou
   ```
   https://gestao-baba-seu-usuario.vercel.app
   ```

2. Clique na URL para abrir o site
3. Teste todas as funcionalidades:
   - Criar conta
   - Login
   - Criar baba
   - Confirmar presença
   - Ver rankings
   - etc.

### 4.2. Configurar Domínio Personalizado (Opcional)

Se você tem um domínio próprio:

1. No dashboard da Vercel, clique no projeto
2. Vá em **Settings** > **Domains**
3. Digite seu domínio (ex: `meubaba.com`)
4. Siga as instruções para configurar DNS
5. Aguarde propagação (pode levar até 48h)

---

## 🔄 PARTE 5: ATUALIZAÇÕES FUTURAS

### 5.1. Fazer Mudanças no Código

```bash
# 1. Edite os arquivos desejados
# 2. Teste localmente
npm run dev

# 3. Commit das mudanças
git add .
git commit -m "Descrição da mudança"

# 4. Enviar para o GitHub
git push
```

**🎉 A Vercel fará o redeploy AUTOMATICAMENTE!**

### 5.2. Rollback (Reverter Deploy)

Se algo der errado:

1. No dashboard da Vercel, vá em **Deployments**
2. Encontre um deployment anterior que funcionava
3. Clique nos três pontinhos (...)
4. Selecione "Promote to Production"

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### Erro: "Supabase URL is not defined"

**Solução**: Verifique se as variáveis de ambiente estão corretas na Vercel:
1. Vá em Settings > Environment Variables
2. Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão preenchidas
3. Faça um novo deploy (Deployments > ... > Redeploy)

### Erro de Autenticação

**Solução**: Verifique no Supabase:
1. Authentication > Providers
2. Certifique-se que Email está habilitado
3. Verifique as configurações de URL em Settings > API

### Deploy Falhou

**Solução**:
1. Verifique os logs na Vercel
2. Certifique-se que `package.json` está correto
3. Teste o build local: `npm run build`
4. Se o erro persistir, delete o projeto na Vercel e reimporte

### Não Consigo Criar Conta

**Solução**:
1. Abra o console do navegador (F12)
2. Veja se há erros de CORS
3. No Supabase, vá em Authentication > URL Configuration
4. Adicione sua URL do Vercel em "Site URL"

---

## 📊 MONITORAMENTO

### Ver Logs de Acesso
1. Dashboard da Vercel
2. Clique no projeto
3. Vá em **Analytics**

### Ver Erros do Backend
1. Dashboard do Supabase
2. Vá em **Logs**
3. Selecione o tipo de log (Auth, Database, etc)

---

## 🎯 CHECKLIST FINAL

Antes de considerar o deploy completo, verifique:

- [ ] Site acessível pela URL da Vercel
- [ ] É possível criar uma conta
- [ ] Login funciona corretamente
- [ ] Possível criar um baba
- [ ] Confirmação de presença funciona
- [ ] Rankings carregam corretamente
- [ ] Sistema financeiro funciona
- [ ] Não há erros no console do navegador

---

## 🎉 PARABÉNS!

Seu sistema de gestão de baba está no ar! 🏆⚽

Agora você pode:
- Compartilhar o link com seus amigos
- Começar a usar o sistema
- Fazer melhorias no código
- Adicionar novas funcionalidades

---

## 📞 SUPORTE

Se precisar de ajuda:
- Issues do GitHub: Abra uma issue no repositório
- Documentação Supabase: https://supabase.com/docs
- Documentação Vercel: https://vercel.com/docs
- Comunidade React: https://react.dev/community
