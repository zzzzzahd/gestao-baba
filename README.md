# 🏆 DRAFT - Sistema de Gestão de Baba

Sistema profissional para gerenciamento de peladas (babas) com controle de presença, sorteio de times, placar ao vivo, rankings e gestão financeira.

![Visual Cyberpunk Tactical](https://img.shields.io/badge/Style-Cyberpunk%20Tactical-00f2ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge)

## 💰 100% GRATUITO - MVP

Este projeto foi desenvolvido para ser testado **SEM CUSTOS** usando:
- ✅ **GitHub** - Repositório e versionamento
- ✅ **Supabase** - Banco de dados (500MB grátis)
- ✅ **Vercel** - Hospedagem (100GB bandwidth grátis)
- ✅ **PWA** - Instalável sem App Store ($0 vs $99/ano)

**Capacidade gratuita:** 500+ usuários, 100+ babas, 1000+ partidas

📖 **Leia:** [CUSTO-ZERO.md](CUSTO-ZERO.md) para detalhes completos

## 🎯 Funcionalidades Principais

### ✅ Multi-Tenancy (Criação de Babas)
- Qualquer usuário pode criar um ou mais "babas"
- Presidente do grupo com poderes administrativos
- Sistema de Coordenadores (até 3 por baba)
- Babas públicos (pesquisáveis) ou privados (apenas via convite)

### ⚽ Gestão de Partidas
- **Configuração Automática**: Futsal (5x5) ou Society (8x8)
- **Check-in de Presença**: Jogadores confirmam participação via app
- **Trava de Sorteio**: Bloqueio 10 minutos antes do jogo
- **Sorteio Inteligente**: Separação de goleiros e distribuição equilibrada
- **Fila de Espera Dinâmica**: "Quem ganha fica" com rotação automática

### 📊 Controle em Tempo Real
- **Cronômetro**: Controle preciso do tempo de jogo
- **Placar Ao Vivo**: Atualização instantânea de gols
- **Súmula Digital**: Registro de gols e assistências
- **Morte Súbita**: Jogo encerra com 2 gols de diferença

### 🏅 Sistema de Rankings
- Artilharia e assistências mensais e anuais
- Reset automático no 1º dia do mês
- Exportação para PDF
- Histórico completo de estatísticas

### 🃏 Sistema Disciplinar
- **Cartão Amarelo**: Advertência registrada
- **Cartão Azul**: Expulsão temporária (2 minutos)
- **Cartão Vermelho**: Expulsão + suspensão automática
- **Punição por W.O.**: Penalidade por não comparecimento

### 💰 Gestão Financeira
- Criação de cobranças (mensalidade, materiais, etc)
- Integração PIX com validação manual
- Controle de pagamentos por jogador
- Relatórios financeiros

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS (tema cyberpunk customizado)
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Hospedagem**: Vercel
- **Controle de Versão**: GitHub
- **PWA**: Service Worker + Manifest (instalável em mobile/desktop)

## 📱 Progressive Web App (PWA)

O DRAFT é um **PWA completo**, permitindo:

✅ **Instalação no celular** - Como um app nativo (Android/iOS)  
✅ **Funciona offline** - Cache inteligente de recursos  
✅ **Rápido e leve** - ~2MB vs 50MB+ de apps nativos  
✅ **Atualizações automáticas** - Sem precisar da loja  
✅ **Zero custos** - Sem taxas de App Store/Play Store  

📖 **Guia completo:** [PWA-GUIDE.md](PWA-GUIDE.md)

## 📦 Instalação e Configuração

### Pré-requisitos
```bash
Node.js 18+ 
npm ou yarn
Conta no Supabase (gratuita)
```

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gestao-baba.git
cd gestao-baba
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Supabase

#### 3.1. Crie um projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta (gratuita)
3. Crie um novo projeto
4. Anote as credenciais:
   - Project URL
   - Anon Public Key

#### 3.2. Execute o schema SQL
1. No painel do Supabase, vá em **SQL Editor**
2. Copie o conteúdo do arquivo `supabase-schema.sql`
3. Cole e execute no editor

### 4. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 5. Gere os ícones do PWA

**Opção 1: Ferramenta Online (Recomendado)**
1. Acesse https://www.pwabuilder.com/imageGenerator
2. Upload uma imagem 512x512px com o logo
3. Download o ZIP e extraia em `public/icons/`

**Opção 2: Script Automático (requer ImageMagick)**
```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

**Opção 3: Manual**
- Crie ícones nos tamanhos: 72, 96, 128, 144, 152, 192, 384, 512
- Salve como `icon-[tamanho]x[tamanho].png` em `public/icons/`

### 6. Execute o projeto
```bash
npm run dev
```

O aplicativo estará rodando em `http://localhost:3000`

## 🌐 Deploy no Vercel

### Via GitHub (Recomendado)

1. **Push para o GitHub**
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/gestao-baba.git
git push -u origin main
```

2. **Conecte ao Vercel**
- Acesse [vercel.com](https://vercel.com)
- Clique em "Add New Project"
- Importe seu repositório do GitHub
- Configure as variáveis de ambiente:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Clique em "Deploy"

### Via CLI do Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Siga as instruções e configure as variáveis de ambiente quando solicitado.

## 🎨 Visual e Design

O projeto utiliza um tema **Cyberpunk Tactical** com:
- Paleta de cores neon (Cyan Electric #00f2ff e Green Neon #39ff14)
- Tipografia customizada (Rajdhani + Orbitron)
- Efeitos glassmorphism
- Animações suaves
- Background com grid pattern

## 📱 Estrutura do Projeto

```
gestao-baba/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   └── Logo.jsx
│   ├── contexts/            # Contextos React (Auth, Baba)
│   │   ├── AuthContext.jsx
│   │   └── BabaContext.jsx
│   ├── pages/               # Páginas da aplicação
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── MatchPage.jsx
│   │   ├── RankingsPage.jsx
│   │   └── FinancialPage.jsx
│   ├── services/            # Serviços (Supabase)
│   │   └── supabase.js
│   ├── styles/              # Estilos globais
│   │   └── global.css
│   ├── App.jsx              # Componente principal
│   └── main.jsx             # Entry point
├── public/                  # Arquivos estáticos
├── supabase-schema.sql      # Schema do banco de dados
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔐 Segurança

- Autenticação via Supabase Auth (email/senha)
- Row Level Security (RLS) habilitado em todas as tabelas
- Validação de permissões no backend
- Proteção de rotas no frontend

## 📊 Modelo de Dados

O banco de dados possui as seguintes tabelas principais:

- **users**: Perfis de usuários
- **babas**: Grupos de pelada
- **players**: Jogadores em cada baba
- **matches**: Partidas realizadas
- **match_players**: Jogadores em cada partida
- **goals**: Gols marcados
- **cards**: Cartões aplicados
- **presences**: Confirmações de presença
- **financials**: Itens de cobrança
- **payments**: Pagamentos realizados

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Roadmap

- [ ] Notificações push para jogos
- [ ] Chat entre membros do baba
- [ ] Integração com Google Calendar
- [ ] Sistema de penalidades automáticas
- [ ] Geração de certificados de artilheiro
- [ ] App mobile (React Native)
- [ ] Sistema de ligas e torneios

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📚 Documentação Adicional

- 📱 [PWA-GUIDE.md](PWA-GUIDE.md) - Guia completo de PWA e instalação
- 💰 [CUSTO-ZERO.md](CUSTO-ZERO.md) - Estratégia de MVP gratuito
- 🚀 [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) - Deploy passo a passo
- ✅ [CHECKLIST-TESTES.md](CHECKLIST-TESTES.md) - Testes antes de lançar
- ⚡ [QUICK-START.md](QUICK-START.md) - Início rápido em 5 minutos

## 👨‍💻 Autor

Desenvolvido com ⚡ por [Zharick Dias]

---

**DRAFT - Tactical Coach** - Gestão profissional de peladas 🏆
