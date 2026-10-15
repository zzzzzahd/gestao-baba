// src/pages/modelos/modeloPages.js
// Mapa único caminho → componente da biblioteca de modelos, usado pelo
// pré-render (entry-server.jsx). Novo modelo: página em src/pages/modelos,
// entrada em src/content/modelosCatalog.js, entrada aqui e rota lazy em src/App.jsx.
import { modeloPath } from '../../content/modelosCatalog';
import RegulamentoModelo from './RegulamentoModelo';
import CriteriosDesempate from './CriteriosDesempate';
import TabelaMataMata from './TabelaMataMata';
import GruposClassificacao from './GruposClassificacao';
import PontosCorridos from './PontosCorridos';
import CalendarioPartidas from './CalendarioPartidas';
import ControleResultados from './ControleResultados';
import PresencaEquipe from './PresencaEquipe';
import ControleArtilharia from './ControleArtilharia';
import OrcamentoTorneio from './OrcamentoTorneio';

export const MODELO_PAGES = {
  [modeloPath('regulamento-torneio-interno')]: RegulamentoModelo,
  [modeloPath('criterios-de-desempate')]: CriteriosDesempate,
  [modeloPath('tabela-mata-mata')]: TabelaMataMata,
  [modeloPath('grupos-e-classificacao')]: GruposClassificacao,
  [modeloPath('pontos-corridos')]: PontosCorridos,
  [modeloPath('calendario-de-partidas')]: CalendarioPartidas,
  [modeloPath('controle-de-resultados')]: ControleResultados,
  [modeloPath('lista-presenca-por-equipe')]: PresencaEquipe,
  [modeloPath('artilharia')]: ControleArtilharia,
  [modeloPath('orcamento-do-torneio')]: OrcamentoTorneio,
};
