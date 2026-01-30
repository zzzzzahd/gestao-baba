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
  const [confirmedPlayers, setConfirmedPlayers] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para modo VISITANTE
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [teams, setTeams] = useState(null);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/visitor');
      return;
    }
    if (user) {
      loadNextMatch();
    } else {
      setLoading(false);
    }
  }, [currentBaba, user]);

  const loadNextMatch = async () => {
    try {
      setLoading(true);
      const { data: match } = await supabase
        .from(TABLES.MATCHES)
        .select('*')
        .eq('baba_id', currentBaba.id)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true })
        .limit(1)
        .single();

      if (match) {
        setNextMatch(match);
        const { data: presences } = await supabase
          .from(TABLES.PRESENCES)
          .select('*, player:players(name, position)')
          .eq('match_id', match.id)
          .eq('confirmed', true);
        setConfirmedPlayers(presences || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // LÓGICA DE SORTEIO REAL (VISITANTE)
  const handleSortear = () => {
    if (guestList.length < 4) {
      toast.error("Adicione pelo menos 4 jogadores!");
      return;
    }

    // Embaralha a lista
    const shuffled = [...guestList].sort(() => Math.random() - 0.5);
    
    // Divide em dois times (Metade para cada)
    const half = Math.ceil(shuffled.length / 2);
    const teamA = shuffled.slice(0, half).map(p => p.player.name);
    const teamB = shuffled.slice(half).map(p => p.player.name);

    const result = {
      a: { name: 'TIME A', players: teamA },
      b: { name: 'TIME B', players: teamB }
    };

    setTeams(result);
    setShowResult(true);
    // Salva para a MatchPage ler
    localStorage.setItem('temp_teams', JSON.stringify(result));
  };

  const addGuestPlayer = (e) => {
    e.preventDefault();
    if (!guestPlayerName.trim()) return;
    const newPlayer = {
      id: Date.now(),
      player: { name: guestPlayerName.toUpperCase(), position: 'linha' }
    };
    setGuestList([...guestList, newPlayer]);
    setGuestPlayerName('');
    setShowResult(false); // Esconde o sorteio antigo se adicionar gente nova
  };

  const removeGuestPlayer = (id) => {
    setGuestList(guestList.filter(p => p.id !== id));
    setShowResult(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
    </div>
  );

  return (
    <div className="min-h-screen p-5 bg-black text-white">
      <div className="
