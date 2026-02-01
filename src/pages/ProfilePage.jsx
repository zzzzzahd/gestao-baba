import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, PlusCircle, UserPlus, Save, Loader2, Trash2, Edit3, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile, signOut, updateProfile, uploadAvatar } = useAuth(); 
  const { getMyBabas, deleteBaba } = useBaba(); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myBabas, setMyBabas] = useState([]);

  // Perfil local para o formulário
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    position: 'Linha',
    heart_team: '',
    avatar_url: null
  });

  // 1. Carregar dados sincronizados
  useEffect(() => {
    const getData = async () => {
      try {
        if (!user) return;

        // Busca Babas Criados
        const babasData = await getMyBabas(user.id);
        if (babasData) setMyBabas(babasData);

        // Sincroniza com os detalhes do perfil vindos do AuthContext
        if (authProfile) {
          setProfile({
            name: authProfile.name || user?.user_metadata?.name || '',
            age: authProfile.age || '',
            position: authProfile.position || 'Linha',
            heart_team: authProfile.heart_team || '',
            avatar_url: authProfile.avatar_url || null
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [user, authProfile, getMyBabas]);

  // 2. Salvar Dados do Perfil
  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: profile.name,
        age: profile.age,
        position: profile.position,
        heart_team: profile.heart_team
      });
      toast.success("Perfil atualizado!");
    } catch (error) {
      toast.error("Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  // 3. Upload de Foto
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      const loadingToast = toast.loading("Enviando foto...");
      const publicUrl = await uploadAvatar(user.id, file);
      
      if (publicUrl) {
        setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
        toast.dismiss(loadingToast);
        toast.success("Foto atualizada!");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Erro no upload");
    }
  };

  // 4. Lógica para Apagar Baba
  const handleDeleteBaba = async (babaId) => {
    const confirmar = window.confirm("⚠️ ATENÇÃO: Apagar este Baba excluirá permanentemente todos os rankings e fotos vinculadas. Deseja continuar?");
    
    if (confirmar) {
      try {
        await deleteBaba(babaId);
        setMyBabas(myBabas.filter(b => b.id !== babaId));
        toast.success("Baba removido!");
      } catch (error) {
        toast.error("Erro ao remover Baba");
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-cyan-electric" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-24 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl text-white/50 hover:text-white transition-colors">
          <ArrowLeft size={22}/>
        </button>
        <h1 className="text-2xl font-black text-cyan-electric italic tracking-tighter">MEU PERFIL</h1>
        <button onClick={signOut} className="text-red-500 opacity-50 hover:opacity-100 transition-opacity p-2 bg-red-500/10 rounded-xl">
          <LogOut size={22}/>
        </button>
      </header>

      {/* CARD DE IDENTIDADE */}
      <div className="card-glass p-6 rounded-3xl border border-white/10 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-white/5 border-2 border-cyan-electric flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,242,255,0.2)]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
              ) : (
                <Camera className="opacity-20 text-cyan-electric" size={40}/>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-cyan-electric p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
              <PlusCircle size={18} className="text-black"/>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files[0])}/>
            </label>
          </div>

          <div className="text-center w-full">
            <input 
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value.toUpperCase()})}
              className="bg-transparent text-xl font-black uppercase italic text-center w-full outline-none focus:text-cyan-electric transition-colors"
              placeholder="SEU NOME"
            />
            <p className="text-[9px] text-cyan-electric font-bold tracking-[0.3em] uppercase mt-1 opacity-60">
              Draft ID: #{user?.id?.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* FORMULÁRIO COM CAMPOS ADICIONAIS */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="space-y-1">
            <label className="text-[9px] font-black opacity-40 uppercase ml-2 tracking-widest">Idade</label>
            <input 
              type="number" 
              value={profile.age}
              onChange={(e) => setProfile({...profile, age: e.target.value})}
              placeholder="Ex: 25" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-cyan-electric transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black opacity-40 uppercase ml-2 tracking-widest">Posição</label>
            <select 
              value={profile.position}
              onChange={(e) => setProfile({...profile, position: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-cyan-electric appearance-none text-white"
            >
              <option value="Linha" className="bg-[#0a0a0a]">Linha</option>
              <option value="Goleiro" className="bg-[#0a0a0a]">Goleiro</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[9px] font-black opacity-40 uppercase ml-2 tracking-widest">Time do Coração</label>
            <input 
              type="text" 
              value={profile.heart_team}
              onChange={(e) => setProfile({...profile, heart_team: e.target.value})}
              placeholder="Ex: Bahia" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-cyan-electric transition-all"
            />
          </div>
        </div>

        <button 
          onClick={handleUpdateProfile}
          disabled={saving}
          className="w-full mt-6 bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-electric transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>}
          Salvar Alterações
        </button>
      </div>

      {/* GESTÃO DE BABAS (Preservada) */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black opacity-40 uppercase ml-4 tracking-widest flex items-center gap-2">
          <Settings size={14} className="text-cyan-electric"/> Gestão de Babas
        </h3>

        {myBabas.length > 0 ? (
          myBabas.map((baba) => (
            <div key={baba.id} className="card-glass p-4 rounded-3xl border border-white/10 flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-xs font-black uppercase italic tracking-tight">{baba.nome || baba.name}</h4>
                <p className="text-[8px] opacity-50 font-bold uppercase">{baba.game_time || '20:00'}h</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/edit-baba/${baba.id}`)}
                  className="p-3 bg-white/5 rounded-2xl text-white hover:bg-cyan-electric hover:text-black transition-all"
                >
                  <Edit3 size={16}/>
                </button>
                <button 
                  onClick={() => handleDeleteBaba(baba.id)}
                  className="p-3 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[10px] italic opacity-30 text-center py-4 bg-white/5 rounded-3xl border border-dashed border-white/10">
            Você ainda não criou nenhum Baba.
          </p>
        )}

        <button 
          onClick={() => navigate('/dashboard')} 
          className="w-full card-glass p-5 rounded-3xl border border-cyan-electric/20 flex items-center justify-between group hover:border-cyan-electric transition-all bg-cyan-electric/5"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-electric/10 rounded-2xl text-cyan-electric group-hover:bg-cyan-electric group-hover:text-black transition-all">
              <PlusCircle size={20}/>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black uppercase italic tracking-tight">Novo Baba</h3>
              <p className="text-[9px] opacity-50 uppercase font-bold">Criar um novo grupo</p>
            </div>
          </div>
          <span className="text-cyan-electric font-black group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
