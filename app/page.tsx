'use client';
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import UcabFood from "@/components/UcabFood";
import UcabRide from "@/components/UcabRide";
import UcabLivrators from "@/components/UcabLivrators";
import UcabChatAdmin from "@/components/UcabChat";
import UcabStatusDelivery from "@/components/UcabStatusDelivery";
import UcabRiders from "@/components/UcabRiders";
import UcabGlobal from "@/components/UcabGlobal";

import { 
  Utensils, Car, Truck, LayoutGrid, Zap, 
  Menu, X, Settings, ShieldCheck, LogIn, Loader2,
MessageCircle, Users, Bell, Info, Activity , ChevronRight 
} from "lucide-react";

export default function UcabSuperDash() {
  const [activeTab, setActiveTab] = useState("global");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userRole, setUserRole] = useState<"ADMIN" | "FOOD" | "SHARE" | null>(null);
  const [mounted, setMounted] = useState(false);
  // ADAUGĂ ACEASTĂ LINIE LÂNGĂ CELELALTE STATE-URI (SUS ÎN COD)
const [isVerified, setIsVerified] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const APP_DASH_VERSION = "0.13.90426-PRO";

  // --- LOGICĂ ACCES (ROLES) ---
  const determineRole = (userEmail: string | undefined) => {
    if (userEmail === 'admin@ucab.ro') return 'ADMIN';
    if (userEmail === 'food@ucab.ro') return 'FOOD';
    if (userEmail === 'share@ucab.ro') return 'SHARE';
    return null;
  };

  useEffect(() => {
    setMounted(true);
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const role = determineRole(data.session.user.email);
        if (role) {
          setUserRole(role);
          setIsLogged(true);
          // Auto-switch tab based on role
          if (role === 'FOOD') setActiveTab('food');
          if (role === 'SHARE') setActiveTab('ride');
        } else {
          await supabase.auth.signOut();
        }
      }
    };
    checkSession();
  }, []);

  if (!mounted) return null;

  async function handleLogin() {
    if (!email || !password) return alert("Introdu Email și Parolă");
    setAuthLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert("EROARE: " + error.message);
    } else {
      const role = determineRole(data.user?.email);
      if (role) {
        setUserRole(role);
        setIsLogged(true);
        if (role === 'FOOD') setActiveTab('food');
        if (role === 'SHARE') setActiveTab('ride');
      } else {
        await supabase.auth.signOut();
        alert("ACCES REFUZAT: Acest cont nu are permisiuni de acces!");
      }
    }
    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLogged(false);
    setUserRole(null);
  }

  // --- COLOANE PERMISE ---
  const canAccess = (tabId: string) => {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'FOOD') return ['food', 'livrator', 'status', 'chat', 'settings','users'].includes(tabId);
    if (userRole === 'SHARE') return ['ride', 'users', 'chat', 'settings'].includes(tabId);
    return false;
  };

  const themes: any = {
    global: { color: "text-emerald-500", bg: "bg-emerald-600" },
    food: { color: "text-red-500", bg: "bg-red-600" },
    ride: { color: "text-blue-500", bg: "bg-blue-600" },
    livrator: { color: "text-orange-500", bg: "bg-orange-600" },
    status: { color: "text-purple-500", bg: "bg-purple-600" },
    chat: { color: "text-yellow-500", bg: "bg-yellow-600" },
    users: { color: "text-pink-500", bg: "bg-pink-600" },
    settings: { color: "text-zinc-400", bg: "bg-zinc-700" }
  };

  const cur = themes[activeTab] || themes.global;

  // --- ECRAN LOGIN ---
  // --- ECRAN LOGIN GLASSMORPHISM + ANTI-BOT ---
  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-slate-950 italic uppercase">
        
        {/* IMAGINE DE FUNDAL CU OVERLAY */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/ucab2.png" 
            alt="Background" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-slate-900/70 to-black/90 backdrop-blur-[3px]"></div>
        </div>

        <div className="w-full max-w-md bg-white/[0.06] backdrop-blur-[30px] border border-white/10 p-10 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10">
          
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
              <img src="/ucabro.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter">
              UCAB.ro <span className="font-light text-white/50">Admin</span>
            </h1>
            <p className="text-[8px] text-emerald-400 mt-2 font-bold tracking-[0.3em] opacity-70">
              Authorized Personnel Only
            </p>
          </div>

          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="manager@ucab.ro" 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white font-bold text-xs placeholder:text-white/20" 
            />
            
            <input 
              type="password" 
              placeholder="access_key" 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white font-bold text-xs placeholder:text-white/20" 
            />

            {/* ANTI-BOT SLIDER */}
            <div className="relative h-12 bg-white/5 border border-white/10 rounded-2xl mt-6 overflow-hidden flex items-center group">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={isVerified ? 100 : undefined}
                    onChange={(e) => { if(e.target.value === "100") setIsVerified(true); }}
                    className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 ${isVerified ? 'pointer-events-none' : ''}`}
                />
                <div 
                    className="absolute left-1 top-1 bottom-1 bg-emerald-500 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                    style={{ width: isVerified ? 'calc(100% - 8px)' : '40px' }}
                >
                    {isVerified ? (
                        <ShieldCheck size={18} className="text-black" />
                    ) : (
                        <ChevronRight size={18} className="text-black animate-pulse" />
                    )}
                </div>
                <p className={`w-full text-center text-[9px] font-black tracking-widest transition-opacity duration-500 ${isVerified ? 'opacity-0' : 'opacity-30'}`}>
                    Slide to unlock
                </p>
            </div>

            <button 
              onClick={handleLogin} 
              disabled={authLoading || !isVerified}
              className={`w-full py-4.5 font-black text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-xl
                ${isVerified 
                    ? 'bg-white text-black hover:bg-emerald-500 hover:text-white cursor-pointer' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}
              `}
            >
               {authLoading ? (
                 <Loader2 className="animate-spin" size={16} />
               ) : (
                 <>
                   <span>Initialize Access</span>
                   <ChevronRight size={14} />
                 </>
               )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
         
            <div className="text-[7px] font-white tracking-widest">  V {APP_DASH_VERSION}</div>
          </div>
        </div>

        {/* GLOW DECOR */}
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#020202] text-zinc-400 font-sans italic uppercase">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="flex min-h-screen relative">
        <aside className={`fixed inset-y-0 left-0 w-72 bg-[#080808] border-r border-white/5 p-8 z-[200] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
          <div className="flex flex-col h-full">
            <div className="mb-12">
                <h2 className="text-xl font-black text-white tracking-tighter italic">UCAB.RO</h2>
                <div className={`inline-block px-2 py-0.5 rounded text-[8px] font-black ${cur.bg} text-white mt-1`}>
                    {userRole} ACCESS
                </div>
            </div>

            <nav className="flex-1 space-y-2">
              {canAccess('global') && (
                <NavItem icon={<LayoutGrid size={20}/>} label="Overview" active={activeTab === "global"} onClick={() => {setActiveTab("global"); setIsMenuOpen(false);}} activeColor="text-emerald-500" />
              )}
              {canAccess('food') && (
                <NavItem icon={<Utensils size={20}/>} label="Restaurants" active={activeTab === "food"} onClick={() => {setActiveTab("food"); setIsMenuOpen(false);}} activeColor="text-red-500" />
              )}
              {canAccess('livrator') && (
                <NavItem icon={<Truck size={20}/>} label="Livrări" active={activeTab === "livrator"} onClick={() => {setActiveTab("livrator"); setIsMenuOpen(false);}} activeColor="text-orange-500" />
              )}
              {canAccess('ride') && (
                <NavItem icon={<Car size={20}/>} label="Drivers" active={activeTab === "ride"} onClick={() => {setActiveTab("ride"); setIsMenuOpen(false);}} activeColor="text-blue-500" />
              )}
              {canAccess('status') && (
                <NavItem icon={<Activity size={20}/>} label="Status" active={activeTab === "status"} onClick={() => {setActiveTab("status"); setIsMenuOpen(false);}} activeColor="text-purple-500" />
              )}
              {canAccess('chat') && (
                <NavItem icon={<MessageCircle size={20}/>} label="Chat Support" active={activeTab === "chat"} onClick={() => {setActiveTab("chat"); setIsMenuOpen(false);}} activeColor="text-yellow-500" />
              )}
            </nav>

            <button onClick={handleLogout} className="mt-auto flex items-center gap-4 px-6 py-4 text-zinc-600 hover:text-white transition-all font-black text-[10px] tracking-widest">
                <LogIn size={20} className="rotate-180" /> EXIT DASHBOARD
            </button>
          </div>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 w-full relative">
          <header className="md:hidden flex items-center justify-between p-6 bg-[#080808]/90 border-b border-white/5 sticky top-0 z-[100]">
            <span className="font-black text-white tracking-tighter">UCAB.RO</span>
            <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white"><Menu size={24}/></button>
          </header>

          <div className="p-6 md:p-12">
            {activeTab === "global" && canAccess('global') && <UcabGlobal />}
            {activeTab === "food" && canAccess('food') && <UcabFood />}
            {activeTab === "ride" && canAccess('ride') && <UcabRide />}
            {activeTab === "livrator" && canAccess('livrator') && <UcabLivrators />}
            {activeTab === "users" && canAccess('users') && <UcabRiders />}
            {activeTab === "status" && canAccess('status') && <UcabStatusDelivery />}
            {activeTab === "chat" && canAccess('chat') && <UcabChatAdmin />}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- COMPONENTĂ NAV REUTILIZABILĂ ---
function NavItem({ icon, label, active, onClick, activeColor }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-[10px] tracking-widest italic uppercase ${active ? `bg-white/5 ${activeColor} border border-white/5` : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
