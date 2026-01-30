import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TABLES } from '../services/supabase';
import { format, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  const [nextMatch, setNextMatch] = useState(null);
  const [myPresence, setMyPresence] = useState(null);
  const [confirmedPlayers, setConfirmedPlayers] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/dashboard');
      return;
    }
    loadNextMatch();
  }, [currentBaba]);

  useEffect(() => {
    if (!nextMatch) return;

    const interval = setInterval(() => {
      const now = new Date();
      const matchTime = new Date(nextMatch.match_date);
      const diff = differenceInSeconds(matchTime, now);

      if (diff <= 0) {
        setCountdown('JOGO EM ANDAMENTO!');
      } else {
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (days > 0) {
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setCountdown(`${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextMatch]);

  const loadNextMatch = async () => {
    try {
      setLoading(true);

      // Busca próxima partida
      const { data: match, error: matchError } = await supabase
        .from(TABLES.MATCHES)
        .select('*')
        .eq('baba_id', currentBaba.id)
        .eq('status', 'scheduled')
        .gte('match_date', new Date().toISOString())
        .order('match_date', { ascending: true })
        .limit(1)
        .single();

      if (matchError && matchError.code !== 'PGRST116') throw matchError;

      if (match) {
        setNextMatch(match);

        // Busca minha presença
        const { data: player } = await supabase
          .from(TABLES.PLAYERS)
          .select('id')
          .eq('baba_id', currentBaba.id)
          .eq('user_id', user.id)
          .single();

        if (player) {
          const { data: presence } = await supabase
            .from(TABLES.PRESENCES)
            .select('*')
            .eq('match_id', match.id)
            .eq('player_id', player.id)
            .single();

          setMyPresence(presence);

          // Busca jogadores confirmados
          const { data: presences } = await supabase
            .from(TABLES.PRESENCES)
            .select(`
              *,
              player:players(
                name,
                position
              )
            `)
            .eq('match_id', match.id)
            .eq('confirmed', true);

          setConfirmedPlayers(presences || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar partida:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePresence = async () => {
    try {
      // Busca ID do jogador
      const { data: player } = await supabase
        .from(TABLES.PLAYERS)
        .select('id, is_suspended')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .single();

      if (!player) {
        toast.error('Você precisa se cadastrar no baba primeiro!');
        return;
      }

      if (player.is_suspended) {
        toast.error('Você está suspenso e não pode confirmar presença!');
        return;
      }

      // Verifica se já passou do prazo (10 minutos antes)
      const matchTime = new Date(nextMatch.match_date);
      const now = new Date();
      const diff = differenceInSeconds(matchTime, now);

      if (diff < 600) {
        toast.error('Prazo de confirmação encerrado!');
        return;
      }

      if (myPresence) {
        // Remove confirmação
        const { error } = await supabase
          .from(TABLES.PRESENCES)
          .delete()
          .eq('id', myPresence.id);

        if (error) throw error;
        toast.success('Presença removida!');
      } else {
        // Adiciona confirmação
        const { error } = await supabase
          .from(TABLES.PRESENCES)
          .insert([{
            match_id: nextMatch.id,
            player_id: player.id,
            confirmed: true,
            confirmed_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast.success('Presença confirmada!');
      }

      loadNextMatch();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao confirmar presença');
    }
  };

  if (!currentBaba) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-cyan-electric hover:text-white transition-colors"
          >
            <i className="fas fa-arrow-left text-xl mr-3"></i>
            {currentBaba.name}
          </button>
          
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/rankings')}
              className="text-cyan-electric hover:text-white transition-colors"
            >
              <i className="fas fa-trophy text-xl"></i>
            </button>
            <button
              onClick={() => navigate('/financial')}
              className="text-green-neon hover:text-white transition-colors"
            >
              <i className="fas fa-dollar-sign text-xl"></i>
            </button>
          </div>
        </div>

        {/* Winner Photo */}
        {currentBaba.winner_photo_url && (
          <div className="card-glass p-4 mb-6 animate-slide-in">
            <p className="text-xs text-cyan-electric mb-2 uppercase font-bold">
              TIME VENCEDOR DA ÚLTIMA PARTIDA
            </p>
            <img
              src={currentBaba.winner_photo_url}
              alt="Time vencedor"
              className="w-full rounded-lg"
            />
          </div>
        )}

        {/* Next Match Card */}
        {nextMatch ? (
          <>
            <div className="card-glass p-8 mb-6 text-center animate-slide-in">
              <p className="text-sm text-cyan-electric mb-2 uppercase">
                PRÓXIMO JOGO
              </p>
              <h1 className="text-4xl font-bold mb-4">
                {format(new Date(nextMatch.match_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h1>
              <p className="text-2xl mb-4">
                {format(new Date(nextMatch.match_date), 'HH:mm')}
              </p>
              
              <div 
                className="text-6xl font-display font-black mb-6"
                style={{
                  background: 'linear-gradient(180deg, var(--cyan-electric), var(--green-neon))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {countdown}
              </div>

              <button
                onClick={togglePresence}
                className={myPresence ? 'btn-danger' : 'btn-primary'}
              >
                {myPresence ? (
                  <>
                    <i className="fas fa-times mr-2"></i>
                    CANCELAR PRESENÇA
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    CONFIRMAR PRESENÇA
                  </>
                )}
              </button>
            </div>

            {/* Confirmed Players */}
            <div className="card-glass p-6 animate-slide-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-cyan-electric">
                  CONFIRMADOS
                </h3>
                <span className="text-2xl font-bold">
                  {confirmedPlayers.length}
                </span>
              </div>

              {confirmedPlayers.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {confirmedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-white/5 p-3 rounded-lg"
                    >
                      <i 
                        className={`fas ${p.player.position === 'goleiro' ? 'fa-mitten' : 'fa-shoe-prints'}`}
                        style={{
                          color: p.player.position === 'goleiro' ? 'var(--green-neon)' : 'var(--cyan-electric)'
                        }}
                      ></i>
                      <span className="text-sm">{p.player.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center opacity-40 py-8">
                  Nenhum jogador confirmou presença ainda
                </p>
              )}
            </div>

            {/* Go to Match Button */}
            {confirmedPlayers.length >= (currentBaba.modality === 'futsal' ? 10 : 16) && (
              <button
                onClick={() => navigate('/match')}
                className="btn-secondary mt-6"
              >
                <i className="fas fa-futbol mr-2"></i>
                IR PARA A QUADRA
              </button>
            )}
          </>
        ) : (
          <div className="card-glass p-12 text-center">
            <i className="fas fa-calendar-times text-6xl text-cyan-electric/30 mb-4"></i>
            <p className="text-lg opacity-60">
              Nenhuma partida agendada
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
