import React, { useState } from 'react';
import MatchIntro from '../components/MatchIntro';

const MatchScreen = () => {
  // Estado para controlar se a intro deve ser exibida
  const [showIntro, setShowIntro] = useState(true);

  return (
    <div className="relative">
      {/* 1. Se showIntro for true, exibe a Intro */}
      {showIntro && (
        <MatchIntro 
          teamA={teamA} 
          teamB={teamB} 
          onDone={() => setShowIntro(false)} // 2. Quando terminar, define como false
        />
      )}

      {/* 3. O restante da sua tela de partida (placar, cronômetro, etc) */}
      <div className="p-4">
        <h1>Placar da Partida</h1>
        {/* ... */}
      </div>
    </div>
  );
};

export default MatchScreen;