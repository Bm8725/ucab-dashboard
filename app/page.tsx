"use client";
import { useState, useEffect } from "react";
import { 
  Utensils, Car, Truck, LayoutGrid, Zap, 
  ChevronRight, Bell, Menu, X, Activity, 
  Settings, ShieldCheck, Lock, LogIn, User
} from "lucide-react";

export default function UcabSuperDash() {
  const [activeTab, setActiveTab] = useState("global");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [lang, setLang] = useState<"ro" | "en">("ro");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const themes: any = {
    global: { color: "text-blue-500", bg: "bg-blue-600", border: "border-blue-500/20" },
    food: { color: "text-red-500", bg: "bg-red-600", border: "border-red-500/20" },
    ride: { color: "text-blue-500", bg: "bg-blue-600", border: "border-blue-500/20" },
    util: { color: "text-emerald-500", bg: "bg-emerald-600", border: "border-emerald-500/20" },
    settings: { color: "text-zinc-400", bg: "bg-zinc-800", border: "border-white/10" }
  };

  const cur = themes[activeTab] || themes.global;

  const t = {
    ro: { login: "Autentificare Admin", start: "Intră în Consolă", user: "Utilizator", pass: "Parolă", global: "Global", food: "Food", ride: "Ride", util: "Logistică", settings: "Setări", logout: "Ieșire" },
    en: { login: "Admin Login", start: "Enter Console", user: "Username", pass: "Password", global: "Global", food: "Food", ride: "Ride", util: "Logistics", settings: "Settings", logout: "Logout" }
  };

  // --- ECRAN DE LOGARE (MODAL) ---
  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 font-sans italic uppercase">
        <div className="w-full max-w-md bg-[#080808] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-600/20">
              <Lock size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">{t[lang].login}</h1>
            <p className="text-zinc-600 text-[10px] font-bold mt-2 tracking-[0.3em]">UCAB Central Security</p>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder={t[lang].user} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" />
            <input type="password" placeholder={t[lang].pass} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" />
            <button onClick={() => setIsLogged(true)} className="w-full py-5 bg-white text-black font-black text-xs tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3">
              <LogIn size={18} /> {t[lang].start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-400 font-sans selection:bg-white selection:text-black italic uppercase">
      
      {/* --- HEADER MOBIL (FIXED) --- */}
      <header className="md:hidden flex items-center justify-between p-6 bg-[#080808]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${cur.bg} rounded flex items-center justify-center text-white font-black italic`}>U</div>
          <span className="font-black italic text-white tracking-tighter">UCAB</span>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="p-2 text-white bg-white/5 rounded-xl border border-white/10">
          <Menu size={28} />
        </button>
      </header>

      <div className="flex min-h-screen relative">
        
        {/* --- SIDEBAR --- */}
        <aside className={`
          fixed inset-y-0 left-0 w-72 bg-[#080808] border-r border-white/5 p-8 z-[200] transition-transform duration-500
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="flex flex-col h-full italic">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${cur.bg} rounded flex items-center justify-center text-white font-black text-xl shadow-lg transition-colors`}>U</div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-white tracking-tighter leading-none">UCAB</span>
                  <span className={`text-[9px] font-bold ${cur.color} tracking-widest mt-1`}>SuperApp</span>
                </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-white"><X size={24} /></button>
            </div>

            <nav className="flex-1 space-y-2">
              <p className="text-[10px] font-black text-zinc-600 tracking-[0.3em] mb-6 px-4">Console</p>
              <NavItem icon={<LayoutGrid size={20}/>} label={t[lang].global} active={activeTab === "global"} onClick={() => {setActiveTab("global"); setIsMenuOpen(false);}} activeColor={cur.color} />
              <NavItem icon={<Utensils size={20}/>} label={t[lang].food} active={activeTab === "food"} onClick={() => {setActiveTab("food"); setIsMenuOpen(false);}} activeColor="text-red-500" />
              <NavItem icon={<Car size={20}/>} label={t[lang].ride} active={activeTab === "ride"} onClick={() => {setActiveTab("ride"); setIsMenuOpen(false);}} activeColor="text-blue-500" />
              <NavItem icon={<Truck size={20}/>} label={t[lang].util} active={activeTab === "util"} onClick={() => {setActiveTab("util"); setIsMenuOpen(false);}} activeColor="text-emerald-500" />
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
              <NavItem icon={<Settings size={18}/>} label={t[lang].settings} active={activeTab === "settings"} onClick={() => {setActiveTab("settings"); setIsMenuOpen(false);}} activeColor="text-white" />
              <button onClick={() => setIsLogged(false)} className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-500/5 rounded-2xl transition-all">
                <ShieldCheck size={18} /> <span className="font-bold text-sm tracking-widest">{t[lang].logout}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 min-w-0 bg-[#020202]">
          <div className="p-8 md:p-16 max-w-7xl mx-auto">
            
            {/* HERO TITLE */}
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={16} className={`${cur.color} fill-current animate-bounce`} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">Live Stream Console</span>
              </div>
              <h1 className="text-6xl md:text-9xl font-black italic text-white uppercase tracking-tighter leading-none mb-12">
                {activeTab}
              </h1>
            </div>

            {/* RENDER LOGIC */}
            {activeTab === "global" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <FleetCard title="Food" stats="42" color="text-red-500" border="hover:border-red-500/40" icon={<Utensils size={36}/>} onClick={() => setActiveTab("food")} />
                <FleetCard title="Ride" stats="18" color="text-blue-500" border="hover:border-blue-500/40" icon={<Car size={36}/>} onClick={() => setActiveTab("ride")} />
                <FleetCard title="Util" stats="05" color="text-emerald-500" border="hover:border-emerald-500/40" icon={<Truck size={36}/>} onClick={() => setActiveTab("util")} />
              </div>
            ) : activeTab === "settings" ? (
              <div className="bg-[#080808] border border-white/5 rounded-[3rem] p-10 md:p-16 animate-in fade-in zoom-in-95 duration-500">
                <h3 className="text-3xl font-black text-white mb-10 tracking-tighter">{t[lang].settings}</h3>
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 mb-1 tracking-widest uppercase">Select Language / Limba</p>
                      <p className="text-white font-black">{lang === "ro" ? "Română" : "English"}</p>
                    </div>
                    <button onClick={() => setLang(lang === "ro" ? "en" : "ro")} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase">Change</button>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 mb-1 tracking-widest uppercase">Admin Profile</p>
                      <p className="text-white font-black italic">Marius B. (brainmap)</p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-500"><User size={24}/></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/10 rounded-[4rem] animate-in zoom-in-95 duration-500">
                <Activity size={64} className={`${cur.color} mb-8 animate-pulse`} />
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Module Locked</h2>
                <button onClick={() => setActiveTab("global")} className="px-12 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl">Back to Global</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* OVERLAY MOBIL */}
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] md:hidden" />}
    </div>
  );
}

