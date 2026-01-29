
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isMockMode } from './services/supabaseClient';
import { UserProfile, EventConfig, ThemeConfig, RSVP, UserSegment, SongSuggestion, Photo, ChatMessage, InviteCode as InviteCodeType } from './types';
import { 
  Loader2, MapPin, Music, Camera, MessageCircle, Calendar, CheckCircle, 
  XCircle, Upload, Send, Shield, Settings, LogOut, Info, AlertTriangle,
  Plus, Trash2, Database, Wifi, WifiOff, Mail, Lock
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
    danger: "bg-red-500 text-white hover:bg-red-600"
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
  const [view, setView] = useState<'AUTH' | 'HOME' | 'ADMIN'>('AUTH');
  
  // Data State
  const [eventConfig, setEventConfig] = useState<EventConfig>(MOCK_EVENT_CONFIG);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
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

  // 1. Initial Load (Auth & Configs)
  useEffect(() => {
    const initApp = async () => {
      // A. Load Configs
      if (isMockMode) {
        console.log("⚡ MOCK MODE ACTIVE: Using local defaults");
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
             } else {
                 // Session exists but no profile? Could be fresh login.
             }
          }
        } catch (e) {
          console.warn("Session check error", e);
        }
      }
      setLoading(false);
    };

    initApp();

    // C. Realtime Theme Subscription
    if (!isMockMode) {
      const channel = supabase.channel('public:theme_config')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'theme_config' }, (payload) => {
          setTheme(payload.new as ThemeConfig);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  // 2. Apply CSS Variables
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
    if (profile.segment === UserSegment.ADMIN || profile.name === 'Administrador') setIsAdmin(true);
    setView('HOME');
    
    // Load User Data
    if (isMockMode) {
       setMessages([
         { id: 1, user_id: 'system', text: '¡Bienvenid@s a la demo offline!', created_at: new Date().toISOString(), profiles: { name: 'Bot', id: 'bot', segment: UserSegment.ADULT, is_celiac: false, created_at: '' } }
       ]);
    } else {
       try {
         const { data: rsvpData } = await supabase.from('rsvps').select('*').eq('user_id', profile.id).single();
         if (rsvpData) setRsvp(rsvpData);

         const { data: chatData } = await supabase.from('chat_messages').select('*, profiles(name, avatar_url)').order('created_at', { ascending: false }).limit(50);
         if (chatData) setMessages(chatData.reverse() as any);

         supabase.channel('public:chat_messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
            const { data: sender } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', payload.new.user_id).single();
            setMessages(prev => [...prev, { ...payload.new, profiles: sender } as any]);
          })
          .subscribe();
       } catch (e) {
         console.error("User data load error", e);
       }
    }
  };

  // --- Actions ---

  const validateCode = async (code: string): Promise<InviteCodeType | null> => {
      if (isMockMode) {
          if (code === 'ADMIN-SETUP') return { code, segment: UserSegment.ADMIN, is_used: false };
          return { code, segment: UserSegment.YOUNG, is_used: false };
      }
      
      // If code is ADMIN-SETUP, return virtual invite
      if (code === 'ADMIN-SETUP') return { code, segment: UserSegment.ADMIN, is_used: false };

      // Check DB
      const { data: invite } = await supabase.from('invites').select('*').eq('code', code).single();
      if (!invite) throw new Error('Código inválido');
      if (invite.is_used) throw new Error('Este código ya fue usado');
      return invite;
  };

  const handleAuth = async () => {
    if (!inviteCode) return setAuthError('Ingresá tu código');
    setLoading(true);
    setAuthError('');
    
    try {
        const code = inviteCode.toUpperCase();
        
        // 1. Validate Code First
        const invite = await validateCode(code);
        if (!invite) throw new Error('Error validando código');

        let userId = '';

        // 2. Try Anonymous Auth
        if (!isMockMode) {
            try {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) throw error;
                if (data.user) userId = data.user.id;
            } catch (authErr: any) {
                // FALLBACK: If anonymous is disabled, ask for email
                if (authErr.message?.includes('Anonymous sign-ins are disabled') || authErr.code === 'not_allowed') {
                    setAuthMode('EMAIL_REQUIRED');
                    setLoading(false);
                    return; // Stop here, render email form
                }
                throw authErr;
            }
        } else {
            userId = `mock-user-${Date.now()}`;
        }

        // 3. If Auth Successful (Anonymous or Mock), Create Profile
        await createProfileAndEnter(userId, invite);

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

          // Check if Admin Login
          if (invite.code === 'ADMIN-SETUP') {
               if (!password) {
                   setAuthError('Ingresá una contraseña para el admin');
                   setLoading(false);
                   return;
               }
               // Try Login
               const { data, error } = await supabase.auth.signInWithPassword({ email, password });
               if (error) {
                   // If invalid login, try Sign Up (First time admin)
                   if (error.message.includes('Invalid login')) {
                       const { data: upData, error: upError } = await supabase.auth.signUp({ email, password });
                       if (upError) throw upError;
                       if (upData.user) {
                           await createProfileAndEnter(upData.user.id, invite);
                           return;
                       } else {
                           throw new Error('Verificá tu email para continuar.');
                       }
                   }
                   throw error;
               }
               if (data.user) await createProfileAndEnter(data.user.id, invite);

          } else {
              // Guest Login - Magic Link
              const { error } = await supabase.auth.signInWithOtp({ 
                  email,
                  options: {
                      // CRITICAL FIX: Direct link to current origin (Netlify/Vercel URL) instead of localhost
                      emailRedirectTo: window.location.origin
                  }
              });
              if (error) throw error;
              setMagicLinkSent(true);
              setLoading(false);
          }
      } catch (err: any) {
          setAuthError(err.message || 'Error enviando email');
          setLoading(false);
      }
  };

  const createProfileAndEnter = async (userId: string, invite: InviteCodeType) => {
      // Create/Get Profile
      const isAdminLogin = invite.segment === UserSegment.ADMIN;
      const newProfile: UserProfile = {
          id: userId,
          name: isAdminLogin ? 'Administrador' : 'Invitado ' + invite.code,
          segment: invite.segment,
          is_celiac: false,
          created_at: new Date().toISOString()
      };

      if (!isMockMode) {
           // Check if profile exists
           const { data: existing } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
           
           if (!existing) {
               const { error: pError } = await supabase.from('profiles').insert(newProfile);
               if (pError) console.error("Profile creation error", pError);
               
               // Mark invite used
               if (!isAdminLogin && invite.code !== 'ADMIN-SETUP') {
                   await supabase.from('invites').update({ is_used: true, used_by: userId }).eq('code', invite.code);
               }
           } else {
               // Update local profile with existing data
               newProfile.name = existing.name;
               newProfile.segment = existing.segment;
           }
      }

      await loginUser(newProfile);
      setLoading(false);
  };

  const handleLogout = async () => {
    if (!isMockMode) await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setRsvp(null);
    setMessages([]);
    setInviteCode('');
    setAuthMode('CODE');
    setMagicLinkSent(false);
    setEmail('');
    setPassword('');
    setView('AUTH');
  };

  // --- Sub-Components ---

  const RSVPCard = () => {
    const [status, setStatus] = useState<RSVP['status']>(rsvp?.status || 'PENDING');
    const [note, setNote] = useState(rsvp?.note || '');
    const [saving, setSaving] = useState(false);

    const saveRSVP = async (newStatus: RSVP['status']) => {
        setSaving(true);
        setStatus(newStatus);
        
        if (isMockMode) {
            await new Promise(r => setTimeout(r, 800)); // Simulate net
            setRsvp({ user_id: user!.id, status: newStatus, note, updated_at: new Date().toISOString() });
            showToast('¡Guardado! (Modo Demo)');
        } else {
            const payload = { user_id: user!.id, status: newStatus, note, updated_at: new Date().toISOString() };
            const { error } = await supabase.from('rsvps').upsert(payload);
            if (error) showToast('Error al guardar', 'error');
            else {
                setRsvp(payload as RSVP);
                showToast('¡Respuesta guardada!');
            }
        }
        setSaving(false);
    };

    return (
        <Card title="RSVP" icon={CheckCircle} className="md:col-span-2 bg-gradient-to-br from-[var(--color-card)] to-[var(--color-primary)]/10">
            <h3 className="text-2xl font-bold mb-2">¿Venís a la fiesta?</h3>
            <p className="opacity-80 mb-6">Confirmá para que sepamos cuántos somos.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => saveRSVP('CONFIRMED')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${status === 'CONFIRMED' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/10 hover:bg-white/5'}`}>
                    <CheckCircle /> ¡Sí, obvio!
                </button>
                <button onClick={() => saveRSVP('DECLINED')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${status === 'DECLINED' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 hover:bg-white/5'}`}>
                    <XCircle /> No puedo :(
                </button>
            </div>
            {status === 'CONFIRMED' && (
                <div className="mt-2 animate-in fade-in">
                    <Input value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Restricción alimentaria (opcional)" className="text-sm" />
                    <button onClick={() => saveRSVP('CONFIRMED')} className="text-xs text-[var(--color-primary)] font-bold mt-2 hover:underline">
                        {saving ? 'Guardando...' : 'Actualizar nota'}
                    </button>
                </div>
            )}
        </Card>
    );
  };

  const ChatCard = () => {
      const scrollRef = useRef<HTMLDivElement>(null);
      const [text, setText] = useState('');

      useEffect(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, [messages]);

      const send = async () => {
          if (!text.trim() || !user) return;
          const tempMsg = { id: Date.now(), user_id: user.id, text, created_at: new Date().toISOString(), profiles: user };
          
          setText('');
          
          if (isMockMode) {
              setMessages(prev => [...prev, tempMsg as any]);
          } else {
              setMessages(prev => [...prev, tempMsg as any]); // Optimistic
              await supabase.from('chat_messages').insert({ user_id: user.id, text: tempMsg.text, room_id: 1 });
          }
      };

      return (
          <Card title="Chat General" icon={MessageCircle} className="md:col-span-2 md:row-span-2 h-[400px] flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
                  {messages.map((m) => {
                      const isMe = m.user_id === user?.id;
                      return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-xl p-3 text-sm ${isMe ? 'bg-[var(--color-primary)] text-white rounded-br-none' : 'bg-white/10 rounded-bl-none'}`}>
                                  {!isMe && <span className="text-[10px] opacity-70 block mb-1 font-bold">{m.profiles?.name}</span>}
                                  {m.text}
                              </div>
                          </div>
                      );
                  })}
                  {messages.length === 0 && <div className="text-center opacity-50 mt-10">Sé el primero en saludar 👋</div>}
              </div>
              <div className="flex gap-2 mt-auto">
                  <Input value={text} onChange={(e: any) => setText(e.target.value)} placeholder="Escribí un mensaje..." className="flex-1" />
                  <Button onClick={send} className="px-3 rounded-xl"><Send size={18} /></Button>
              </div>
          </Card>
      );
  };

  const PhotoUploadCard = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            setUploading(true);
            const file = e.target.files[0];
            
            if (isMockMode) {
                await new Promise(r => setTimeout(r, 1500));
                showToast('Foto subida (Simulación)');
                setUploading(false);
                return;
            }

            const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
            try {
                const { error: uploadErr } = await supabase.storage.from('user_photos').upload(fileName, file);
                if (uploadErr) throw uploadErr;

                await supabase.from('photos').insert({ user_id: user.id, storage_path: fileName, status: 'PENDING', is_featured: false });
                showToast('Foto subida! Esperando aprobación.');
            } catch (err) {
                showToast('Error al subir foto', 'error');
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <Card title="Fotos con Gemma" icon={Camera} className="md:col-span-1">
             <div className="flex flex-col items-center justify-center h-full text-center">
                 <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors mb-2">
                     {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                 </div>
                 <p className="text-xs font-bold">Subí tus recuerdos</p>
                 <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" className="hidden" />
             </div>
        </Card>
    );
  };

  const AdminPanel = () => {
      const [activeTab, setActiveTab] = useState<'SYSTEM'|'THEME'|'GUESTS'>('SYSTEM');
      const [newCode, setNewCode] = useState('');
      const [invites, setInvites] = useState<InviteCodeType[]>([]);
      const [loadingInvites, setLoadingInvites] = useState(false);

      useEffect(() => {
          let mounted = true;
          if (activeTab === 'GUESTS' && !isMockMode) {
              const fetchInvites = async () => {
                 setLoadingInvites(true);
                 try {
                     // Safer fetch: remove server-side ordering to prevent index errors
                     const { data, error } = await supabase.from('invites').select('*');
                     if (error) throw error;
                     
                     if (mounted && data) {
                         // Sort in client side safely
                         const sorted = (data as any[]).sort((a, b) => 
                            (b.created_at || '').localeCompare(a.created_at || '')
                         );
                         setInvites(sorted);
                     }
                 } catch (err: any) {
                     console.error("Error fetching invites:", err);
                     if (mounted) showToast("Error al cargar lista", "error");
                 } finally {
                     if (mounted) setLoadingInvites(false);
                 }
              };
              fetchInvites();
          }
          return () => { mounted = false; };
      }, [activeTab]);

      const createInvite = async () => {
          if (isMockMode) { showToast('Modo Demo: No se guarda en DB'); return; }
          const codeUpper = newCode.toUpperCase();
          if (!codeUpper) return;
          
          setLoadingInvites(true);
          try {
            const { error } = await supabase.from('invites').insert({ code: codeUpper, segment: 'YOUNG', is_used: false });
            if (!error) { 
                showToast('Código creado'); 
                setNewCode('');
                // Optimistic update
                const newInvite: InviteCodeType = { code: codeUpper, segment: UserSegment.YOUNG, is_used: false };
                setInvites(prev => [newInvite, ...(prev || [])]);
            } else {
                showToast('Error al crear: ' + error.message, 'error');
            }
          } catch(e) {
            showToast('Error desconocido', 'error');
          } finally {
            setLoadingInvites(false);
          }
      };

      const updateTheme = async (key: keyof ThemeConfig, val: string) => {
          const newTheme = { ...theme, [key]: val };
          setTheme(newTheme);
          if (!isMockMode) await supabase.from('theme_config').update({ [key]: val }).eq('id', 1);
      };

      return (
          <div className="p-6 bg-black/90 min-h-screen">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--color-primary)]">Admin Panel</h2>
                  <Button onClick={() => setView('HOME')} variant="ghost">Volver</Button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
                  <button onClick={() => setActiveTab('SYSTEM')} className={`pb-2 whitespace-nowrap px-2 ${activeTab === 'SYSTEM' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'opacity-50'}`}>Sistema</button>
                  <button onClick={() => setActiveTab('GUESTS')} className={`pb-2 whitespace-nowrap px-2 ${activeTab === 'GUESTS' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'opacity-50'}`}>Invitados</button>
                  <button onClick={() => setActiveTab('THEME')} className={`pb-2 whitespace-nowrap px-2 ${activeTab === 'THEME' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'opacity-50'}`}>Diseño</button>
              </div>

              {activeTab === 'SYSTEM' && (
                  <div className="animate-in fade-in space-y-6">
                      <div className={`p-4 rounded-xl border ${isMockMode ? 'bg-orange-500/10 border-orange-500 text-orange-200' : 'bg-green-500/10 border-green-500 text-green-200'}`}>
                          <div className="flex items-center gap-3 mb-2 font-bold text-lg">
                              {isMockMode ? <WifiOff /> : <Wifi />}
                              {isMockMode ? 'Modo Demo (Offline)' : 'Conectado a Supabase'}
                          </div>
                          <p className="opacity-80 text-sm">
                              {isMockMode 
                                ? 'La app está usando datos falsos porque no se encontraron las variables de entorno válidas.' 
                                : 'La base de datos está conectada y sincronizando en tiempo real.'}
                          </p>
                      </div>

                      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Database size={18}/> Configuración para Deploy</h3>
                          <p className="text-sm opacity-70 mb-4">Para conectar la base de datos real, agregá estas variables en Vercel/Netlify:</p>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs uppercase font-bold opacity-50">Project URL (VITE_SUPABASE_URL)</label>
                                  <div className="flex gap-2 mt-1">
                                      <code className="bg-black/40 p-3 rounded block w-full font-mono text-sm text-yellow-500 overflow-hidden text-ellipsis">
                                          {(import.meta as any).env?.VITE_SUPABASE_URL || 'FALTANTE'}
                                      </code>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs uppercase font-bold opacity-50">Anon Key (VITE_SUPABASE_ANON_KEY)</label>
                                  <div className="flex gap-2 mt-1">
                                      <code className="bg-black/40 p-3 rounded block w-full font-mono text-sm text-yellow-500 overflow-hidden text-ellipsis">
                                          {(import.meta as any).env?.VITE_SUPABASE_ANON_KEY ? '••••••••••••••••' : 'FALTANTE'}
                                      </code>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'GUESTS' && (
                  <div className="animate-in fade-in">
                      <div className="bg-white/5 p-4 rounded-xl mb-6 flex gap-2">
                          <Input value={newCode} onChange={(e: any) => setNewCode(e.target.value)} placeholder="NUEVO CÓDIGO" className="uppercase" />
                          <Button onClick={createInvite} disabled={loadingInvites}>Crear</Button>
                      </div>
                      
                      {loadingInvites && <div className="text-center py-4"><Loader2 className="animate-spin inline mr-2"/>Cargando...</div>}
                      
                      {isMockMode ? (
                          <div className="text-center opacity-50 p-10">Lista de invitados no disponible en Demo.</div>
                      ) : (
                          <div className="space-y-2">
                              {!loadingInvites && invites && invites.length === 0 && <p className="opacity-50 text-center py-4">No hay invitaciones creadas aún.</p>}
                              
                              {/* Defensive rendering to prevent crashes if invites is null/undefined */}
                              {invites && Array.isArray(invites) && invites.map(i => (
                                  <div key={i.code} className="p-3 bg-white/5 rounded border border-white/5 flex justify-between">
                                      <span>{i.code}</span>
                                      <span className={i.is_used ? 'text-red-400' : 'text-green-400'}>{i.is_used ? 'Usado' : 'Libre'}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'THEME' && (
                  <div className="animate-in fade-in">
                       <label className="block text-sm opacity-70 mb-2">Color Principal</label>
                       <div className="flex gap-2">
                            <input type="color" value={theme.color_primary} onChange={(e) => updateTheme('color_primary', e.target.value)} className="h-10 w-20 rounded cursor-pointer" />
                            <Input value={theme.color_primary} readOnly />
                       </div>
                  </div>
              )}
          </div>
      );
  };

  // --- Render ---

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-primary)]">
      <Loader2 size={48} className="animate-spin mb-4" />
    </div>
  );

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
                    <Input value={inviteCode} onChange={(e: any) => setInviteCode(e.target.value.toUpperCase())} placeholder="CÓDIGO (Ej: GEMMA-JOVEN)" className="text-center text-xl tracking-widest uppercase font-mono" />
                    {authError && <div className="text-red-400 text-sm font-bold bg-red-500/10 p-2 rounded">{authError}</div>}
                    <Button onClick={handleAuth} className="w-full py-4 text-lg">Ingresar</Button>
                    <p className="text-xs opacity-50 mt-4">Tip: Usá 'ADMIN-SETUP' para configurar.</p>
                  </div>
              </>
          ) : (
              // EMAIL/ADMIN FALLBACK
              <>
                  <p className="text-lg mb-4 opacity-80">{inviteCode === 'ADMIN-SETUP' ? 'Acceso Administrador' : 'Ingreso con Email'}</p>
                  <p className="text-xs opacity-60 mb-6">El acceso anónimo está desactivado. {inviteCode === 'ADMIN-SETUP' ? 'Ingresá tus credenciales de admin.' : 'Usá tu email para validar el código.'}</p>
                  
                  {magicLinkSent ? (
                      <div className="bg-green-500/20 p-4 rounded-xl text-green-200">
                          <Mail size={40} className="mx-auto mb-2" />
                          <p>¡Listo! Revisá tu correo y hacé clic en el link mágico para entrar.</p>
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
                            {inviteCode === 'ADMIN-SETUP' ? 'Entrar / Registrar' : 'Enviar Link de Acceso'}
                        </Button>
                        
                        <Button onClick={() => { setAuthMode('CODE'); setAuthError(''); }} variant="ghost" className="w-full text-sm">
                           Volver
                        </Button>
                      </div>
                  )}
              </>
          )}

        </div>
      </div>
    );
  }

  if (view === 'ADMIN') return <AdminPanel />;

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

        <div className="mb-8 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-6 text-white shadow-lg">
             <h2 className="text-2xl font-bold mb-2">🎉 {eventConfig.welcome_message}</h2>
             <p className="opacity-90">{eventConfig.location_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">
            <Card title="Falta poco" icon={Calendar} className="bg-[var(--color-card)] md:col-span-1">
                 <div className="flex flex-col items-center justify-center h-full">
                     <div className="text-3xl font-black text-[var(--color-primary)] font-mono">10d 05h 30m</div>
                     <p className="text-sm mt-2 opacity-60">Te esperamos {user?.segment === 'ADULT' ? eventConfig.time_adult : eventConfig.time_young} hs</p>
                 </div>
            </Card>
            <RSVPCard />
            <Card title="Ubicación" icon={MapPin} className="md:col-span-1">
                <p className="font-bold text-lg mb-2">{eventConfig.location_name}</p>
                <Button onClick={() => window.open(eventConfig.location_maps_url, '_blank')} variant="secondary" className="w-full text-xs">Ver Mapa</Button>
            </Card>
            <Card title="Reglas" icon={Info} className="md:col-span-1">
                 <ul className="text-xs space-y-2 opacity-80">
                     <li className="flex gap-2"><CheckCircle size={12} className="text-[var(--color-primary)]"/> {user?.segment === 'YOUNG' ? eventConfig.dress_code_young : eventConfig.dress_code_adult}</li>
                 </ul>
            </Card>
            <PhotoUploadCard />
            <ChatCard />
        </div>

        {toast && <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold animate-in fade-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{toast.msg}</div>}
    </div>
  );
}
