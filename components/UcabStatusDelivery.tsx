"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, MapPin, Store, Clock, Search, 
  TrendingUp, Zap, Bike, Globe, Map as MapIcon, 
  Navigation, BarChart3, ChevronRight, Layers,
  Activity, Target, Users, Cpu
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NexusTacticalCommand() {
  const [orders, setOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fleet");
  
  // GEO-STRATEGIC STATE
  const [geo, setGeo] = useState({
    country: "Romania",
    county: "All",
    city: "All"
  });

  const fetchNexusData = async () => {
    const [oRes, rRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("rides").select("*")
    ]);
    if (oRes.data) setOrders(oRes.data);
    if (rRes.data) setRides(rRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNexusData();
    const channel = supabase.channel('nexus-tactical')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchNexusData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchNexusData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // FILTRARE COMPLEXĂ PE IERARHIE
  const stats = useMemo(() => {
    const filtered = orders.filter(o => {
      const matchCounty = geo.county === "All" || o.delivery_address?.includes(geo.county);
      const matchCity = geo.city === "All" || o.delivery_address?.includes(geo.city);
      return matchCounty && matchCity;
    });

    return {
      filtered,
      revenue: filtered.reduce((a, c) => a + Number(c.total_amount), 0),
      active: filtered.filter(o => o.status !== 'delivered').length,
      efficiency: Math.floor(Math.random() * (99 - 92 + 1) + 92) // Simulat
    };
  }, [orders, geo]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#020202] text-slate-400 font-mono selection:bg-red-500/30 overflow-hidden flex flex-col">
      
      {/* 1. TOP NAV - TACTICAL HUD */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <ShieldCheck className="text-white" size={24} />
             </div>
             <div>
                <h1 className="text-white font-black tracking-tighter text-xl italic uppercase">Nexus<span className="text-red-600">X</span></h1>
                <p className="text-[8px] font-black text-gray-500 tracking-[0.4em] uppercase">Tactical Ops Center</p>
             </div>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          {/* GEO SELECTORS */}
          <nav className="flex gap-2">
             <GeoSelect label="Region" value={geo.county} onChange={(v) => setGeo({...geo, county: v, city: "All"})} options={["All", "Bucuresti", "Cluj", "Timis", "Iasi"]} />
             <GeoSelect label="Node" value={geo.city} onChange={(v) => setGeo({...geo, city: v})} options={["All", "Sector 1", "Sector 3", "Floresti", "Centru"]} disabled={geo.county === "All"} />
          </nav>
        </div>

        <div className="flex items-center gap-8">
           <LiveClock />
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-red-500 animate-pulse">● SYSTEM LIVE</span>
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">{stats.filtered.length} NODES SYNCED</span>
           </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden flex p-6 gap-6">
        
        {/* LEFT COLUMN - DATA FEED */}
        <div className="flex-[2] flex flex-col gap-6">
          
          {/* STATS STRIPS */}
          <div className="grid grid-cols-4 gap-4">
             <StatBox label="Gross Volume" val={`${stats.revenue.toLocaleString()}`} unit="RON" icon={TrendingUp} color="text-white" />
             <StatBox label="Active Ops" val={stats.active} unit="NODES" icon={Zap} color="text-red-500" />
             <StatBox label="Fleet Density" val={rides.length} unit="RIDERS" icon={Bike} color="text-orange-500" />
             <StatBox label="System Health" val={stats.efficiency} unit="%" icon={Activity} color="text-blue-500" />
          </div>

          {/* MAIN TABLE (BENTO STYLE) */}
          <div className="flex-1 bg-[#080808] rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Operations Feed</span>
               </div>
               <div className="flex gap-4">
                  <TabBtn active={activeTab === "fleet"} label="Fleet" onClick={() => setActiveTab("fleet")} />
                  <TabBtn active={activeTab === "orders"} label="Orders" onClick={() => setActiveTab("orders")} />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#080808] z-10">
                  <tr className="text-[9px] uppercase text-gray-500 border-b border-white/5 font-black tracking-widest">
                    <th className="p-5">Node Origin</th>
                    <th className="p-5">Logistic Status</th>
                    <th className="p-5 text-center">Payload</th>
                    <th className="p-5 text-right">Telemetery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {stats.filtered.map(order => (
                    <tr key={order.id} className="hover:bg-white/[0.01] transition-all group cursor-pointer">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:border-red-600/50 transition-colors">
                              <Store size={14} />
                           </div>
                           <div>
                              <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{order.restaurant_name}</p>
                              <p className="text-[8px] text-gray-600 font-bold">{order.id.slice(0,13)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="p-5">
                         <StatusPill status={order.status} />
                      </td>
                      <td className="p-5 text-center">
                         <span className="text-[10px] font-black text-gray-400">{order.items?.length || 0} ITEMS</span>
                      </td>
                      <td className="p-5 text-right">
                         <p className="text-[12px] font-black text-white italic">{order.total_amount} RON</p>
                         <p className="text-[8px] text-gray-600 uppercase">{new Date(order.created_at).toLocaleTimeString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - ANALYTICS HUD */}
        <div className="flex-1 flex flex-col gap-6">
           {/* HEATMAP / ZONE CARD */}
           <div className="bg-red-600/5 border border-red-600/20 rounded-3xl p-6 relative overflow-hidden h-[300px]">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com')]" />
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <Target className="text-red-600" size={18} />
                    <h3 className="text-white font-black uppercase text-[12px] italic tracking-widest">Active Heatmap</h3>
                 </div>
                 <div className="space-y-4">
                    <HeatZone label="București Center" load={88} />
                    <HeatZone label="Cluj West" load={42} />
                    <HeatZone label="Timisoara Hub" load={15} />
                 </div>
                 <div className="mt-8 p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center gap-4">
                    <div className="flex-1">
                       <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Peak Load Zone</p>
                       <p className="text-white text-[10px] font-black uppercase italic">Sector 1, București</p>
                    </div>
                    <Navigation size={18} className="text-red-600 animate-bounce" />
                 </div>
              </div>
           </div>

           {/* SYSTEM LOGS / ANALYTICS */}
           <div className="flex-1 bg-[#080808] rounded-3xl border border-white/5 p-6 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <Cpu className="text-blue-500" size={18} />
                 <h3 className="text-white font-black uppercase text-[12px] italic tracking-widest">Nexus Logs</h3>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto text-[9px] font-bold">
                 {orders.slice(0,10).map((o, i) => (
                   <div key={i} className="flex gap-3 text-gray-500 border-l border-white/10 pl-3">
                      <span className="text-red-900">[{new Date(o.created_at).toLocaleTimeString()}]</span>
                      <span className="text-gray-400">NODE_{o.id.slice(0,4)}</span>
                      <span className="text-white/40 italic">TRANSITION TO {o.status.toUpperCase()}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function GeoSelect({ label, value, onChange, options, disabled = false }: any) {
  return (
    <div className={`flex flex-col gap-1 transition-opacity ${disabled ? 'opacity-30' : 'opacity-100'}`}>
      <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest ml-1">{label}</span>
      <select 
        disabled={disabled}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white outline-none focus:border-red-600 transition-all uppercase cursor-pointer"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function StatBox({ label, val, unit, icon: Icon, color }: any) {
  return (
    <div className="bg-[#080808] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.02] transition-all">
      <div>
        <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className={`text-xl font-black italic tracking-tighter ${color}`}>{val} <span className="text-[8px] opacity-30 font-mono tracking-normal ml-1">{unit}</span></p>
      </div>
      <div className={`p-3 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}><Icon size={16}/></div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: any = {
    pending: "text-red-500 bg-red-500/10 border-red-500/20",
    cooking: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    ready: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    delivery: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    delivered: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border tracking-tighter ${colors[status] || 'text-gray-500'}`}>
      {status}
    </span>
  );
}

function HeatZone({ label, load }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[9px] font-black text-white uppercase italic">{label}</span>
        <span className="text-[9px] font-bold text-red-600">{load}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${load}%` }} className="h-full bg-red-600 shadow-[0_0_10px_red]" />
      </div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${active ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-400'}`}
    >
      {label}
    </button>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-right">
       <p className="text-[10px] font-black text-white tracking-tighter tabular-nums">{time.toLocaleTimeString()}</p>
       <p className="text-[7px] font-bold text-gray-600 uppercase">{time.toLocaleDateString()}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#020202] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-2">
         <p className="text-red-600 font-mono text-[10px] tracking-[1em] animate-pulse italic uppercase">Nexus Initializing</p>
         <p className="text-gray-600 font-mono text-[8px] uppercase tracking-widest">Global Ops Node v4.2.1</p>
      </div>
    </div>
  );
}
