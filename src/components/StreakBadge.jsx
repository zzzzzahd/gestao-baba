import { useEffect, useRef } from "react";

const STREAK_LEVELS = [
  { min: 1,  label: "Estreante",  emoji: "🌱", color: "from-green-600 to-green-400"  },
  { min: 3,  label: "Frequente",  emoji: "🔥", color: "from-orange-600 to-orange-400" },
  { min: 5,  label: "Dedicado",   emoji: "⚡", color: "from-yellow-600 to-yellow-400" },
  { min: 10, label: "Veterano",   emoji: "🏆", color: "from-cyan-600 to-cyan-400"     },
  { min: 20, label: "Lenda",      emoji: "💎", color: "from-purple-600 to-purple-400" },
];

function getLevel(streak) {
  let level = STREAK_LEVELS[0];
  for (const l of STREAK_LEVELS) {
    if (streak >= l.min) level = l;
  }
  return level;
}

/**
 * StreakBadge — exibe a sequência de presenças consecutivas com animação CSS.
 * Props:
 *  - streak: número de partidas consecutivas confirmadas
 *  - animate: boolean, se true dispara animação de entrada
 */
export default function StreakBadge({ streak = 0, animate = false }) {
  const badgeRef = useRef(null);
  const level = getLevel(streak);

  useEffect(() => {
    if (!animate || !badgeRef.current) return;
    const el = badgeRef.current;
    el.classList.remove("streak-pop");
    // força reflow para reiniciar animação
    void el.offsetWidth;
    el.classList.add("streak-pop");
  }, [streak, animate]);

  if (streak === 0) return null;

  return (
    <>
      <style>{`
        @keyframes streakPop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .streak-pop {
          animation: streakPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div
        ref={badgeRef}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
          bg-gradient-to-r ${level.color}
          shadow-lg text-white font-black uppercase tracking-widest text-xs
        `}
      >
        <span className="text-base leading-none">{level.emoji}</span>
        <span>{streak} {streak === 1 ? "jogo" : "jogos"} seguidos</span>
        <span className="opacity-80">· {level.label}</span>
      </div>
    </>
  );
}
