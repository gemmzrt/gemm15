
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isMockMode } from './services/supabaseClient';
import { UserProfile, EventConfig, ThemeConfig, RSVP, UserSegment, SongSuggestion, Photo, ChatMessage, InviteCode as InviteCodeType } from './types';
import { 
  Loader2, MapPin, Music, Camera, MessageCircle, Calendar, CheckCircle, 
  XCircle, Upload, Send, Shield, Settings, LogOut, Info, AlertTriangle,
  Plus, Trash2, Database, Wifi, WifiOff, Mail, Lock, Download, Utensils, Users, Image as ImageIcon,
  Check, X
} from 'lucide-react';

// --- Constants & Mocks ---
const DEFAULT_THEME: ThemeConfig = {
  id: 1,
  font_family: 'Inter, sans-serif',
  color_bg: '#0f172a',
  color_card: '#1e293b',
  color_text: '#f8fafc',
  color_primary: '#ec4899',
  color_accent: '#8b5cf6',
  motion_level: 'medium'
};

const MOCK_EVENT_CONFIG: EventConfig = {
  id: 1,
  event_date: '2026-03-14T14:00:00-01:00',
  location_name: 'Espacio de Eventos Mamá Lidia',
  location_address: 'Roldán, Santa Fé, Argentina',
  location_maps_url: 'https://maps.app.goo.gl/dqdYRr1XNrJgosyb7',
  time_young: '14:00',
  time_adult: '19:00',
  spotify_playlist_url: 'https://open.spotify.com/',
  rules_young: 'Barra de tragos sin alcohol. Dress code: Semi-formal divertido.',
  rules_adult: 'Recepción 19hs. Dress code: Elegante Sport.',
  dress_code_young: 'Semi-formal',
  dress_code_adult: 'Elegante Sport',
  checklist_young: 'Traé traje de baño para la Pool-party!, Ropa para la Noche!',
  welcome_message: '¡Estás invitado a la mejor noche del año, Gemma 15!'
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg";
  const variants: any = {
    primary: "bg-[var(--color-primary)] text-white hover:brightness-110",
    secondary: "bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white",
    ghost: "bg-transparent text-[var(--color-text)] hover:bg-white/10",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-600 text-white hover:bg-green-700"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', title, icon: Icon }: any) => (
  <div className={`bg-[var(--color-card)]/90 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-white/5 flex flex-col h-full transition-transform duration-300 hover:scale-[1.01] ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-3 text-[var(--color-primary)] font-bold uppercase tracking-wider text-xs">
        {Icon && <Icon size={14} />}
        <span>{title}</span>
      </div>
    )}
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', className = '', readOnly=false }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    readOnly={readOnly}
    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-white/30 focus:outline-none focus:border-[var(--color-primary)] transition-colors ${className}`}
  />
);

// --- Main App Component ---

export default function App() {
  // Global State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'AUTH' | 'HOME' | 'ADMIN' | 'PROFILE_SETUP'>('AUTH');
  
  // Data State
  const [eventConfig, setEventConfig] = useState<EventConfig>(MOCK_EVENT_CONFIG);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  
  // UI State
  const [inviteCode, setInviteCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'}|null>(null);
  
  // Auth Fallback State
  const [authMode, setAuthMode] = useState<'CODE' | 'EMAIL_REQUIRED'>('CODE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // --- Effects ---

  useEffect(() => {
    const initApp = async () => {
      // A. Load Configs
      if (isMockMode) {
        setTheme(DEFAULT_THEME);
        setEventConfig(MOCK_EVENT_CONFIG);
      } else {
        try {
          const [themeRes, eventRes] = await Promise.all([
            supabase.from('theme_config').select('*').single(),
            supabase.from('event_config').select('*').single()
          ]);
          if (themeRes.data) setTheme(themeRes.data);
          if (eventRes.data) setEventConfig(eventRes.data);
        } catch (e) {
          console.error("Config fetch error:", e);
        }
      }

      // B. Check Session
      if (!isMockMode) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
             const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', data.session.user.id).single();
             if (profile) {
                loginUser(profile);
             }
          }
        } catch (e) {
          console.warn("Session check error", e);
        }
      }
      setLoading(false);
    };

    initApp();

    if (!isMockMode) {
      const channel = supabase.channel('public:theme_config')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'theme_config' }, (payload) => {
          setTheme(payload.new as ThemeConfig);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg', theme.color_bg);
    root.style.setProperty('--color-card', theme.color_card);
    root.style.setProperty('--color-text', theme.color_text);
    root.style.setProperty('--color-primary', theme.color_primary);
    root.style.setProperty('--color-accent', theme.color_accent);
    root.style.setProperty('--font-family', theme.font_family);
  }, [theme]);

  // --- Helpers ---

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loginUser = async (profile: UserProfile) => {
    setUser(profile);
    
    // Check if profile is complete (Name is required)
    if ((!profile.name || profile.name.startsWith('Invitado ')) && profile.segment !== 'ADMIN') {
        setView('PROFILE_SETUP');
    } else {
        if (profile.segment === UserSegment.ADMIN) setIsAdmin(true);
        setView('HOME');
        loadUserData(profile.user_id);
    }
  };

  const loadUserData = async (userId: string) => {
      if (isMockMode) {
        setMessages([
            { id: 1, user_id: 'system', text: '¡Bienvenid@s a la demo offline!', created_at: new Date().toISOString(), profiles: { name: 'Bot', user_id: 'bot', segment: UserSegment.ADULT, is_celiac: false, created_at: '' } }
        ]);
        return;
      }

      try {
        const { data: rsvpData } = await supabase.from('rsvps').select('*').eq('user_id', userId).single();
        if (rsvpData) setRsvp(rsvpData);

        const { data: chatData } = await supabase.from('chat_messages').select('*, profiles(name, avatar_url)').order('created_at', { ascending: false }).limit(50);
        if (chatData) setMessages(chatData.reverse() as any);
        
        // Load approved photos for slideshow
        const { data: photosData } = await supabase.from('photos').select('*, profiles(name)').eq('status', 'APPROVED').order('created_at', { ascending: false });
        if (photosData) setPublicPhotos(photosData as any);

        supabase.channel('public:chat_messages')
         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
           const { data: sender } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', payload.new.user_id).single();
           setMessages(prev => [...prev, { ...payload.new, profiles: sender } as any]);
         })
         .subscribe();
      } catch (e) {
        console.error("User data load error", e);
      }
  };

  // --- Actions ---
  const handleLogout = async () => {
    if (!isMockMode) await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setInviteCode('');
    setEmail('');
    setPassword('');
    setView('AUTH');
    setAuthMode('CODE');
  };

  const validateCode = async (code: string): Promise<InviteCodeType | null> => {
      if (isMockMode) {
          if (code === 'ADMIN-SETUP') return { code, segment: UserSegment.ADMIN, is_used: false };
          return { code, segment: UserSegment.YOUNG, is_used: false };
      }
      if (code === 'ADMIN-SETUP') return { code, segment: UserSegment.ADMIN, is_used: false };

      const { data: invite } = await supabase.from('invites').select('*').eq('code', code).single();
      if (!invite) throw new Error('Código inválido');
      if (invite.is_used) throw new Error('Este código ya fue activado. Ingresá con tu email.');
      return invite;
  };

  const handleAuth = async () => {
    if (!inviteCode) return setAuthError('Ingresá tu código');
    setLoading(true);
    setAuthError('');
    
    try {
        const code = inviteCode.toUpperCase();
        const invite = await validateCode(code);
        if (!invite) throw new Error('Error validando código');

        setAuthMode('EMAIL_REQUIRED'); 
        setLoading(false);

    } catch (err: any) {
        setAuthError(err.message || 'Error de conexión');
        setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
      if (!email) return setAuthError('Ingresá tu email');
      setLoading(true);
      setAuthError('');

      try {
          const code = inviteCode.toUpperCase();
          const invite = await validateCode(code); 
          if (!invite) throw new Error('Código inválido');

          if (invite.code === 'ADMIN-SETUP') {
               if (!password) {
                   setAuthError('Ingresá una contraseña');
                   setLoading(false); return;
               }
               const { data, error } = await supabase.auth.signInWithPassword({ email, password });
               if (error) {
                   if (error.message.includes('Invalid login')) {
                       const { data: upData, error: upError } = await supabase.auth.signUp({ email, password });
                       if (upError) throw upError;
                       if (upData.user) {
                           await createProfileAndEnter(upData.user.id, invite);
                           return;
                       } else throw new Error('Verificá tu email.');
                   }
                   throw error;
               }
               if (data.user) await createProfileAndEnter(data.user.id, invite);

          } else {
              const { error } = await supabase.auth.signInWithOtp({ 
                  email,
                  options: {
                      emailRedirectTo: window.location.origin,
                      data: { invite_code: code } 
                  }
              });
              if (error) throw error;
              localStorage.setItem('pending_invite_code', code);
              setMagicLinkSent(true);
              setLoading(false);
          }
      } catch (err: any) {
          setAuthError(err.message || 'Error');
          setLoading(false);
      }
  };

  const createProfileAndEnter = async (userId: string, invite: InviteCodeType) => {
      const isAdminLogin = invite.segment === UserSegment.ADMIN;
      
      const newProfile: UserProfile = {
          user_id: userId,
          name: isAdminLogin ? 'Administrador' : '', 
          segment: invite.segment,
          is_celiac: false,
          created_at: new Date().toISOString()
      };

      let existing: UserProfile | null = null;

      if (!isMockMode) {
           const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
           existing = data;
           
           if (!existing) {
               await supabase.from('profiles').insert(newProfile);
               if (!isAdminLogin && invite.code !== 'ADMIN-SETUP') {
                   await supabase.from('invites').update({ is_used: true, used_by: userId }).eq('code', invite.code);
               }
           }
      }
      await loginUser(existing || newProfile);
      setLoading(false);
  };

  // --- Profile Setup Component ---
  const ProfileSetup = () => {
      const [name, setName] = useState('');
      const [isCeliac, setIsCeliac] = useState(false);
      const [saving, setSaving] = useState(false);

      const saveProfile = async () => {
          if (!name.trim()) return showToast('Ingresá tu nombre', 'error');
          setSaving(true);

          if (isMockMode) {
             const updated = { ...user!, name, is_celiac: isCeliac };
             setUser(updated);
             setView('HOME');
             return;
          }

          const { error } = await supabase.from('profiles').update({
              name,
              is_celiac: isCeliac
          }).eq('user_id', user!.user_id);

          if (error) {
              showToast('Error guardando perfil', 'error');
              setSaving(false);
          } else {
              setUser({ ...user!, name, is_celiac: isCeliac });
              setView('HOME');
              loadUserData(user!.user_id);
          }
      };

      return (
          <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
              <div className="w-full max-w-md bg-[var(--color-card)] p-8 rounded-3xl border border-[var(--color-primary)]/30 shadow-2xl">
                  <h2 className="text-3xl font-black text-center mb-6 text-[var(--color-primary)] font-['Pacifico']">¡Hola!</h2>
                  <p className="text-center mb-8 opacity-80">Antes de empezar, contanos quién sos para que Gemma sepa que viniste.</p>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs uppercase font-bold mb-2 opacity-70">Nombre y Apellido</label>
                          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="text-lg" />
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                          <Utensils className="text-orange-400" />
                          <div className="flex-1">
                              <span className="font-bold block">Soy Celíaco/a</span>
                              <span className="text-xs opacity-60">Necesito menú sin TACC</span>
                          </div>
                          <input type="checkbox" checked={isCeliac} onChange={(e) => setIsCeliac(e.target.checked)} className="w-6 h-6 accent-[var(--color-primary)]" />
                      </div>

                      <Button onClick={saveProfile} disabled={saving} className="w-full py-4 text-lg">
                          {saving ? <Loader2 className="animate-spin" /> : '¡Listo, a festejar!'}
                      </Button>
                  </div>
              </div>
          </div>
      );
  };

  // --- Admin Panel Component ---
  const AdminPanel = () => {
      const [activeTab, setActiveTab] = useState<'GUESTS'|'PHOTOS'|'CONFIG'>('GUESTS');
      const [guests, setGuests] = useState<any[]>([]); // Changed to guests, merging profiles and invites
      const [loadingData, setLoadingData] = useState(false);
      const [photos, setPhotos] = useState<Photo[]>([]);

      const [genAmount, setGenAmount] = useState(10);
      const [genSegment, setGenSegment] = useState<UserSegment>(UserSegment.YOUNG);
      const [generating, setGenerating] = useState(false);

      useEffect(() => {
          if (activeTab === 'GUESTS' && !isMockMode) fetchGuests();
          if (activeTab === 'PHOTOS' && !isMockMode) fetchPhotos();
      }, [activeTab]);

      const fetchGuests = async () => {
          setLoadingData(true);
          // Fetch Profiles (The source of truth for people)
          const { data: profiles } = await supabase.from('profiles').select('*');
          // Fetch Invites (To know who used what code)
          const { data: invites } = await supabase.from('invites').select('*');
          
          if (profiles) {
              const inviteMap: any = {};
              invites?.forEach(i => { if(i.used_by) inviteMap[i.used_by] = i; });

              // Combine: Profiles + their invite info
              const combined = profiles.map(p => ({
                  ...p,
                  invite: inviteMap[p.user_id] || null
              })).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
              
              setGuests(combined);
          }
          setLoadingData(false);
      };

      const fetchPhotos = async () => {
          const { data } = await supabase.from('photos').select('*, profiles(name)').order('created_at', { ascending: false });
          if (data) setPhotos(data as any);
      };

      const batchGenerate = async () => {
          setGenerating(true);
          const prefix = genSegment === UserSegment.YOUNG ? 'G15-J' : 'G15-A';
          
          let startNum = 1;
          
          if (!isMockMode) {
              // Get the last code with this prefix to increment
              const { data: lastInvite } = await supabase.from('invites')
                  .select('code')
                  .like('code', `${prefix}%`)
                  .order('code', { ascending: false })
                  .limit(1)
                  .single();

              if (lastInvite) {
                  const numPart = lastInvite.code.replace(prefix, '');
                  startNum = parseInt(numPart) + 1;
              }
          }

          const newInvites = [];
          for (let i = 0; i < genAmount; i++) {
              const currentNum = startNum + i;
              // Format: G15-J01, G15-J10, G15-J100
              const paddedNum = currentNum.toString().padStart(2, '0');
              const code = `${prefix}${paddedNum}`;
              
              newInvites.push({
                  code: code,
                  segment: genSegment,
                  is_used: false
              });
          }

          if (!isMockMode) {
              const { error } = await supabase.from('invites').insert(newInvites);
              if (error) {
                  showToast('Error generando: ' + error.message, 'error');
              } else {
                  showToast(`Generados ${genAmount} códigos (${prefix}...)`);
                  // Just refresh stats or simple list if we want, but "Guests" tab shows People
              }
          } else {
             showToast(`Simulado: ${genAmount} códigos`);
          }
          setGenerating(false);
      };

      const updateTable = async (userId: string, newTable: string) => {
          if (!userId) return;
          const { error } = await supabase.from('profiles').update({ table: newTable }).eq('user_id', userId);
          if (!error) {
              showToast('Mesa actualizada');
              // Optimistic update
              setGuests(prev => prev.map(g => g.user_id === userId ? { ...g, table: newTable } : g));
          } else {
              showToast('Error al actualizar', 'error');
          }
      };

      const downloadCSV = () => {
          const headers = ['Nombre', 'Código', 'Segmento', 'Celíaco', 'Mesa'];
          const rows = guests.map(g => [
              g.name,
              g.invite?.code || 'N/A',
              g.segment,
              g.is_celiac ? 'SI' : 'NO',
              g.table || '-'
          ]);
          
          const csvContent = "data:text/csv;charset=utf-8," 
              + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
          
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "lista_gemma15.csv");
          document.body.appendChild(link);
          link.click();
      };

      const moderatePhoto = async (photoId: number, status: 'APPROVED' | 'REJECTED') => {
          await supabase.from('photos').update({ status }).eq('id', photoId);
          fetchPhotos();
      };

      return (
          <div className="p-4 md:p-8 bg-black/90 min-h-screen text-[var(--color-text)]">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-[var(--color-primary)]">Admin Panel</h2>
                  <Button onClick={() => { setView('HOME'); loadUserData(user!.user_id); }} variant="ghost">Volver a Home</Button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
                  <button onClick={() => setActiveTab('GUESTS')} className={`pb-2 px-4 font-bold ${activeTab === 'GUESTS' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'opacity-50'}`}>Invitados & Mesas</button>
                  <button onClick={() => setActiveTab('PHOTOS')} className={`pb-2 px-4 font-bold ${activeTab === 'PHOTOS' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'opacity-50'}`}>Fotos ({photos.filter(p => p.status === 'PENDING').length})</button>
              </div>

              {activeTab === 'GUESTS' && (
                  <div className="animate-in fade-in">
                      <div className="bg-white/5 p-6 rounded-2xl mb-8 border border-white/10">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus /> Generar Códigos (Incremental)</h3>
                          <div className="flex flex-wrap gap-4 items-end">
                               <div>
                                   <label className="block text-xs uppercase mb-1 opacity-70">Cantidad</label>
                                   <select value={genAmount} onChange={(e) => setGenAmount(Number(e.target.value))} className="bg-black/40 p-3 rounded-xl border border-white/10">
                                       <option value={10}>10</option>
                                       <option value={50}>50</option>
                                       <option value={100}>100</option>
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs uppercase mb-1 opacity-70">Segmento</label>
                                   <select value={genSegment} onChange={(e) => setGenSegment(e.target.value as any)} className="bg-black/40 p-3 rounded-xl border border-white/10">
                                       <option value="YOUNG">Jóvenes (G15-J..)</option>
                                       <option value="ADULT">Adultos (G15-A..)</option>
                                   </select>
                               </div>
                               <Button onClick={batchGenerate} disabled={generating} variant="primary">
                                   {generating ? <Loader2 className="animate-spin" /> : 'Generar'}
                               </Button>
                          </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                          <div className="text-sm font-bold opacity-70">
                              Total Registrados: {guests.length}
                          </div>
                          <Button onClick={downloadCSV} variant="secondary" icon={Download} className="text-xs">Exportar Excel</Button>
                      </div>

                      <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                          <div className="grid grid-cols-12 gap-2 p-4 bg-white/5 font-bold text-xs uppercase opacity-70">
                              <div className="col-span-3">Nombre</div>
                              <div className="col-span-2">Código</div>
                              <div className="col-span-1">Seg.</div>
                              <div className="col-span-2">Celíaco</div>
                              <div className="col-span-4">Mesa</div>
                          </div>
                          {loadingData ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/></div> : 
                           guests.map(guest => (
                              <div key={guest.user_id} className="grid grid-cols-12 gap-2 p-4 border-b border-white/5 items-center hover:bg-white/5 text-sm">
                                  <div className="col-span-3 font-bold truncate">{guest.name}</div>
                                  <div className="col-span-2 font-mono text-[var(--color-primary)] text-xs">{guest.invite?.code || 'ADMIN'}</div>
                                  <div className="col-span-1 opacity-70 text-[10px]">{guest.segment === 'YOUNG' ? 'JOV' : 'ADU'}</div>
                                  <div className="col-span-2">{guest.is_celiac ? <span className="text-orange-400 font-bold flex gap-1 items-center"><Utensils size={12}/> SI</span> : <span className="opacity-30">NO</span>}</div>
                                  <div className="col-span-4">
                                      <input 
                                        type="text" 
                                        placeholder="Mesa..."
                                        defaultValue={guest.table || ''}
                                        onBlur={(e) => updateTable(guest.user_id, e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs focus:border-[var(--color-primary)] outline-none"
                                      />
                                  </div>
                              </div>
                           ))}
                      </div>
                  </div>
              )}

              {activeTab === 'PHOTOS' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
                      {photos.length === 0 && <p className="opacity-50 col-span-full text-center py-10">No hay fotos para moderar.</p>}
                      {photos.map(photo => (
                          <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-black">
                              <img src={isMockMode ? 'https://via.placeholder.com/300' : `${(import.meta as any).env.VITE_SUPABASE_URL}/storage/v1/object/public/user_photos/${photo.storage_path}`} className="object-cover w-full h-full" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 flex flex-col justify-end p-2">
                                  <p className="text-xs font-bold mb-2">{photo.profiles?.name}</p>
                                  <div className="flex gap-2">
                                      {photo.status === 'PENDING' && (
                                          <>
                                            <button onClick={() => moderatePhoto(photo.id, 'APPROVED')} className="flex-1 bg-green-500 text-white p-2 rounded hover:scale-105 transition"><Check size={16} className="mx-auto"/></button>
                                            <button onClick={() => moderatePhoto(photo.id, 'REJECTED')} className="flex-1 bg-red-500 text-white p-2 rounded hover:scale-105 transition"><X size={16} className="mx-auto"/></button>
                                          </>
                                      )}
                                      {photo.status === 'APPROVED' && <span className="text-green-400 text-xs font-bold bg-green-900/50 px-2 py-1 rounded">Aprobada</span>}
                                      {photo.status === 'REJECTED' && <span className="text-red-400 text-xs font-bold bg-red-900/50 px-2 py-1 rounded">Rechazada</span>}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const TableCard = () => (
      <Card title="Tu Mesa" icon={Users} className="md:col-span-1 bg-gradient-to-br from-[var(--color-card)] to-[var(--color-accent)]/20">
          <div className="flex flex-col items-center justify-center h-full py-4">
              {user?.table ? (
                  <>
                    <span className="text-4xl font-black text-[var(--color-accent)] animate-bounce font-['Pacifico']">{user.table}</span>
                    <p className="text-sm opacity-70 mt-2">¡Ahí te esperan tus amigos!</p>
                  </>
              ) : (
                  <div className="text-center opacity-50">
                      <Users size={32} className="mx-auto mb-2 opacity-50"/>
                      <p className="text-xs">Aún no tenés mesa asignada.</p>
                      <p className="text-[10px] mt-1">Te avisaremos pronto.</p>
                  </div>
              )}
          </div>
      </Card>
  );

  const GalleryCard = () => (
      <Card title="Momentos" icon={ImageIcon} className="md:col-span-2">
          {publicPhotos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                  {publicPhotos.slice(0, 10).map(p => (
                      <div key={p.id} className="snap-center shrink-0 w-32 h-32 rounded-lg overflow-hidden relative">
                           <img src={isMockMode ? 'https://via.placeholder.com/150' : `${(import.meta as any).env.VITE_SUPABASE_URL}/storage/v1/object/public/user_photos/${p.storage_path}`} className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 w-full bg-black/60 text-[8px] p-1 truncate text-center">{p.profiles?.name}</div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="h-24 flex items-center justify-center opacity-40 text-sm">
                  Aún no hay fotos aprobadas. ¡Subí la tuya!
              </div>
          )}
          <Button variant="ghost" className="w-full mt-2 text-xs">Ver Galería Completa</Button>
      </Card>
  );

  const RSVPCard = () => {
    const updateRsvp = async (status: 'CONFIRMED' | 'DECLINED') => {
        if (!user) return;
        
        const newRsvp: RSVP = { user_id: user.user_id, status, updated_at: new Date().toISOString() };
        setRsvp(newRsvp); 

        if (!isMockMode) {
            const { error } = await supabase.from('rsvps').upsert(newRsvp);
            if (error) {
                console.error("RSVP Error:", error);
                showToast('Error de red: No se pudo guardar', 'error');
            } else {
                showToast('Asistencia actualizada');
            }
        }
    };

    return (
        <Card title="Asistencia" icon={CheckCircle} className="md:col-span-1">
            <div className="flex flex-col gap-2 h-full justify-center">
               {rsvp?.status === 'CONFIRMED' ? (
                   <div className="bg-green-500/20 text-green-300 p-4 rounded-xl text-center">
                       <CheckCircle className="mx-auto mb-2" />
                       <p className="font-bold">¡Confirmado!</p>
                       <Button onClick={() => updateRsvp('DECLINED')} variant="ghost" className="mt-2 text-xs">Cambiar</Button>
                   </div>
               ) : (
                   <>
                       <p className="text-sm opacity-70 mb-2">¿Venís a la fiesta?</p>
                       <Button onClick={() => updateRsvp('CONFIRMED')} variant="success" className="w-full">¡Sí, voy!</Button>
                       <Button onClick={() => updateRsvp('DECLINED')} variant="ghost" className="w-full text-xs opacity-50">No puedo :(</Button>
                   </>
               )}
            </div>
        </Card>
    );
  };

  const PhotoUploadCard = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

        if (isMockMode) {
            setTimeout(() => {
                 setUploading(false);
                 showToast('Foto subida (Modo Demo)');
            }, 1000);
            return;
        }

        try {
            // Sanitize filename to avoid S3/Storage issues
            const fileExt = file.name.split('.').pop();
            const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${user!.user_id}/${Date.now()}_${cleanName}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('user_photos').upload(fileName, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from('photos').insert({
                user_id: user!.user_id,
                storage_path: fileName,
                status: 'PENDING',
                is_featured: false
            });

            if (dbError) throw dbError;

            showToast('¡Foto enviada! El admin la revisará.');
        } catch (error: any) {
            console.error("Upload Error:", error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Card title="Subí tu Foto" icon={Camera} className="md:col-span-1">
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                {uploading ? (
                    <div className="text-center">
                        <Loader2 className="animate-spin mb-2 mx-auto" />
                        <span className="text-xs">Subiendo...</span>
                    </div>
                ) : (
                    <>
                        <Upload className="mb-2 opacity-50" />
                        <p className="text-xs text-center font-bold">Tocá para subir</p>
                        <p className="text-[10px] opacity-50 text-center">Será parte del show</p>
                    </>
                )}
            </div>
        </Card>
    );
  };

  const ChatCard = () => {
    const [text, setText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);
    
    const sendMessage = async () => {
        if (!text.trim()) return;
        const msgText = text;
        setText('');

        if (isMockMode) {
            setMessages(prev => [...prev, { id: Date.now(), user_id: user!.user_id, text: msgText, created_at: new Date().toISOString(), profiles: user! }]);
            return;
        }

        await supabase.from('chat_messages').insert({
            user_id: user!.user_id,
            text: msgText
        });
    };

    return (
        <Card title="Chat Invitados" icon={MessageCircle} className="md:col-span-2 row-span-2 h-[400px] flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.user_id ? 'flex-row-reverse' : ''}`}>
                         <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                             {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} className="w-full h-full object-cover"/> : (msg.profiles?.name?.[0] || '?')}
                         </div>
                         <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.user_id === user?.user_id ? 'bg-[var(--color-primary)] text-white rounded-tr-none' : 'bg-white/5 rounded-tl-none'}`}>
                             <p className="font-bold text-[10px] opacity-70 mb-1">{msg.profiles?.name}</p>
                             {msg.text}
                         </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-auto">
                <Input value={text} onChange={(e: any) => setText(e.target.value)} placeholder="Escribí un mensaje..." className="text-sm py-2" />
                <Button onClick={sendMessage} className="px-3" icon={Send} />
            </div>
        </Card>
    );
  };

  // --- Render ---

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-primary)]">
      <Loader2 size={48} className="animate-spin mb-4" />
    </div>
  );

  if (view === 'PROFILE_SETUP') return <ProfileSetup />;
  if (view === 'ADMIN') return <AdminPanel />;
  
  if (view === 'AUTH') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-md bg-[var(--color-card)]/90 p-8 rounded-3xl shadow-2xl border border-white/10 text-center">
          <h1 className="text-4xl font-black mb-2 font-['Pacifico'] text-[var(--color-primary)]">Gemma 15</h1>
          
          {authMode === 'CODE' ? (
              <>
                  <p className="text-lg mb-8 opacity-80">Ingresá tu código de invitación</p>
                  {isMockMode && <div className="mb-4 text-xs bg-yellow-500/20 text-yellow-200 p-2 rounded">⚡ Modo Demo Offline Activo</div>}
                  <div className="space-y-4">
                    <Input value={inviteCode} onChange={(e: any) => setInviteCode(e.target.value.toUpperCase())} placeholder="CÓDIGO (Ej: G15-J01)" className="text-center text-xl tracking-widest uppercase font-mono" />
                    {authError && <div className="text-red-400 text-sm font-bold bg-red-500/10 p-2 rounded">{authError}</div>}
                    <Button onClick={handleAuth} className="w-full py-4 text-lg">Validar Código</Button>
                    <p className="text-xs opacity-50 mt-4">¿Sos Admin? Usá 'ADMIN-SETUP'</p>
                  </div>
              </>
          ) : (
              // EMAIL REQUIRED
              <>
                  <p className="text-lg mb-4 opacity-80">Validar Identidad</p>
                  <p className="text-xs opacity-60 mb-6">Para asegurar tu lugar, necesitamos validar tu email.</p>
                  
                  {magicLinkSent ? (
                      <div className="bg-green-500/20 p-4 rounded-xl text-green-200 animate-in zoom-in">
                          <Mail size={40} className="mx-auto mb-2" />
                          <p className="font-bold">¡Revisá tu correo!</p>
                          <p className="text-xs mt-2 opacity-80">Te enviamos un link mágico para entrar sin contraseña.</p>
                          <Button onClick={() => { setMagicLinkSent(false); setAuthMode('CODE'); }} variant="ghost" className="mt-4 text-sm">Volver</Button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <Input value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="tu@email.com" type="email" />
                        {inviteCode === 'ADMIN-SETUP' && (
                             <Input value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Contraseña Admin" type="password" />
                        )}
                        {authError && <div className="text-red-400 text-sm font-bold bg-red-500/10 p-2 rounded">{authError}</div>}
                        
                        <Button onClick={handleEmailAuth} className="w-full py-4 text-lg">
                            {inviteCode === 'ADMIN-SETUP' ? 'Entrar' : 'Enviar Link de Acceso'}
                        </Button>
                        
                        <Button onClick={() => { setAuthMode('CODE'); setAuthError(''); }} variant="ghost" className="w-full text-sm">
                           Cambiar Código
                        </Button>
                      </div>
                  )}
              </>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 sticky top-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-lg py-4 -mx-4 px-4 md:rounded-b-2xl">
            <div>
                <h1 className="text-2xl font-black font-['Pacifico'] text-[var(--color-primary)]">Gemma 15</h1>
                <p className="text-xs font-bold opacity-70">Hola, {user?.name.split(' ')[0]}!</p>
            </div>
            <div className="flex gap-2">
                {isAdmin && <button onClick={() => setView('ADMIN')} className="p-2 bg-white/10 rounded-full hover:bg-[var(--color-primary)]"><Settings size={20} /></button>}
                <button onClick={handleLogout} className="p-2 bg-white/10 rounded-full hover:bg-red-500"><LogOut size={20} /></button>
            </div>
        </header>

        <div className="mb-8 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                 <h2 className="text-2xl font-bold mb-2">🎉 {eventConfig.welcome_message}</h2>
                 <p className="opacity-90 flex items-center gap-2"><MapPin size={16}/> {eventConfig.location_name}</p>
             </div>
             <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 -skew-x-12 transform translate-x-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">
            <Card title="Falta poco" icon={Calendar} className="bg-[var(--color-card)] md:col-span-1">
                 <div className="flex flex-col items-center justify-center h-full">
                     <div className="text-3xl font-black text-[var(--color-primary)] font-mono">10d 05h 30m</div>
                     <p className="text-sm mt-2 opacity-60">Te esperamos {user?.segment === 'ADULT' ? eventConfig.time_adult : eventConfig.time_young} hs</p>
                 </div>
            </Card>
            <RSVPCard />
            <TableCard />
            <Card title="Ubicación" icon={MapPin} className="md:col-span-1">
                <p className="font-bold text-lg mb-2">{eventConfig.location_name}</p>
                <Button onClick={() => window.open(eventConfig.location_maps_url, '_blank')} variant="secondary" className="w-full text-xs">Ver Mapa</Button>
            </Card>
            <GalleryCard />
            <PhotoUploadCard />
            <ChatCard />
            <Card title="Reglas" icon={Info} className="md:col-span-1">
                 <ul className="text-xs space-y-2 opacity-80">
                     <li className="flex gap-2"><CheckCircle size={12} className="text-[var(--color-primary)]"/> {user?.segment === 'YOUNG' ? eventConfig.dress_code_young : eventConfig.dress_code_adult}</li>
                 </ul>
            </Card>
        </div>

        {toast && <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold animate-in fade-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{toast.msg}</div>}
    </div>
  );
}
