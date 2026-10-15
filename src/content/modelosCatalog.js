// src/content/modelosCatalog.js
// Fonte única da biblioteca de modelos de torneio (/modelos-de-torneio): hub,
// páginas, pré-render (title/description) e sitemap. Só entram modelos que existem.

export const MODELOS_HUB = {
  path: '/modelos-de-torneio',
  title: 'Modelos para Torneio de Futebol Amador: Tabelas, Regulamento e Planilhas | Draft Play',
  description:
    'Biblioteca gratuita de modelos para organizar torneio de futebol amador: regulamento, tabela de mata-mata, grupos, classificação, calendário, artilharia, presença e orçamento. Copie, imprima ou baixe.',
};

export const MODELO_CATEGORIAS = ['Regras', 'Tabelas e jogos', 'Controle', 'Finanças'];

export const MODELOS = [
  {
    slug: 'regulamento-torneio-interno',
    categoria: 'Regras',
    name: 'Regulamento de torneio interno',
    short: 'Texto-base completo, com formato, pontuação, atraso, W.O. e conduta.',
    title: 'Modelo de Regulamento de Torneio Interno de Futebol Amador | Draft Play',
    description: 'Modelo pronto de regulamento para torneio interno de baba: formato, pontuação, desempate, atraso e W.O., cartões e disposições finais. Copie, imprima ou baixe.',
  },
  {
    slug: 'criterios-de-desempate',
    categoria: 'Regras',
    name: 'Critérios de desempate',
    short: 'Ordens de desempate comparadas, com o efeito de cada critério explicado.',
    title: 'Critérios de Desempate em Torneio de Futebol Amador | Draft Play',
    description: 'Veja os critérios de desempate mais usados no futebol amador (vitórias, saldo, gols, confronto direto, disciplina), como cada um funciona e copie o texto para o seu regulamento.',
  },
  {
    slug: 'tabela-mata-mata',
    categoria: 'Tabelas e jogos',
    name: 'Tabela de mata-mata',
    short: 'Chave com cabeças de chave, byes e campo de placar para qualquer número de equipes.',
    title: 'Modelo de Tabela de Mata-Mata para Torneio de Futebol | Draft Play',
    description: 'Monte a tabela de mata-mata do seu torneio com as suas equipes: cabeças de chave, byes, disputa de 3º lugar e espaço para o placar. Copie, imprima ou baixe.',
  },
  {
    slug: 'grupos-e-classificacao',
    categoria: 'Tabelas e jogos',
    name: 'Grupos e tabelas de classificação',
    short: 'Equipes divididas em grupos, cada um com a sua tabela de classificação.',
    title: 'Modelo de Fase de Grupos e Tabela de Classificação | Draft Play',
    description: 'Divida as equipes em grupos e imprima a tabela de classificação de cada um (pontos, jogos, vitórias, empates, derrotas, gols e saldo). Copie, imprima ou baixe.',
  },
  {
    slug: 'pontos-corridos',
    categoria: 'Tabelas e jogos',
    name: 'Pontos corridos com classificação automática',
    short: 'Tabela de jogos; digite os placares e a classificação se atualiza sozinha.',
    title: 'Planilha de Pontos Corridos com Classificação Automática | Draft Play',
    description: 'Tabela de jogos em pontos corridos com classificação automática: digite os placares e veja pontos, saldo e posição de cada equipe. Copie, imprima ou baixe em CSV.',
  },
  {
    slug: 'calendario-de-partidas',
    categoria: 'Tabelas e jogos',
    name: 'Calendário de partidas',
    short: 'Jogos distribuídos por horário e campo, com o término previsto.',
    title: 'Modelo de Calendário de Partidas de Torneio com Horários | Draft Play',
    description: 'Gere o calendário do seu torneio com horário e campo de cada jogo, duração das partidas e intervalos, e o horário previsto de término. Copie, imprima ou baixe.',
  },
  {
    slug: 'controle-de-resultados',
    categoria: 'Controle',
    name: 'Controle de resultados',
    short: 'Súmula por rodada com data, hora, campo e placar para preencher.',
    title: 'Modelo de Controle de Resultados de Torneio | Draft Play',
    description: 'Súmula imprimível para registrar os resultados do torneio por rodada, com data, hora, campo e placar de cada jogo. Copie, imprima ou baixe.',
  },
  {
    slug: 'lista-presenca-por-equipe',
    categoria: 'Controle',
    name: 'Lista de presença por equipe',
    short: 'Uma folha por equipe, com marcação jogo a jogo.',
    title: 'Modelo de Lista de Presença por Equipe | Draft Play',
    description: 'Folha de presença por equipe para torneio de futebol amador, com espaço para marcar cada jogador em cada partida. Copie, imprima ou baixe.',
  },
  {
    slug: 'artilharia',
    categoria: 'Controle',
    name: 'Controle de artilharia',
    short: 'Registre gols por jogador e veja o ranking de artilheiros com empates.',
    title: 'Controle de Artilharia de Torneio: Ranking de Artilheiros | Draft Play',
    description: 'Registre os gols de cada jogador e veja o ranking de artilheiros do torneio, com posições empatadas tratadas corretamente. Copie, imprima ou baixe em CSV.',
  },
  {
    slug: 'orcamento-do-torneio',
    categoria: 'Finanças',
    name: 'Orçamento do torneio',
    short: 'Receitas, despesas e a inscrição por equipe necessária para fechar a conta.',
    title: 'Modelo de Orçamento de Torneio de Futebol Amador | Draft Play',
    description: 'Planeje receitas e despesas do torneio e descubra quanto cobrar de inscrição por equipe para fechar a conta. Copie, imprima ou baixe.',
  },
];

export const modeloPath = (slug) => `${MODELOS_HUB.path}/${slug}`;
