"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import AppSupportWidget from "@/components/AppSupportWidget";
import { MapPin, Phone, Copy, Clock, Calendar, ChevronLeft, ChevronRight, Printer, Eye, EyeOff, Navigation, Volume2 } from "lucide-react";

export default function RestaurantLiveDash() {
  const params = useParams();
  const id = params.id;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const ordersPerPage = 6;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/notify.wav");
    audioRef.current.preload = "auto";

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioEnabled(true);
        }).catch(() => {});
        window.removeEventListener('click', unlockAudio);
      }
    };
    window.addEventListener('click', unlockAudio);

    if (!id) return;
    async function getData() {
      const { data: res } = await supabase.from("restaurants").select("*").eq("id", id).single();
      setRestaurant(res);
      if (res) {
        const { data: ord } = await supabase.from("orders").select("*").eq("restaurant_id", id);
        setOrders(ord || []);
        const { data: menu } = await supabase.from("menu_items").select("*").eq("restaurant_id", id).order('name', { ascending: true });
        setMenuItems(menu || []);
      }
      setLoading(false);
    }
    getData();

    const channel = supabase.channel(`live-sync-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload: any) => {
        if (payload.new.restaurant_id === id) {
          setOrders((prev) => [payload.new, ...prev]);
          if (audioRef.current) {
            audioRef.current.load();
            setTimeout(() => { audioRef.current?.play().catch(() => {}); }, 100);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload: any) => {
        setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); window.removeEventListener('click', unlockAudio); };
  }, [id]);

  // FUNCTIE PRINT PROFESIONALA (FARA URL AIUREA)
  const printReceipt = (order: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const content = `
      <html>
        <body style="font-family: 'Courier New', Courier, monospace; width: 280px; padding: 10px; text-transform: uppercase;">
          <div style="text-align: center;">
            <h2 style="margin: 0;">UCAB FOOD</h2>
            <p style="margin: 5px 0; font-size: 14px;">${restaurant?.name}</p>
            <p style="font-size: 10px;">${new Date(order.created_at).toLocaleString('ro-RO')}</p>
          </div>
          <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
          <div style="font-size: 12px; margin-bottom: 10px;">
            <strong>CLIENT:</strong> ${order.customer_name}<br>
            <strong>TEL:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>ADR:</strong> ${order.delivery_address || 'RIDICARE'}
          </div>
          <div style="border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
          ${order.items.map((i: any) => `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
              <span>${i.quantity}x ${i.name}</span>
              <span>${i.price}L</span>
            </div>
          `).join('')}
          <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <span>TOTAL:</span>
            <span>${order.total_amount} RON</span>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 10px;">*** VA MULTUMIM! ***</div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    await supabase.from("menu_items").update({ is_available: !currentStatus }).eq("id", itemId);
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: !currentStatus } : i));
  };

  const filteredOrders = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    let res = orders.filter(o => {
      const oDate = new Date(o.created_at).getTime();
      if (dateFilter === 'today') return oDate >= today;
      if (dateFilter === 'yesterday') return oDate >= yesterday && oDate < today;
      return true;
    });
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, dateFilter]);

  const currentOrders = filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  if (loading) return <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em] px-6 text-center">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-4 md:p-12 font-sans italic uppercase font-black flex flex-col overflow-x-hidden">
      
      {!audioEnabled && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-full text-[10px] animate-bounce flex items-center gap-2 shadow-xl border-2 border-white">
          <Volume2 size={14} /> CLICK PENTRU AUDIO ACTIV
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <img src="/ucabfood.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <span className="text-[12px] md:text-[10px] tracking-[0.4em] uppercase text-zinc-400">UCAB.RO / ROMANIA</span>
      </div>

      <header className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row justify-between items-center mb-10 bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-4 border-red-600 gap-8">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img src={restaurant?.image_url} className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] object-cover shadow-xl ring-8 ring-[#FDFCF7]" alt="" />
          <div>
            <h1 className="text-4xl md:text-7xl tracking-tighter leading-none mb-1">UCAB <span className="text-red-600">FOOD</span></h1>
            <p className="text-xl md:text-2xl text-zinc-800 font-black leading-none">{restaurant?.name}</p>
            <p className="text-[10px] text-red-600 mt-2 flex items-center justify-center md:justify-start gap-1 font-bold italic"><MapPin size={12}/> {restaurant?.address || "LOCAȚIE UCAB"}</p>
          </div>
        </div>
        <div className="flex gap-8 border-l-2 border-zinc-100 pl-10 hidden md:flex">
          <div className="text-center">
            <p className="text-[8px] text-zinc-400 mb-1 tracking-widest uppercase">Live</p>
            <p className="text-6xl text-red-600 font-black leading-none">{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-zinc-400 mb-1 tracking-widest uppercase">Revenue</p>
            <p className="text-6xl text-zinc-900 font-black leading-none">{orders.reduce((a, c) => a + Number(c.total_amount), 0).toFixed(0)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <nav className="flex gap-6 md:gap-10 border-b-2 border-zinc-100 w-full md:w-auto">
          <button onClick={() => {setActiveTab('orders'); setCurrentPage(1);}} className={`pb-4 text-xs tracking-[0.3em] transition-all ${activeTab === 'orders' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>COMENZI</button>
          <button onClick={() => setActiveTab('menu')} className={`pb-4 text-xs tracking-[0.3em] transition-all ${activeTab === 'menu' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>MENIU</button>
        </nav>
        {activeTab === 'orders' && (
          <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-zinc-100">
            {['today', 'yesterday', 'all'].map((f) => (
              <button key={f} onClick={() => {setDateFilter(f as any); setCurrentPage(1);}} className={`px-4 py-2 rounded-xl text-[9px] tracking-widest transition-all ${dateFilter === f ? 'bg-red-600 text-white' : 'text-zinc-300'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="max-w-7xl w-full mx-auto flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' ? (
            <motion.div key="orders" className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentOrders.map((order) => (
                  <div key={order.id} className={`bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border-2 transition-all ${order.status === 'pending' ? 'border-red-600 scale-105 z-10' : 'border-zinc-50'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <span className="text-[9px] text-red-600 font-black block mb-0.5 tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                        <div className="flex items-center gap-2 text-[8px] text-zinc-400 mb-2 normal-case font-bold">
                           <Calendar size={10} /> {new Date(order.created_at).toLocaleDateString('ro-RO')} | <Clock size={10} /> {new Date(order.created_at).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                        <h3 className="text-xl md:text-2xl tracking-tighter text-zinc-900 font-black leading-tight">{order.customer_name}</h3>
                      </div>
                      <button onClick={() => printReceipt(order)} className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-red-600 active:scale-90 transition-all"><Printer size={20}/></button>
                    </div>
                    <div className="bg-zinc-50/50 p-4 rounded-2xl mb-6 space-y-2 border border-zinc-100">
                      <p className="text-[10px] flex items-center gap-2 font-black text-zinc-600"><Phone size={12} className="text-red-600"/> {order.customer_phone}</p>
                      <p className="text-[10px] flex items-start gap-2 font-black text-zinc-500 normal-case italic leading-tight"><Navigation size={12} className="text-red-600 mt-0.5 shrink-0"/> {order.delivery_address || 'RIDICARE'}</p>
                    </div>
                    <div className="space-y-2 mb-8 border-y-2 border-zinc-50 py-4 max-h-40 overflow-y-auto">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] font-black tracking-tight">
                          <span className="text-red-600">{item.quantity}x</span>
                          <span className="flex-1 px-2 text-zinc-700">{item.name}</span>
                          <span className="text-zinc-900">{item.price} L</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end justify-between mb-8">
                       <div><p className="text-[8px] text-zinc-400 tracking-widest uppercase">TOTAL</p><p className="text-3xl text-red-600 font-black tracking-tighter leading-none">{order.total_amount} RON</p></div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-zinc-900 text-white py-4 rounded-2xl text-[10px] font-black hover:bg-red-600 transition-all uppercase tracking-widest">ACCEPTĂ</button>}
                      {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'delivered')} className="bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">FINALIZATĂ</button>}
                      {order.status === 'delivered' && <div className="text-center py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest">✓ FINALIZATĂ</div>}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 py-12 pb-20">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all"><ChevronLeft size={24} strokeWidth={3}/></button>
                  <div className="text-center"><span className="text-[10px] text-zinc-300 tracking-widest block uppercase">PAGINA</span><span className="text-xl font-black">{currentPage} / {totalPages}</span></div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all"><ChevronRight size={24} strokeWidth={3}/></button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="menu" className="pb-20">
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-zinc-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] tracking-widest text-zinc-400 border-b uppercase"><th className="p-8">PRODUS</th><th className="p-8 text-center uppercase">GRAMAJ</th><th className="p-8 text-center uppercase">PREȚ</th><th className="p-8 text-right uppercase">STOC</th></tr>
                    </thead>
                    <tbody>
                      {menuItems.map((item) => (
                        <tr key={item.id} className={`border-b hover:bg-zinc-50 transition-colors ${!item.is_available ? 'bg-red-50/20' : ''}`}>
                          <td className="p-8"><div className="flex items-center gap-6"><img src={item.image_url} className={`w-16 h-16 rounded-2xl object-cover shadow-lg ${!item.is_available ? 'grayscale opacity-40' : ''}`} alt="" /><div><p className={`text-lg font-black leading-tight ${!item.is_available ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{item.name}</p><p className="text-[10px] normal-case italic font-medium text-zinc-400 mt-1 line-clamp-1">{item.description || 'FĂRĂ DESCRIERE'}</p></div></div></td>
                          <td className="p-8 text-center text-zinc-400 font-bold text-sm italic">{item.weight || 0} G</td>
                          <td className="p-8 text-center text-2xl text-red-600 font-black">{item.price} L</td>
                          <td className="p-8 text-right"><button onClick={() => toggleAvailability(item.id, item.is_available)} className={`px-6 py-3 rounded-2xl text-[9px] font-black tracking-widest transition-all ${item.is_available ? 'bg-zinc-900 text-white' : 'bg-red-600 text-white'}`}>{item.is_available ? 'ONLINE' : 'OFFLINE'}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl w-full mx-auto pt-12 pb-8 border-t-2 border-zinc-100 mt-auto opacity-40">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-3">
              <img src="/ucabfood.png" className="w-8 h-8 grayscale" alt="" />
              <p className="text-[10px] font-black tracking-[0.3em]">UCAB FOOD ROMANIA © 2024</p>
           </div>
        </div>
      </footer>
      <AppSupportWidget />
    </div>
  );
}
