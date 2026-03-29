"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Bike, Phone, User, Store, X, 
  CheckCircle2, Clock, MapPin, Package, 
  UtensilsCrossed, Calendar, ChevronRight
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UcabFoodManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    const [oRes, rRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("rides").select("*")
    ]);
    if (oRes.data) setOrders(oRes.data);
    if (rRes.data) setRides(rRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('ucab-ops-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let res = orders;
    if (activeTab !== "all") res = res.filter(o => o.status === activeTab);
    if (searchQuery) {
      res = res.filter(o => 
        o.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return res;
  }, [orders, activeTab, searchQuery]);

  const updateStatus = async (id: string, s: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));
    if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status: s });
    await supabase.from("orders").update({ status: s }).eq("id", id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-red-600 text-white font-black italic animate-pulse">UCAB_LOADING...</div>;

  return (
    <div className="h-screen bg-[#F9FAFB] flex flex-col font-sans text-slate-900 overflow-hidden">
      
      {/* HEADER GESTIUNE */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
              <UtensilsCrossed size={20} />
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase italic">Ucab<span className="text-red-600">-Food</span></h1>
          </div>

          <nav className="flex gap-2">
            {["all", "pending", "ready", "delivery"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {tab} {tab === 'all' ? stats.total : orders.filter(o => o.status === tab).length}
              </button>
            ))}
          </nav>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Cauta restaurant sau client..." 
            className="pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl text-xs w-72 focus:bg-white focus:ring-2 focus:ring-red-100 outline-none border border-transparent transition-all"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        
        {/* TABEL COMENZI */}
        <section className="flex-[1.6] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {filteredOrders.map(order => {
            const ride = rides.find(r => r.delivery_id === order.id);
            return (
              <motion.div 
                layoutId={order.id} key={order.id} onClick={() => setSelectedOrder(order)}
                className={`bg-white p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between shadow-sm ${selectedOrder?.id === order.id ? 'border-red-600' : 'border-transparent hover:border-red-50'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Package size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">{order.restaurant_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{order.id.slice(0,8)} • {new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <Bike size={18} className={ride ? 'text-red-600 animate-bounce' : 'text-slate-200'} />
                    <span className="text-[8px] font-black uppercase mt-1 text-slate-400">{ride ? ride.status : 'Cautare Rider'}</span>
                  </div>
                  <div className="text-right min-w-[90px]">
                    <p className="font-black text-lg text-red-600 italic leading-none mb-1">{order.total_amount} RON</p>
                    <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full uppercase italic tracking-tighter">{order.status}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* PANOU PROGRES & DETALII */}
        <aside className="flex-1 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                  <h2 className="font-black text-xl italic text-red-600 uppercase">Management Flux</h2>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10">
                  
                  {/* TIMELINE PROGRESS (Puncte si Linii) */}
                  <div className="relative pl-8 space-y-10">
                    <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-slate-100" />
                    
                    <TimelineStep 
                      active={true} 
                      label="Comanda Receptionata" 
                      time={new Date(selectedOrder.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                    />
                    <TimelineStep 
                      active={['ready', 'delivery', 'delivered'].includes(selectedOrder.status)} 
                      label="Pregatire in Restaurant" 
                    />
                    <TimelineStep 
                      active={['delivery', 'delivered'].includes(selectedOrder.status)} 
                      label="Preluata de Rider" 
                      icon={Bike}
                      isAlert={selectedOrder.status === 'ready' && !rides.find(r => r.delivery_id === selectedOrder.id)}
                    />
                    <TimelineStep 
                      active={selectedOrder.status === 'delivered'} 
                      label="Livrare Finalizata" 
                      icon={CheckCircle2}
                      isLast 
                    />
                  </div>

                  {/* INFO CONTACT */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    <DetailRow label="Client" val={selectedOrder.customer_name} icon={User} />
                    <DetailRow label="Telefon" val={selectedOrder.customer_phone} icon={Phone} />
                    <DetailRow label="Adresa Livrare" val={selectedOrder.delivery_address} icon={MapPin} />
                  </div>
                </div>

                {/* BUTOANE STATUS */}
                <div className="pt-8 border-t border-slate-100 space-y-3">
                  <button 
                    onClick={() => updateStatus(selectedOrder.id, 'ready')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> Comanda este Gata
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                  >
                    Finalizeaza Comanda
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 italic">
                <Store size={48} className="mb-4 text-slate-400" />
                <p className="font-black text-xs uppercase tracking-widest">Asteptare Selectie Nod</p>
              </div>
            )}
          </AnimatePresence>
        </aside>
      </main>
    </div>
  );
}

// TIMELINE COMPONENT
function TimelineStep({ active, label, time, icon: Icon = Clock, isLast, isAlert }: any) {
  return (
    <div className="relative flex items-start gap-4">
      <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all duration-700 ${active ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
        <Icon size={14} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <p className={`text-xs font-black uppercase italic ${active ? 'text-slate-800' : 'text-slate-300'}`}>{label}</p>
          {time && <span className="text-[10px] font-bold text-red-500/40">{time}</span>}
        </div>
        {isAlert && active && <p className="text-[8px] text-red-600 font-bold uppercase mt-1 animate-pulse tracking-tighter italic">Niciun Rider Alocat la aceasta ora</p>}
      </div>
    </div>
  );
}



// INFO ROW COMPONENT
function DetailRow({ label, val, icon: Icon }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm shrink-0 border border-slate-50"><Icon size={14}/></div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="font-bold text-sm text-slate-700 leading-tight">{val || "Nespecificat"}</p>
      </div>
    </div>
  );
}
