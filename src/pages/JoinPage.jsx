import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [baba, setBaba] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [memberCount, setMemberCount] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    supabase
      .from("babas")
      .select("id, name, description, logo_url, cover_url, modality, location, max_players, game_days, game_time, invite_expires_at")
      .eq("invite_code", code)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("Convite inválido ou expirado.");
        } else if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
          setError("Este convite expirou.");
        } else {
          setBaba(data);
        }
        setLoading(false);
      });
  }, [code]);

  useEffect(() => {
    if (!baba) return;
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("baba_id", baba.id)
      .then(({ count }) => setMemberCount(count));
  }, [baba]);

  const handleJoin = async () => {
    if (!session) {
      sessionStorage.setItem("pendingJoinCode", code);
      navigate("/login");
      return;
    }
    setJoining(true);
    const { error: err } = await supabase.rpc("join_baba_by_code", { p_code: code });
    if (err) {
      setError(err.message);
    } else {
      navigate("/dashboard");
    }
    setJoining(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = `Entra no nosso baba "${baba?.name}"! 🏟️`;
    if (navigator.share) {
      navigator.share({ title: text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  const modalityLabel = { futsal: "Futsal", society: "Society" };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest mb-2">Convite inválido</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-cyan-electric/10 border border-cyan-electric/30 rounded-2xl text-cyan-electric font-black uppercase tracking-widest text-sm hover:bg-cyan-electric/20 transition-all"
          >
            Ir para início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Cover */}
      <div
        className="h-48 bg-gray-900 relative overflow-hidden"
        style={baba.cover_url ? { backgroundImage: `url(${baba.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="flex flex-col items-center px-5 -mt-16 pb-10 flex-1">
        {/* Logo */}
        <div className="w-28 h-28 rounded-[2rem] border-4 border-black bg-gray-800 shadow-2xl overflow-hidden flex items-center justify-center mb-4">
          {baba.logo_url ? (
            <img src={baba.logo_url} alt={baba.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black italic text-cyan-electric">
              {baba.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-center mb-1">
          {baba.name}
        </h1>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-electric mb-3">
          <span>⚽ {modalityLabel[baba.modality] || baba.modality}</span>
          {baba.location && (
            <><span className="text-gray-600">•</span><span>📍 {baba.location}</span></>
          )}
        </div>

        {baba.description && (
          <p className="text-gray-400 text-sm text-center max-w-sm mb-5">{baba.description}</p>
        )}

        {/* Stats */}
        <div className="flex gap-3 mb-8">
          {memberCount !== null && (
            <div className="bg-surface-2 border border-border-subtle rounded-2xl px-5 py-3 text-center">
              <p className="text-xl font-black text-white">{memberCount}</p>
              <p className="text-[9px] font-black text-text-low uppercase tracking-widest">Membros</p>
            </div>
          )}
          {baba.max_players && (
            <div className="bg-surface-2 border border-border-subtle rounded-2xl px-5 py-3 text-center">
              <p className="text-xl font-black text-white">{baba.max_players}</p>
              <p className="text-[9px] font-black text-text-low uppercase tracking-widest">Vagas</p>
            </div>
          )}
        </div>

        {/* CTA Entrar */}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full max-w-sm px-6 py-4 bg-cyan-electric hover:opacity-90 disabled:opacity-50 rounded-2xl text-black font-black uppercase tracking-widest text-sm transition-all active:scale-95 mb-3 shadow-lg shadow-cyan-electric/20"
        >
          {joining ? "Entrando..." : session ? "Entrar no Baba" : "Entrar / Criar conta"}
        </button>

        {/* Compartilhar WhatsApp */}
        <button
          onClick={handleShare}
          className="w-full max-w-sm px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 font-black uppercase tracking-widest text-[10px] hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Compartilhar no WhatsApp
        </button>
      </div>
    </div>
  );
}
