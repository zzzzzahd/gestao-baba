import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Trophy, Users, DollarSign, LogOut,
  Calendar, Copy, Settings, MapPin, RefreshCw, Timer, Zap, Camera, Edit3, ChevronRight
} from 'lucide-react';
import PresenceConfirmation from '../components/PresenceConfirmation';
import BabaSettings from '../components/BabaSettings';
import DrawConfigPanel from '../components/DrawConfigPanel';
import toast from 'react-hot-toast';

// --- HELPERS ORIGINAIS ---
const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const formatConfig = (config) => {
  if (!Array.isArray(config) || config.length === 0) return null;
  const seen = new Set();
  return config
    .filter((c) => { 
      const d = Number(c.day); 
      if (seen.has(d) || isNaN(d)) return false; 
      seen.add(d); return true; 
    })
    .sort((a, b) => Number(a.day) - Number(b.day))
    .map((c) => `${DAY_SHORT[Number(c.day)]} ${c.time?.substring(0, 5) || ''}`.trim())
    .join(' · ');
};

const formatLegacyDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return null;
  return [...new Set(days.map(Number))].sort((a, b) => a - b).map((d) => DAY_SHORT[d] ?? d).join(' · ');
};

const computeExpiryLabel = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `Expira em ${hours}h ${minutes}min` : `Expira em ${minutes}min`;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { currentBaba, players, loading, generateInviteCode, nextGameDay, uploadBabaImage } = useBaba();

  const [showSettings, setShowSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // AJUSTE 4 (Debounce/Lock)
  const [inviteExpiry, setInviteExpiry] = useState(null);
  const [countdown, setCountdown] = useState({ h: '00', m: '00', s: '00', active: false });

  // --- MEMOIZAÇÃO DE DADOS ---
  const mainGameTime = useMemo(() => {
    if (Array.isArray(currentBaba?.game_days_config) && currentBaba.game_days_config.length > 0) {
      const sorted = [...currentBaba.game_days_config].sort((a, b) => Number(a.day) - Number(b.day));
      return sorted[0]?.time?.substring(0, 5) || null;
    }
    return currentBaba?.game_time?.substring(0, 5) || null;
  }, [currentBaba]);

  const gameDaysDisplay = useMemo(() => {
    return currentBaba?.game_days_config?.length > 0 
      ? formatConfig(currentBaba.game_days_config) 
      : formatLegacyDays(currentBaba?.game_days);
  }, [currentBaba]);

  // --- TIMER OTIMIZADO (AJUSTE 1 & 2) ---
  const calculateTimer = useCallback(() => {
    if (!nextGameDay?.time) {
      setCountdown(prev => prev.active ? { h: '00', m: '00', s: '00', active: false } : prev);
      return;
    }

    const targetDate = nextGameDay.fullDate ? new Date(nextGameDay.fullDate).getTime() : (() => {
      const d = new Date();
      d.setDate(d.getDate() + (nextGameDay.daysAhead || 0));
      const [h, m] = nextGameDay.time.split(':');
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      return d.getTime();
    })();

    const diff = targetDate - Date.now();
    
    if (diff > 0) {
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      
      // Comparação manual para evitar re-render se os valores forem idênticos (Otimização Real)
      setCountdown(prev => (prev.h === h && prev.m === m && prev.s === s) ? prev : { h, m, s, active: true });
    } else {
      setCountdown(prev => prev.active ? { h: '00', m: '00', s: '00', active: false } : prev);
    }
  }, [nextGameDay]);

  useEffect(() => {
    let isMounted = true;
    let timerId;
    const tick = () => {
      if (!isMounted) return;
      calculateTimer();
      timerId = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => { isMounted = false; clearTimeout(timerId); };
  }, [calculateTimer]);

  // --- SINCRONIA IMEDIATA DO CONVITE (AJUSTE 3) ---
  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    const interval = setInterval(() => {
      setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentBaba?.invite_expires_at]);

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || isUploading) return;

    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      toast.error("Arquivo inválido (Máx 5MB)");
      e.target.value = null;
      return;
    }

    setIsUploading(true);
    const res = await uploadBabaImage(file, type);
    setIsUploading(false);
    
    if (!res) toast.error("Falha no upload");
    e.target.value = null; 
  };

  if (loading || !currentBaba) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans selection:bg-cyan-electric selection:text-black">
      
      {/* --- HEADER SOCIAL --- */}
      <div className="relative h-72 w-full">
        <div className="h-56 w-full bg-gray-900 relative overflow-hidden">
          {currentBaba?.cover_url ? (
            <img 
              src={currentBaba.cover_url} 
              className={`w-full h-full object-cover transition-opacity duration-700 ${isUploading ? 'opacity-30' : 'opacity-60'}`}
              onError={(e) => { e.target.style.display = 'none'; }}
              alt="Capa do Baba"
            />
          ) : <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-6xl italic">DRAFT PLAY</div>}
          
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
              <RefreshCw className="text-cyan-electric animate-spin" size={32} />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          
          {isPresident && !isUploading && (
            <label className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white/60 hover:text-cyan-electric cursor-pointer transition-colors">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'cover')} />
            </label>
          )}
          <button onClick={() => signOut()} className="absolute top-6 right-6 p-3 bg-black/40 rounded-2xl text-white/40 hover:text-red-500 z-20 transition-colors"><LogOut size={20} /></button>
        </div>

        <div className="absolute left-6 bottom-0 flex items-end gap-5">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-black bg-gray-800 shadow-2xl overflow-hidden relative">
              {currentBaba?.avatar_url && (
                <img 
                  src={currentBaba.avatar_url} 
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isUploading ? 'opacity-50' : ''}`} 
                  onError={(e) => { e.target.style.display = 'none'; }}
                  alt="Avatar do Baba"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-cyan-electric/10 text-cyan-electric text-4xl font-black italic -z-10">
                {(currentBaba?.name || '?').charAt(0)}
              </div>
            </div>
            {isPresident && !isUploading && (
              <label className="absolute bottom-0 right-0 p-2 bg-cyan-electric rounded-xl text-black cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Edit3 size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} />
              </label>
            )}
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none select-none">{currentBaba?.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest">
               <span className="text-cyan-electric">@{profile?.name || 'atleta'}</span>
               {isPresident && <span className="bg-cyan-electric/10 text-cyan-electric px-2 py-0.5 rounded border border-cyan-electric/20">Presidente</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 mt-12 space-y-6">
        
        {/* --- CRONÔMETRO DINÂMICO --- */}
        {nextGameDay && (
          <div className="bg-gradient-to-r from-cyan-electric/20 to-transparent p-[1px] rounded-[2rem] border border-cyan-electric/30">
            <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-6">
              <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>{countdown.active ? 'Kick-off em' : 'Status'}</span>
                <span className="text-cyan-electric">{nextGameDay.daysAhead === 0 ? 'Hoje' : nextGameDay.daysAhead === 1 ? 'Amanhã' : DAY_FULL[nextGameDay.day]}</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className={`text-4xl font-black font-mono leading-none tracking-tighter ${countdown.active ? 'text-white' : 'text-cyan-electric animate-pulse'}`}>
                    {countdown.active ? `${countdown.h}:${countdown.m}:${countdown.s}` : "INICIADO"}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-white/40 uppercase truncate max-w-[180px]">
                    <MapPin size={12} className="text-cyan-electric" />
                    <span>{nextGameDay.location || currentBaba.location || "Arena Principal"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-cyan-electric italic uppercase">PARTIDA</span>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{nextGameDay.time?.substring(0, 5)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GRID DE ATALHOS --- */}
        <div className="grid grid-cols-3 gap-3">
          {[{ icon: <Trophy />, label: 'Ranking', path: '/rankings' }, { icon: <DollarSign />, label: 'Caixa', path: '/financial' }, { icon: <Users />, label: 'Atletas', path: '/teams' }].map((item, i) => (
            <button key={i} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-2 py-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group">
              <div className="text-cyan-electric opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{item.label}</span>
            </button>
          ))}
        </div>

        {/* --- INFO DO BABA --- */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-glass p-5 rounded-3xl bg-white/5 border border-white/5">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Agenda & Info</p>
            <div className="space-y-3 text-[10px] font-bold">
               <div className="flex items-center gap-2 uppercase italic text-white/90"><Zap size={14} className="text-cyan-electric" />{currentBaba.modality || 'Futebol'}</div>
               <div className="flex items-center gap-2 text-white/60"><Calendar size={14} className="text-white/30" /><span className="truncate">{gameDaysDisplay || 'Dias não definidos'}</span></div>
            </div>
          </div>
          <div className="card-glass p-5 rounded-3xl bg-white/5 border border-white/5">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Atletas Ativos</p>
            <div className="flex items-center gap-3">
               <div className="flex -space-x-3">
                  {(Array.isArray(players) ? players.slice(0, 3) : []).map((p, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black overflow-hidden shadow-lg">
                      {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : (p.name || '?').charAt(0)}
                    </div>
                  ))}
               </div>
               <span className="text-xs font-black text-white/80">{players?.length || 0} Atletas</span>
            </div>
            <button onClick={() => navigate('/teams')} className="mt-3 flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors">
              Ver todos <ChevronRight size={10} />
            </button>
          </div>
        </div>

        <PresenceConfirmation />
        {isPresident && <DrawConfigPanel />}

        {/* --- INVITE SYSTEM --- */}
        {isPresident && (
           <div className="card-glass p-6 rounded-[2.5rem] border border-cyan-electric/20 bg-cyan-electric/5 overflow-hidden relative">
              <div className="flex items-center justify-between mb-4 text-cyan-electric">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Convite Temporário</h3>
                <button onClick={generateInviteCode} className="p-2 hover:rotate-180 transition-all duration-500 text-white/30 hover:text-cyan-electric"><RefreshCw size={18}/></button>
              </div>
              {currentBaba.invite_code && inviteExpiry !== 'Expirado' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/40 py-5 rounded-2xl border border-white/10 text-center shadow-inner font-mono text-2xl font-black tracking-[0.5em]">{currentBaba.invite_code}</div>
                    <button onClick={() => {navigator.clipboard.writeText(currentBaba.invite_code); toast.success('Código copiado!');}} className="p-5 bg-cyan-electric text-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-cyan-electric/20"><Copy size={22}/></button>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase justify-center ${inviteExpiry?.includes('min') && !inviteExpiry?.includes('h') ? 'text-yellow-500 animate-pulse' : 'text-white/40'}`}>
                    <Timer size={12} /><span>{inviteExpiry}</span>
                  </div>
                </div>
              ) : (
                <button onClick={generateInviteCode} className="w-full py-4 bg-cyan-electric/10 border border-cyan-electric/30 text-cyan-electric font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-cyan-electric hover:text-black transition-all">Gerar Novo Código</button>
              )}
           </div>
        )}

        {isPresident && (
          <button onClick={() => setShowSettings(true)} className="w-full py-5 bg-white/5 border border-white/10 rounded-[2.5rem] text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 flex items-center justify-center gap-3 transition-colors active:scale-95">
            <Settings size={18} /> Administração do Grupo
          </button>
        )}
      </div>

      {showSettings && <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default DashboardPage;
