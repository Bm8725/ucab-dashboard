"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import AppSupportWidget from "@/components/AppSupportWidget";
import { MapPin, Phone, CheckCircle2, Copy, Clock, Calendar, ChevronLeft, ChevronRight, BellRing, Utensils, Printer, Eye, EyeOff, Navigation } from "lucide-react";

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
  const ordersPerPage = 6;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/notify.wav");
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => { audioRef.current!.pause(); audioRef.current!.currentTime = 0; }).catch(() => {});
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
        const { data: menu } = await supabase.from("menu_items").select("*").eq("restaurant_id", id);
        setMenuItems(menu || []);
      }
      setLoading(false);
    }
    getData();

    const channel = supabase.channel(`live-sync-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
        const orderData = payload.new || payload.old;
        if (orderData && orderData.restaurant_id === id) {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new, ...prev]);
            if (audioRef.current) audioRef.current.play().catch(() => {});
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
          }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); window.removeEventListener('click', unlockAudio); };
  }, [id]);

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    await supabase.from("menu_items").update({ is_available: !currentStatus }).eq("id", itemId);
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: !currentStatus } : i));
  };

  // REPARAT: FUNCTIE PRINT PROFESIONALA CU IFRAME ASCUNS
  const printReceipt = (order: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const content = `
      <html>
        <body style="font-family: 'Courier New', Courier, monospace; width: 280px; padding: 10px; text-transform: uppercase;">
          <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0;">ucab.ro/ UCAB FOOD</h2>
            <p style="margin: 5px 0;">${restaurant?.name || 'Restaurant'}</p>
            <p style="font-size: 10px;">${new Date(order.created_at).toLocaleString('ro-RO')}</p>
          </div>
          <div style="font-size: 12px; margin-bottom: 10px;">
            <strong>CLIENT:</strong> ${order.customer_name}<br>
            <strong>TEL:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>ADR:</strong> ${order.delivery_address || 'RIDICARE PERSONALĂ'}
          </div>
          <div style="border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
          ${order.items.map((i: any) => `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
              <span>${i.quantity}x ${i.name}</span>
              <span>${i.price}L</span>
            </div>
          `).join('')}
          <div style="border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <span>TOTAL:</span>
            <span>${order.total_amount} RON</span>
          </div>
          <div style="text-align: center; margin-top: 30px; font-size: 10px;">
            *** VA MULTUMIM! ***
          </div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();
      
      // Așteptăm să se încarce conținutul în iframe, apoi printăm
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Ștergem iframe-ul după printare
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
    }
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
    return res.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, dateFilter]);

  const currentOrders = filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
      day: date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
    };
  }; 

  if (loading) return <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em] px-6 text-center">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-4 md:p-8 lg:p-12 font-sans italic uppercase font-black flex flex-col">
      
      <div className="flex items-center gap-2 mb-6">
        <img src="/ucabfood.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
        <span className="text-[12px] md:text-[10px] tracking-[0.4em] uppercase text-zinc-400">UCAB.RO / UCAB-FOOD ROMANIA</span>
      </div>

      <header className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row justify-between items-center mb-10 bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-4 border-red-600 gap-8">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img src={restaurant?.image_url} className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] object-cover shadow-xl ring-4 md:ring-8 ring-[#FDFCF7]" alt="" />
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-8xl tracking-tighter leading-none mb-2 uppercase">UCAB <span className="text-red-600">FOOD</span></h1>
            <p className="text-xl md:text-2xl text-zinc-800 leading-none font-black">{restaurant?.name}</p>
            <p className="text-[9px] md:text-[10px] text-red-600 tracking-[0.2em] mt-2 flex items-center justify-center md:justify-start gap-2 italic">
              <MapPin size={12} strokeWidth={3} /> {restaurant?.address || "ADRESĂ UCAB ACTIVĂ"}
            </p>
          </div>
        </div>
        
