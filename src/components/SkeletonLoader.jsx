// src/components/SkeletonLoader.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders reutilizáveis. Fase 3, Tarefa 3.1.
// Substitui spinners nas listas de jogadores, rankings e histórico.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

// Bloco pulsante base
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-2xl ${className}`} />
);

// ─── Skeleton de linha de jogador (lista de atletas) ─────────────────────────
export const PlayerRowSkeleton = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-2xl border border-white/5">
        <Pulse className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-32 rounded-lg" />
          <Pulse className="h-2 w-16 rounded-lg" />
        </div>
        <Pulse className="w-8 h-8 rounded-xl shrink-0" />
      </div>
    ))}
  </div>
);

// ─── Skeleton do pódio (rankings) ────────────────────────────────────────────
export const PodiumSkeleton = () => (
  <div className="flex items-end justify-center gap-4 pt-4 pb-2 px-2">
    {/* 2º lugar */}
    <div className="flex flex-col items-center gap-2 flex-1">
      <Pulse className="w-14 h-14 rounded-full" />
      <Pulse className="h-2 w-12 rounded-lg" />
      <Pulse className="h-6 w-8 rounded-lg" />
      <Pulse className="w-full h-16 rounded-t-xl" />
    </div>
    {/* 1º lugar */}
    <div className="flex flex-col items-center gap-2 flex-1">
      <Pulse className="w-16 h-16 rounded-full" />
      <Pulse className="h-2 w-16 rounded-lg" />
      <Pulse className="h-8 w-10 rounded-lg" />
      <Pulse className="w-full h-24 rounded-t-xl" />
    </div>
    {/* 3º lugar */}
    <div className="flex flex-col items-center gap-2 flex-1">
      <Pulse className="w-12 h-12 rounded-full" />
      <Pulse className="h-2 w-10 rounded-lg" />
      <Pulse className="h-5 w-6 rounded-lg" />
      <Pulse className="w-full h-10 rounded-t-xl" />
    </div>
  </div>
);

// ─── Skeleton de linha de ranking (4º em diante) ─────────────────────────────
export const RankingRowSkeleton = ({ count = 4 }) => (
  <div className="space-y-2 pt-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
        <Pulse className="w-8 h-6 rounded-lg shrink-0" />
        <Pulse className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-28 rounded-lg" />
          <Pulse className="h-2 w-14 rounded-lg" />
        </div>
        <div className="text-right space-y-1">
          <Pulse className="h-7 w-10 rounded-lg ml-auto" />
          <Pulse className="h-2 w-8 rounded-lg ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Skeleton de card de partida (histórico) ─────────────────────────────────
export const MatchCardSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
        {/* Header do card */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Pulse className="h-3 w-28 rounded-lg" />
            <Pulse className="h-2 w-16 rounded-lg" />
          </div>
          <Pulse className="h-6 w-20 rounded-xl" />
        </div>
        {/* Placar */}
        <div className="flex items-center justify-between px-2">
          <Pulse className="h-8 w-12 rounded-xl" />
          <Pulse className="h-3 w-6 rounded-lg" />
          <Pulse className="h-8 w-12 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Skeleton do dashboard (bloco de presença) ────────────────────────────────
export const PresenceSkeleton = () => (
  <div className="space-y-3 p-5 bg-white/[0.02] rounded-3xl border border-white/5">
    <div className="flex justify-between">
      <Pulse className="h-3 w-24 rounded-lg" />
      <Pulse className="h-3 w-12 rounded-lg" />
    </div>
    <Pulse className="h-16 w-full rounded-2xl" />
    <div className="grid grid-cols-2 gap-3">
      <Pulse className="h-12 rounded-2xl" />
      <Pulse className="h-12 rounded-2xl" />
    </div>
  </div>
);

// ─── Skeleton genérico de página inteira ─────────────────────────────────────
export const PageSkeleton = ({ rows = 4 }) => (
  <div className="min-h-screen bg-black p-6 space-y-5">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Pulse className="w-10 h-10 rounded-full" />
      <Pulse className="h-5 w-32 rounded-xl" />
      <div className="w-10" />
    </div>
    {/* Conteúdo */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Pulse key={i} className={`h-16 w-full rounded-3xl`} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  </div>
);
