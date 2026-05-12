// src/components/SkeletonLoader.jsx
// Fase 2/3/4 — Skeleton loaders com aria-busy para acessibilidade.
// Novos tipos: DashboardHeaderSkeleton, ConfirmationListSkeleton, FinancialSkeleton.

import React from 'react';

// Bloco pulsante base
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-surface-2 rounded-2xl ${className}`} aria-hidden="true" />
);

// ─── Skeleton de linha de jogador (lista de atletas) ─────────────────────────
export const PlayerRowSkeleton = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3 bg-surface-1 rounded-2xl border border-border-subtle">
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
      <div key={i} className="flex items-center gap-4 p-4 bg-surface-1 rounded-2xl border border-border-subtle">
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
      <div key={i} className="p-5 bg-surface-1 rounded-3xl border border-border-subtle space-y-4">
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
  <div className="space-y-3 p-5 bg-surface-1 rounded-3xl border border-border-subtle">
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

// ─── Skeleton do header do Dashboard ─────────────────────────────────────────
export const DashboardHeaderSkeleton = () => (
  <div className="space-y-4" role="status" aria-busy="true" aria-label="Carregando dashboard...">
    <div className="flex items-center gap-3">
      <Pulse className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-3/4 rounded-xl" />
        <Pulse className="h-3 w-1/2 rounded-xl" />
      </div>
    </div>
    <Pulse className="h-28 w-full rounded-3xl" />
    <div className="flex gap-2">
      <Pulse className="flex-1 h-20 rounded-2xl" />
      <Pulse className="flex-1 h-20 rounded-2xl" />
    </div>
  </div>
);

// ─── Skeleton da lista de confirmações ───────────────────────────────────────
export const ConfirmationListSkeleton = ({ count = 6 }) => (
  <div className="space-y-2" role="status" aria-busy="true" aria-label="Carregando confirmações...">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3" style={{ opacity: 1 - i * 0.12 }}>
        <Pulse className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Pulse className="h-3 w-2/3 rounded-lg" />
          <Pulse className="h-2 w-1/3 rounded-lg" />
        </div>
        <Pulse className="w-14 h-6 rounded-xl" />
      </div>
    ))}
  </div>
);

// ─── Skeleton de cartão financeiro ───────────────────────────────────────────
export const FinancialSkeleton = () => (
  <div className="space-y-4" role="status" aria-busy="true" aria-label="Carregando dados financeiros...">
    <div className="grid grid-cols-2 gap-3">
      <Pulse className="h-24 rounded-3xl" />
      <Pulse className="h-24 rounded-3xl" />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-4 bg-surface-1 rounded-2xl" style={{ opacity: 1 - i * 0.15 }}>
        <Pulse className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-1/2 rounded-lg" />
          <Pulse className="h-2 w-1/3 rounded-lg" />
        </div>
        <Pulse className="w-16 h-6 rounded-xl" />
      </div>
    ))}
  </div>
);

// ─── Skeleton de perfil público ───────────────────────────────────────────────
export const ProfileSkeleton = () => (
  <div className="space-y-5 p-5" role="status" aria-busy="true" aria-label="Carregando perfil...">
    <div className="flex flex-col items-center gap-4">
      <Pulse className="w-20 h-20 rounded-full" />
      <div className="space-y-2 text-center w-full">
        <Pulse className="h-5 w-1/3 rounded-xl mx-auto" />
        <Pulse className="h-3 w-1/4 rounded-lg mx-auto" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <Pulse className="h-16 rounded-2xl" />
      <Pulse className="h-16 rounded-2xl" />
      <Pulse className="h-16 rounded-2xl" />
    </div>
    <Pulse className="h-32 rounded-3xl" />
  </div>
);
