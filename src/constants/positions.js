// src/constants/positions.js
// Fonte única das posições de jogador — usada em ProfileHeader, ProfileEdit,
// PublicProfilePage e ShareableCardModal. Antes esse mapa estava duplicado
// em cada um desses arquivos; agora tudo importa daqui.

export const POSITION_LABEL = {
  goleiro:  'Goleiro',
  zagueiro: 'Zagueiro',
  lateral:  'Lateral',
  meia:     'Meia',
  atacante: 'Atacante',
  linha:    'Linha',
  fixo:     'Fixo',
  ala:      'Ala',
  pivo:     'Pivô',
};

export const POSITION_OPTIONS = [
  // Society / Futebol de campo
  { value: 'goleiro',  label: 'Goleiro'  },
  { value: 'zagueiro', label: 'Zagueiro' },
  { value: 'lateral',  label: 'Lateral'  },
  { value: 'meia',     label: 'Meia'     },
  { value: 'atacante', label: 'Atacante' },
  { value: 'linha',    label: 'Linha'    },
  // Futsal
  { value: 'fixo',     label: 'Fixo'     },
  { value: 'ala',      label: 'Ala'      },
  { value: 'pivo',     label: 'Pivô'     },
];
