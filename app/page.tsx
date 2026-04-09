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
MessageCircle, Users, Bell, Info, Activity 
} from "lucide-react";

export default function UcabSuperDash() {
  const [activeTab, setActiveTab] = useState("global");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userRole, setUserRole] = useState<"ADMIN" | "FOOD" | "SHARE" | null>(null);
  const [mounted, setMounted] = useState(false);
  
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
    if (userRole === 'FOOD') return ['food', 'livrator', 'status', 'chat', 'settings'].includes(tabId);
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
  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 italic uppercase font-sans">
        <div className="w-full max-w-md bg-[#080808] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 overflow-hidden shadow-xl shadow-emerald-500/10">
              <img src="/ucabro.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter italic">UCAB MANAGEMENT</h1>
            <p className="text-[9px] text-zinc-500 mt-2 tracking-widest">Nexus Authorization Terminal</p>
          </div>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="EMAIL ACCESS" 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white font-bold" 
            />
            <input 
              type="password" 
              placeholder="PASSWORD" 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-white font-bold" 
            />
            <button 
              onClick={handleLogin} 
              disabled={authLoading}
              className="w-full py-5 bg-white text-black font-black text-xs tracking-widest rounded-2xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               {authLoading ? <Loader2 className="animate-spin" /> : "ENTER CONSOLE"}
            </button>
          </div>
        </div>
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
                <LogIn size={20} className="rotate-180" /> EXIT SYSTEM
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