// --- UI HELPERS ---
function NavItem({ icon, label, active, onClick, activeColor }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 transition-all border-l-4 ${active ? `bg-white/5 text-white border-white` : `text-zinc-600 border-transparent hover:text-white hover:bg-white/[0.02]`}`}>
      <span className={active ? activeColor : ""}>{icon}</span>
      <span className="font-bold text-sm uppercase tracking-widest">{label}</span>
    </button>
  );
}

function FleetCard({ title, stats, color, icon, onClick, border }: any) {
  return (
    <div onClick={onClick} className={`group relative bg-[#080808] border border-white/5 p-12 rounded-[3.5rem] ${border} transition-all duration-500 cursor-pointer h-96 flex flex-col justify-between`}>
      <div className="flex justify-between items-start">
        <div className={`p-6 bg-white/5 rounded-2xl border border-white/5 ${color} group-hover:scale-110 transition-all duration-500`}>{icon}</div>
        <ChevronRight size={24} className="text-zinc-800 group-hover:text-white transition-transform" />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-2 tracking-tighter">UCAB {title}</p>
        <div className="flex items-baseline gap-4 leading-none"><span className="text-8xl md:text-9xl font-black text-white tracking-tighter leading-none">{stats}</span><span className={`text-xs font-black ${color} italic animate-pulse`}>LIVE</span></div>
      </div>
    </div>
  );
}