<div className="flex gap-6 md:gap-10 border-t md:border-t-0 md:border-l-2 border-zinc-100 pt-6 md:pt-0 md:pl-10 w-full lg:w-auto justify-around lg:justify-end">
  {/* NUMĂR TOTAL COMENZI DIN DB (Toate timpurile) */}
  <div className="text-center">
    <p className="text-[8px] md:text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Comenzi Total</p>
    <p className="text-4xl md:text-6xl text-zinc-900 font-black tracking-tighter leading-none">
      {restaurant?.orders_count || 0}
    </p>
  </div>

  {/* COMENZI ACTIVE (Afișate cu Roșu conform stilului tău) */}
  <div className="text-center">
    <p className="text-[8px] md:text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Active</p>
    <p className="text-4xl md:text-6xl text-red-600 font-black tracking-tighter leading-none">
      {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
    </p>
  </div>

  {/* REVENUE TOTAL */}
  <div className="text-center">
    <p className="text-[8px] md:text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Revenue</p>
    <p className="text-4xl md:text-6xl text-zinc-900 font-black tracking-tighter leading-none">
      {orders.reduce((a, c) => a + Number(c.total_amount), 0).toFixed(0)}
    </p>
  </div>
</div>

      </header>

      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <nav className="flex gap-6 md:gap-10 border-b-2 border-zinc-100 w-full md:w-auto overflow-x-auto no-scrollbar px-2">
          <button onClick={() => {setActiveTab('orders'); setCurrentPage(1);}} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'orders' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Comenzi</button>
          <button onClick={() => setActiveTab('menu')} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'menu' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Meniu</button>
        </nav>
        {activeTab === 'orders' && (
          <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-zinc-100">
            {['today', 'yesterday', 'all'].map((f) => (
              <button key={f} onClick={() => {setDateFilter(f as any); setCurrentPage(1);}} className={`px-4 py-2 rounded-xl text-[9px] tracking-widest transition-all ${dateFilter === f ? 'bg-red-600 text-white' : 'text-zinc-300 hover:text-red-600'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="max-w-7xl w-full mx-auto flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' ? (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentOrders.map((order) => (
                  <div key={order.id} className={`bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border-2 transition-all ${order.status === 'pending' ? 'border-red-600 scale-105 z-10' : 'border-zinc-50'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <span className="text-[9px] text-red-600 font-black mb-1 block tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                        <div className="flex items-center gap-2 text-[8px] text-zinc-400 mb-2 normal-case font-bold">
                           <Calendar size={10} /> {formatOrderDate(order.created_at).day} | <Clock size={10} /> {formatOrderDate(order.created_at).time}
                        </div>
                        <h3 className="text-xl md:text-2xl tracking-tighter text-zinc-900 font-black leading-tight">{order.customer_name}</h3>
                      </div>
                      <button onClick={() => printReceipt(order)} className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-red-600 active:scale-90 transition-all"><Printer size={20}/></button>
                    </div>
                    <div className="bg-zinc-50/50 p-4 rounded-2xl mb-6 space-y-2 border border-zinc-100">
                      <p className="text-[10px] flex items-center gap-2 font-black text-zinc-600"><Phone size={12} className="text-red-600"/> {order.customer_phone}</p>
                      <p className="text-[10px] flex items-start gap-2 font-black text-zinc-500 normal-case italic leading-tight"><Navigation size={12} className="text-red-600 mt-0.5 shrink-0"/> {order.delivery_address || 'RIDICARE'}</p>
                    </div>
                    <div className="space-y-2 mb-8 border-y-2 border-zinc-50 py-4 max-h-40 overflow-y-auto custom-scrollbar">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] font-black tracking-tight">
                          <span className="text-red-600 font-bold">{item.quantity}x</span>
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
                <div className="flex justify-center items-center gap-6 py-12">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all"><ChevronLeft size={24} strokeWidth={3}/></button>
                  <div className="text-center"><span className="text-[10px] text-zinc-300 tracking-widest block uppercase">PAGINA</span><span className="text-xl font-black text-zinc-900">{currentPage} / {totalPages}</span></div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all"><ChevronRight size={24} strokeWidth={3}/></button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-zinc-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] tracking-widest text-zinc-400 border-b uppercase"><th className="p-8">PRODUS / INFO</th><th className="p-8 text-center uppercase">GRAMAJ</th><th className="p-8 text-center uppercase">PREȚ</th><th className="p-8 text-right uppercase">STOC</th></tr>
                    </thead>
                    <tbody>
                      {menuItems.map((item) => (
                        <tr key={item.id} className={`border-b transition-all ${!item.is_available ? 'bg-red-50/20' : 'hover:bg-zinc-50'}`}>
                          <td className="p-8"><div className="flex items-center gap-6"><img src={item.image_url} className={`w-16 h-16 rounded-2xl object-cover shadow-lg ${!item.is_available ? 'grayscale opacity-40' : ''}`} alt="" /><div><p className={`text-lg font-black leading-tight ${!item.is_available ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{item.name}</p><p className="text-[10px] normal-case italic font-medium text-zinc-400 mt-1 line-clamp-1">{item.description || 'FĂRĂ DESCRIERE ADĂUGATĂ'}</p></div></div></td>
                          <td className="p-8 text-center text-zinc-400 font-bold text-sm italic">{item.weight || 0} gr</td>
                          <td className="p-8 text-center text-2xl text-red-600 font-black">{item.price} ron</td>
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
              <img src="/ucabfood.png" className="w-8 h-8 grayscale" alt="Footer Logo" />
              <p className="text-[10px] font-black tracking-[0.3em]">UCAB FOOD by UCAB.ro</p>
           </div>
           <div className="flex gap-8 text-[9px] font-black tracking-widest uppercase">
              <span>restaurant app</span>
           </div>
        </div>
      </footer>
      
      <AppSupportWidget />
    </div>
  );
}

