"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import UcabFood from "@/components/UcabFood";
import UcabRide from "@/components/UcabRide";
import UcabLivrators from "@/components/UcabLivrators";
import { 
  Utensils, Car, Truck, LayoutGrid, Zap, 
  ChevronRight, Bell, Menu, X, Activity, 
  Settings, ShieldCheck, Lock, LogIn, User, ArrowLeft, Loader2,
  Bike, MessageCircle, Users 
} from "lucide-react";

export default function UcabSuperDash() {
  const [activeTab, setActiveTab] = useState("global");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [lang, setLang] = useState<"ro" | "en">("ro");
  const [mounted, setMounted] = useState(false);
   const APP_DASH_VERSION="0.9.13";
  // --- DATE LOGARE REALE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificare sesiune la refresh
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsLogged(true);
    };
    checkSession();
  }, []);

  if (!mounted) return null;

  // --- LOGICĂ LOGIN REALA ---
  async function handleLogin() {
    if (!email || !password) return alert("Introdu Email și Parolă");
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("EROARE: " + error.message);
    } else {
      setIsLogged(true);
    }
    setAuthLoading(false);
  }

  // --- LOGICĂ LOGOUT REALA ---
  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLogged(false);
  }

  const themes: any = {
    global: { color: "text-blue-500", bg: "bg-blue-600", border: "border-blue-500/20" },
    food: { color: "text-red-500", bg: "bg-red-600", border: "border-red-500/20" },
    ride: { color: "text-blue-500", bg: "bg-blue-600", border: "border-blue-500/20" },
    util: { color: "text-emerald-500", bg: "bg-emerald-600", border: "border-emerald-500/20" },
    livrator: { color: "text-orange-500", bg: "bg-orange-600", border: "border-orange-500/20" },
    status: { color: "text-purple-500", bg: "bg-purple-600", border: "border-purple-500/20" },
    chat: { color: "text-yellow-500", bg: "bg-yellow-600", border: "border-yellow-500/20" },
    users: { color: "text-pink-500", bg: "bg-pink-600", border: "border-pink-500/20" },
    settings: { color: "text-zinc-400", bg: "bg-zinc-800", border: "border-white/10" }
  };

  const cur = themes[activeTab] || themes.global;

  const t = {
    ro: { login: "DASHBOARD ucab", start: "login ", user: "Utilizator", pass: "Parolă", global: "Global", food: "Food", ride: "Ride", util: "Logistics", settings: "Setări", logout: "Ieșire", back: "Înapoi la Global" },
    en: { login: "Admin Login", start: "Enter Console", user: "Username", pass: "Password", global: "Global", food: "Food", ride: "Ride", util: "Logistics", settings: "Settings", logout: "Logout", back: "Back to Global" }
  };

  // --- ECRAN DE LOGARE ---
  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 font-sans italic uppercase text-white">
        <div className="w-full max-w-md bg-[#080808] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20 overflow-hidden">
              <img 
                src="/ucabro.png" 
                alt="UCAB Logo" 
                className="w-10 h-10 object-contain" 
              />
            </div>

            <h1 className="text-3xl font-black text-white tracking-tighter italic">{t[lang].login}</h1>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder={t[lang].user} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" 
            />
            <input 
              type="password" 
              placeholder={t[lang].pass} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" 
            />
            <button 
              onClick={handleLogin} 
              disabled={authLoading}
              className="w-full py-5 bg-white text-black font-black text-xs tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 italic uppercase disabled:opacity-50"
            >
               {authLoading ? <Loader2 className="animate-spin" /> : t[lang].start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUBCOMPONENTA NAV ---
  function NavItem({ icon, label, active, onClick, activeColor }: any) {
    return (
      <button 
        onClick={onClick}
        className={`
          w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm tracking-widest italic uppercase
          ${active ? `bg-white/5 ${activeColor}` : "text-zinc-500 hover:bg-white/5 hover:text-white"}
        `}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-400 font-sans selection:bg-white selection:text-black italic uppercase">
      
      {/* HEADER MOBIL */}
      <header className="md:hidden flex items-center justify-between p-6 bg-[#080808]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${cur.bg} rounded flex items-center justify-center text-white font-black italic`}>U.</div>
          <span className="font-black italic text-white tracking-tighter">UCAB.ro</span>
          
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="p-2 text-white bg-white/5 rounded-xl border border-white/10">
          <Menu size={28} />
        </button>
      </header>

      <div className="flex min-h-screen relative">
        
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 w-72 bg-[#080808] border-r border-white/5 p-8 z-[200] transition-transform duration-500
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${isMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}>
          <div className="flex flex-col h-full italic">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${cur.bg} rounded flex items-center justify-center text-white font-black text-xl shadow-lg`}>U.</div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-white tracking-tighter">UCAB.ro</span>
                  <span className={`text-[9px] font-bold ${cur.color} tracking-widest mt-1`}>dashboard V {APP_DASH_VERSION} </span>

                </div>

              </div>
              <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-white"><X size={24} /></button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-black text-zinc-600 tracking-[0.3em] mb-6 px-4">Consolă</p>
              <NavItem icon={<LayoutGrid size={20}/>} label={t[lang].global} active={activeTab === "global"} onClick={() => {setActiveTab("global"); setIsMenuOpen(false);}} activeColor={cur.color} />
              <NavItem icon={<Utensils size={20}/>} label={t[lang].food} active={activeTab === "food"} onClick={() => {setActiveTab("food"); setIsMenuOpen(false);}} activeColor="text-red-500" />
              <NavItem icon={<Car size={20}/>} label={t[lang].ride} active={activeTab === "ride"} onClick={() => {setActiveTab("ride"); setIsMenuOpen(false);}} activeColor="text-blue-500" />
              <NavItem icon={<Truck size={20}/>} label={t[lang].util} active={activeTab === "util"} onClick={() => {setActiveTab("util"); setIsMenuOpen(false);}} activeColor="text-emerald-500" />
              
              {/* RUBRICILE NOI IN NAVIGARE */}
              <div className="pt-4 mt-4 border-t border-white/5 opacity-80">
                 <NavItem icon={<Bike size={20}/>} label="LIVRATOR" active={activeTab === "livrator"} onClick={() => {setActiveTab("livrator"); setIsMenuOpen(false);}} activeColor="text-orange-500" />
                 <NavItem icon={<Activity size={20}/>} label="STATUS" active={activeTab === "status"} onClick={() => {setActiveTab("status"); setIsMenuOpen(false);}} activeColor="text-purple-500" />
                 <NavItem icon={<MessageCircle size={20}/>} label="CHAT" active={activeTab === "chat"} onClick={() => {setActiveTab("chat"); setIsMenuOpen(false);}} activeColor="text-yellow-500" />
                 <NavItem icon={<Users size={20}/>} label="USERI" active={activeTab === "users"} onClick={() => {setActiveTab("users"); setIsMenuOpen(false);}} activeColor="text-pink-500" />
              </div>
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
              <NavItem icon={<Settings size={18}/>} label={t[lang].settings} active={activeTab === "settings"} onClick={() => {setActiveTab("settings"); setIsMenuOpen(false);}} activeColor="text-white" />
              <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-500/5 rounded-2xl transition-all font-bold text-sm tracking-widest italic uppercase">
                <ShieldCheck size={18} /> {t[lang].logout}
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 bg-[#020202]">
          <div className="p-8 md:p-16 max-w-7xl mx-auto">
            
            <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-6">

                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 italic leading-none">admin dashboard</span>
                </div>
                <h1 className="text-6xl md:text-9xl font-black italic text-white uppercase tracking-tighter leading-none transition-all">
                  {activeTab}
                </h1>
              </div>
              {activeTab !== "global" && (
                <button onClick={() => setActiveTab("global")} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white hover:text-black transition-all">
                  <ArrowLeft size={16}/> {t[lang].back}
                </button>
              )}
            </div>

            {/* RENDER LOGIC PENTRU TOATE RUBRICILE */}
            <div className="mt-10">
              {activeTab === "food" && <UcabFood />}
              {activeTab === "ride" && <UcabRide />}
              
              {/* PLACEHOLDERS PENTRU MODULELE NOI */}
              {activeTab === "livrator" && (
               <UcabLivrators/>
              )}
              {activeTab === "status" && (
                <div className="min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-zinc-800 italic font-black uppercase tracking-widest">
                  SYSTEM_HEALTH_MONITOR_OFFLINE
                </div>
              )}
              {activeTab === "chat" && (
                <div className="min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-zinc-800 italic font-black uppercase tracking-widest">
                  ENCRYPTED_CHAT_WAITING_AUTH
                </div>
              )}
              {activeTab === "users" && (
                <div className="min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-zinc-800 italic font-black uppercase tracking-widest">
                  USER_MANAGEMENT_SYNC_REQUIRED
                </div>
              )}

              {activeTab === "global" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="p-8 bg-[#080808] border border-white/5 rounded-[2rem]">
                      <Activity className="text-blue-500 mb-4" />
                      <p className="text-xs font-bold tracking-widest text-white">SISTEM UCAB ACTIV</p>
                      <p className="text-[10px] text-zinc-600 mt-2 tracking-widest italic">STREAMING_LIVE_DATA_CONNECTED</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
