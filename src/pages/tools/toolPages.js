// src/pages/tools/toolPages.js
// Mapa único caminho → componente das ferramentas públicas, usado pelo
// pré-render (entry-server.jsx), que precisa de imports não-lazy. Para criar
// uma ferramenta nova: página em src/pages/tools, entrada em
// src/content/toolsCatalog.js, entrada aqui e rota lazy em src/App.jsx.
import SorteadorTimes from './SorteadorTimes';
import TorneioCalculadora from './TorneioCalculadora';
import TabelaJogos from './TabelaJogos';
import DivisaoDespesas from './DivisaoDespesas';
import OrganizadorPresenca from './OrganizadorPresenca';
import GeradorRegulamento from './GeradorRegulamento';
import ControleFinanceiro from './ControleFinanceiro';

export const TOOL_PAGES = {
  '/ferramentas/sorteador': SorteadorTimes,
  '/ferramentas/calculadora-torneio': TorneioCalculadora,
  '/ferramentas/tabela-de-jogos': TabelaJogos,
  '/ferramentas/divisao-de-despesas': DivisaoDespesas,
  '/ferramentas/lista-de-presenca': OrganizadorPresenca,
  '/ferramentas/gerador-de-regulamento': GeradorRegulamento,
  '/ferramentas/controle-financeiro': ControleFinanceiro,
};
