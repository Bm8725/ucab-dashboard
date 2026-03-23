"use client";
import { useState, useEffect } from "react";
import UcabFood from "@/components/UcabFood";
import { 
  Utensils, Car, Truck, LayoutGrid, Zap, 
  ChevronRight, Bell, Menu, X, Activity, 
  Settings, ShieldCheck, Lock, LogIn, User, ArrowLeft
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
    ro: { login: "Autentificare Admin", start: "Intră în Consolă", user: "Utilizator", pass: "Parolă", global: "Global", food: "Food", ride: "Ride", util: "Logistics", settings: "Setări", logout: "Ieșire", back: "Înapoi la Global" },
    en: { login: "Admin Login", start: "Enter Console", user: "Username", pass: "Password", global: "Global", food: "Food", ride: "Ride", util: "Logistics", settings: "Settings", logout: "Logout", back: "Back to Global" }
  };

  // --- ECRAN DE LOGARE ---
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
          </div>
          <div className="space-y-4">
            <input type="text" placeholder={t[lang].user} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" />
            <input type="password" placeholder={t[lang].pass} className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white font-bold" />
            <button onClick={() => setIsLogged(true)} className="w-full py-5 bg-white text-black font-black text-xs tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 italic uppercase">
               {t[lang].start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-400 font-sans selection:bg-white selection:text-black italic uppercase">
      
      {/* HEADER MOBIL */}
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
        
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 w-72 bg-[#080808] border-r border-white/5 p-8 z-[200] transition-transform duration-500
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${isMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}>
          <div className="flex flex-col h-full italic">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${cur.bg} rounded flex items-center justify-center text-white font-black text-xl shadow-lg`}>U</div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-white tracking-tighter">UCAB</span>
                  <span className={`text-[9px] font-bold ${cur.color} tracking-widest mt-1`}>SuperApp</span>
                </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-white"><X size={24} /></button>
            </div>

            <nav className="flex-1 space-y-2">
              <p className="text-[10px] font-black text-zinc-600 tracking-[0.3em] mb-6 px-4">Consolă</p>
              <NavItem icon={<LayoutGrid size={20}/>} label={t[lang].global} active={activeTab === "global"} onClick={() => {setActiveTab("global"); setIsMenuOpen(false);}} activeColor={cur.color} />
              <NavItem icon={<Utensils size={20}/>} label={t[lang].food} active={activeTab === "food"} onClick={() => {setActiveTab("food"); setIsMenuOpen(false);}} activeColor="text-red-500" />
              <NavItem icon={<Car size={20}/>} label={t[lang].ride} active={activeTab === "ride"} onClick={() => {setActiveTab("ride"); setIsMenuOpen(false);}} activeColor="text-blue-500" />
              <NavItem icon={<Truck size={20}/>} label={t[lang].util} active={activeTab === "util"} onClick={() => {setActiveTab("util"); setIsMenuOpen(false);}} activeColor="text-emerald-500" />
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
              <NavItem icon={<Settings size={18}/>} label={t[lang].settings} active={activeTab === "settings"} onClick={() => {setActiveTab("settings"); setIsMenuOpen(false);}} activeColor="text-white" />
              <button onClick={() => setIsLogged(false)} className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-500/5 rounded-2xl transition-all font-bold text-sm tracking-widest italic uppercase">
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
                  <Zap size={16} className={`${cur.color} fill-current animate-bounce`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 italic leading-none">Live Console Stream</span>
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

            {/* RENDER LOGIC */}
            <div className="mt-10">
              {/* VIZUALIZARE GLOBALĂ */}
              {activeTab === "global" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                  <FleetCard title="Food" stats="42" color="text-red-500" border="hover:border-red-500/40" icon={<Utensils size={36}/>} onClick={() => setActiveTab("food")} />
                  <FleetCard title="Ride" stats="18" color="text-blue-500" border="hover:border-blue-500/40" icon={<Car size={36}/>} onClick={() => setActiveTab("ride")} />
                  <FleetCard title="Util" stats="05" color="text-emerald-500" border="hover:border-emerald-500/40" icon={<Truck size={36}/>} onClick={() => setActiveTab("util")} />
                </div>
              )}

              {/* PAGINĂ FOOD (ROȘIE) */}
              {activeTab === "food" && (
                <div className="animate-in slide-in-from-bottom-5 duration-500">
                   <div className="p-10 bg-red-600/5 border border-red-600/20 rounded-[3rem] min-h-[400px]">
                      <h2 className="text-3xl font-black text-red-500 mb-6 uppercase italic tracking-tighter">Administrare Food</h2>
                      {/* food /> */}
                      <UcabFood />
                   </div>
                </div>
              )}

              {/* PAGINĂ RIDE (ALBASTRĂ) */}
              {activeTab === "ride" && (
                <div className="animate-in slide-in-from-bottom-5 duration-500">
                   <div className="p-10 bg-blue-600/5 border border-blue-600/20 rounded-[3rem] min-h-[400px]">
                      <h2 className="text-3xl font-black text-blue-500 mb-6 uppercase italic tracking-tighter">Administrare Ride</h2>
                      {/* Aici vei pune componenta <RideManager /> */}
                      <p className="text-zinc-600 italic uppercase font-bold text-xs tracking-widest">Aici pui harta live si lista de soferi.</p>
                   </div>
                </div>
              )}

              {/* PAGINĂ LOGISTICS (VERDE) */}
              {activeTab === "util" && (
                <div className="animate-in slide-in-from-bottom-5 duration-500">
                   <div className="p-10 bg-emerald-600/5 border border-emerald-600/20 rounded-[3rem] min-h-[400px]">
                      <h2 className="text-3xl font-black text-emerald-500 mb-6 uppercase italic tracking-tighter">Administrare Logistics</h2>
                      {/* Aici vei pune componenta <UtilManager /> */}
                      <p className="text-zinc-600 italic uppercase font-bold text-xs tracking-widest">Aici pui managementul de marfă și utilaje.</p>
                   </div>
                </div>
              )}

              {/* PAGINĂ SETĂRI */}
              {activeTab === "settings" && (
                <div className="bg-[#080808] border border-white/5 rounded-[3rem] p-10 max-w-2xl animate-in zoom-in-95 duration-500">
                  <h3 className="text-2xl font-black text-white mb-8 tracking-tighter">Setări Sistem</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 mb-1 tracking-widest uppercase italic leading-none">Limbă / Language</p>
                        <p className="text-white font-black">{lang === "ro" ? "Română" : "English"}</p>
                      </div>
                      <button onClick={() => setLang(lang === "ro" ? "en" : "ro")} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic">Schimbă</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] md:hidden" />}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, activeColor }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 transition-all border-l-4 ${active ? `bg-white/5 text-white border-white` : `text-zinc-600 border-transparent hover:text-white hover:bg-white/[0.02]`}`}>
      <span className={active ? activeColor : ""}>{icon}</span>
      <span className="font-bold text-sm uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

function FleetCard({ title, stats, color, icon, onClick, border }: any) {
  return (
    <div onClick={onClick} className={`group bg-[#080808] border border-white/5 p-12 rounded-[3.5rem] ${border} transition-all duration-500 cursor-pointer h-96 flex flex-col justify-between`}>
      <div className="flex justify-between items-start">
        <div className={`p-6 bg-white/5 rounded-2xl border border-white/5 ${color} group-hover:scale-110 transition-all leading-none`}>{icon}</div>
        <ChevronRight size={24} className="text-zinc-800 group-hover:text-white transition-transform" />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600 italic mb-2 leading-none">UCAB {title}</p>
        <div className="flex items-baseline gap-4 leading-none italic"><span className="text-8xl md:text-9xl font-black text-white tracking-tighter">{stats}</span><span className={`text-xs font-black ${color} animate-pulse`}>LIVE</span></div>
      </div>
    </div>
  );
}
