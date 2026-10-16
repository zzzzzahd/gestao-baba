// src/content/estatisticasDemo.js
//
// DADOS FICTÍCIOS para as demonstrações públicas de /estatisticas.
// Nada aqui vem do banco: os nomes são inventados (alfabeto fonético), não
// correspondem a pessoas reais e as partidas não existiram. Os totais de cada
// jogador NÃO são digitados: são calculados a partir das partidas (ver
// src/utils/estatisticasDemo.js), para que tudo seja coerente.

export const ESTATISTICAS_PAGE = {
  path: '/estatisticas',
  title: 'Estatísticas do Futebol Amador: Como Ler Gols, Assistências e Rankings | Draft Play',
  description:
    'Entenda as estatísticas do baba: gols, assistências, aproveitamento, sequência de presenças, avaliação e divisões. Demonstração com dados fictícios: perfil, ranking, comparação e montagem de times.',
};

export const DEMO_PLAYERS = [
  { id: 'alfa',    name: 'Atleta Alfa',    ratings: { skill: 4.6, physical: 4.3, commitment: 4.8 } },
  { id: 'bravo',   name: 'Atleta Bravo',   ratings: { skill: 4.1, physical: 3.9, commitment: 4.4 } },
  { id: 'charlie', name: 'Atleta Charlie', ratings: { skill: 3.8, physical: 3.5, commitment: 4.0 } },
  { id: 'delta',   name: 'Atleta Delta',   ratings: { skill: 3.2, physical: 3.6, commitment: 3.9 } },
  { id: 'echo',    name: 'Atleta Echo',    ratings: { skill: 3.5, physical: 3.0, commitment: 3.4 } },
  { id: 'foxtrot', name: 'Atleta Foxtrot', ratings: { skill: 2.9, physical: 3.3, commitment: 3.1 } },
  { id: 'golf',    name: 'Atleta Golf',    ratings: { skill: 3.0, physical: 2.8, commitment: 3.6 } },
  { id: 'hotel',   name: 'Atleta Hotel',   ratings: { skill: 2.4, physical: 2.7, commitment: 3.0 } },
  { id: 'india',   name: 'Atleta India',   ratings: { skill: 2.2, physical: 2.5, commitment: 2.9 } },
  { id: 'juliet',  name: 'Atleta Juliet',  ratings: { skill: 1.8, physical: 2.4, commitment: 2.6 } },
];

// Cada partida: duas equipes de 4 (a, b) e os gols no formato "equipe:autor>assistente".
// O placar é a contagem dos gols de cada equipe: não é digitado.
export const DEMO_MATCHES = [
  { a: ['alfa', 'bravo', 'charlie', 'delta'],  b: ['echo', 'foxtrot', 'golf', 'hotel'],    goals: ['a:alfa>bravo', 'a:alfa>charlie', 'a:charlie>alfa', 'b:echo>foxtrot', 'b:golf>hotel'] },
  { a: ['alfa', 'echo', 'india', 'juliet'],    b: ['bravo', 'charlie', 'delta', 'hotel'],  goals: ['a:alfa>echo', 'a:india>juliet', 'b:bravo>charlie', 'b:bravo>delta', 'b:hotel'] },
  { a: ['alfa', 'bravo', 'golf', 'juliet'],    b: ['charlie', 'delta', 'echo', 'foxtrot'], goals: ['a:alfa>bravo', 'a:bravo>golf', 'a:alfa>juliet', 'b:delta>echo'] },
  { a: ['alfa', 'charlie', 'hotel', 'india'],  b: ['bravo', 'delta', 'golf', 'juliet'],    goals: ['a:alfa>charlie', 'a:charlie', 'b:bravo>delta', 'b:delta>bravo'] },
  { a: ['alfa', 'delta', 'echo', 'foxtrot'],   b: ['bravo', 'charlie', 'hotel', 'juliet'], goals: ['a:alfa>delta', 'a:echo>alfa', 'a:alfa', 'b:charlie>bravo', 'b:hotel>juliet'] },
  { a: ['bravo', 'charlie', 'golf', 'india'],  b: ['alfa', 'delta', 'echo', 'juliet'],     goals: ['a:bravo>charlie', 'a:golf>india', 'b:alfa>echo', 'b:alfa>juliet'] },
  { a: ['alfa', 'bravo', 'foxtrot', 'hotel'],  b: ['charlie', 'golf', 'india', 'juliet'],  goals: ['a:alfa>foxtrot', 'a:alfa>bravo', 'a:bravo>alfa', 'a:foxtrot', 'b:charlie>juliet'] },
  { a: ['charlie', 'delta', 'echo', 'juliet'], b: ['alfa', 'bravo', 'golf', 'india'],      goals: ['a:charlie>delta', 'a:delta>echo', 'b:alfa>bravo', 'b:golf>india', 'b:alfa>golf'] },
  { a: ['alfa', 'bravo', 'delta', 'hotel'],    b: ['charlie', 'echo', 'foxtrot', 'india'], goals: ['a:alfa>delta', 'a:bravo>hotel', 'b:echo>foxtrot', 'b:foxtrot>echo', 'b:india'] },
  { a: ['alfa', 'charlie', 'echo', 'golf'],    b: ['bravo', 'delta', 'foxtrot', 'juliet'], goals: ['a:alfa>charlie', 'a:charlie>alfa', 'a:echo>golf', 'b:bravo>delta', 'b:delta'] },
];
