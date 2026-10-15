// src/content/toolsCatalog.js
// Fonte única das ferramentas públicas: usada pelo hub (/ferramentas), pelo
// rodapé de cada ferramenta, pelo pré-render (title/description) e pelo sitemap.
// Só entram aqui ferramentas que EXISTEM e funcionam.

export const TOOLS = [
  {
    slug: 'sorteador',
    path: '/ferramentas/sorteador',
    name: 'Sorteador de times equilibrados',
    short: 'Cole a lista, defina nível e posição e sorteie times parelhos.',
    title: 'Sorteador de Times Equilibrados para Baba | Draft Play',
    description:
      'Sorteie times de futebol equilibrados por nível e posição, com goleiros distribuídos e reservas. Grátis, sem cadastro, direto no navegador.',
  },
  {
    slug: 'calculadora-torneio',
    path: '/ferramentas/calculadora-torneio',
    name: 'Calculadora de torneio',
    short: 'Quantos jogos e quanto tempo dura um mata-mata, pontos corridos ou grupos.',
    title: 'Calculadora de Torneio: Quantidade de Jogos e Duração | Draft Play',
    description:
      'Calcule quantos jogos e quanto tempo leva um torneio de mata-mata, pontos corridos ou fase de grupos, com número de campos, duração das partidas e intervalos.',
  },
  {
    slug: 'tabela-de-jogos',
    path: '/ferramentas/tabela-de-jogos',
    name: 'Gerador de tabela de jogos',
    short: 'Confrontos de mata-mata, pontos corridos ou grupos, com folgas tratadas.',
    title: 'Gerador de Tabela de Jogos para Torneio | Draft Play',
    description:
      'Gere a tabela de jogos do seu torneio de futebol amador: mata-mata com cabeças de chave, pontos corridos em 1 ou 2 turnos e fase de grupos. Copie e compartilhe.',
  },
  {
    slug: 'divisao-de-despesas',
    path: '/ferramentas/divisao-de-despesas',
    name: 'Calculadora de divisão de despesas',
    short: 'Quadra, árbitro, água e extras divididos entre os pagantes.',
    title: 'Calculadora de Divisão de Despesas do Baba | Draft Play',
    description:
      'Divida o custo da quadra, arbitragem, água e outros gastos entre os participantes do baba, com arredondamento e cenários de faltas e convidados.',
  },
  {
    slug: 'lista-de-presenca',
    path: '/ferramentas/lista-de-presenca',
    name: 'Organizador de lista de presença',
    short: 'Cole a lista, marque presenças e veja confirmados, reservas e times possíveis.',
    title: 'Organizador de Lista de Presença do Baba | Draft Play',
    description:
      'Cole a lista de jogadores, marque quem confirmou e veja o total de confirmados, ausentes, reservas e quantos times fecham. Tudo no navegador, sem enviar dados.',
  },
];

export const TOOLS_HUB = {
  path: '/ferramentas',
  title: 'Ferramentas Gratuitas para Organizar o Baba | Draft Play',
  description:
    'Sorteador de times, calculadora de torneio, tabela de jogos, divisão de despesas e lista de presença. Ferramentas gratuitas para quem organiza futebol amador, sem cadastro.',
};
