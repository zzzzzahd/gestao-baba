// src/hooks/useCountdown.js
// Hook isolado para o countdown até o próximo jogo.
// Extraído do BabaContext — lida apenas com o timer (ARCH-001).

import { useState, useEffect } from 'react';

export const useCountdown = (targetDate) => {
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0, active: false });

  useEffect(() => {
    let timeoutId;

    const update = () => {
      if (!targetDate) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0, active: false });
        return;
      }

      const diff = new Date(targetDate) - Date.now();

      if (diff <= 0) {
        setCountdown(prev => prev.active ? { d: 0, h: 0, m: 0, s: 0, active: false } : prev);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      setCountdown({
        d:      Math.floor(totalSeconds / 86400),
        h:      Math.floor((totalSeconds % 86400) / 3600),
        m:      Math.floor((totalSeconds % 3600) / 60),
        s:      totalSeconds % 60,
        active: true,
      });

      // Sincroniza com o segundo exato do relógio do sistema (sem drift)
      timeoutId = setTimeout(update, 1000 - (Date.now() % 1000));
    };

    update();
    return () => clearTimeout(timeoutId);
  }, [targetDate?.toISOString?.() ?? targetDate]);

  return countdown;
};
