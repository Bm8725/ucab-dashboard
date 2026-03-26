"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import AppSupportWidget from "@/components/AppSupportWidget";

import { MapPin, Phone, CheckCircle2, Copy, Clock, Calendar, ChevronLeft, ChevronRight, BellRing, Utensils } from "lucide-react";



export default function RestaurantLiveDash() {
  const params = useParams();
  const id = params.id;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders]);

  const currentOrders = sortedOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);
  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
      day: date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
    };
  }; 

  if (loading) return <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em] px-6 text-center">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-4 md:p-8 lg:p-12 font-sans italic uppercase font-black">
      
                      <div className="flex items-center gap-2">
                        {/* Folosim img standard pentru a evita erorile de tip check la build */}
                        <img 
                          src="/ucabfood.png" 
                          alt="UCAB Food Logo" 
                          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                        />
                        <span className="text-[12px] md:text-[10px] tracking-[0.4em] uppercase">
                          UCAB.RO / UCAB-FOOD ROMANIA
                        </span>
                      </div>


      {/* MAIN HEADER - RESPONSIVE */}
      <header className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center mb-10 md:mb-16 bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border-4 border-red-600 relative overflow-hidden gap-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
          <img src={restaurant?.image_url} className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[3.5rem] object-cover shadow-2xl ring-4 md:ring-8 ring-[#FDFCF7]" alt="" />
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-8xl tracking-tighter leading-none mb-2 text-zinc-900 uppercase">UCAB <span className="text-red-600">FOOD</span></h1>
            <div className="mb-4">
              <p className="text-xl md:text-2xl text-zinc-800 leading-none font-black">{restaurant?.name}</p>
              <p className="text-[9px] md:text-[10px] text-red-600 tracking-[0.1em] md:tracking-[0.2em] mt-2 flex items-center justify-center md:justify-start gap-2 italic">
                <MapPin size={12} strokeWidth={3} /> {restaurant?.address || "Adresă nespecificată"}
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 text-zinc-400 text-[8px] md:text-[10px] tracking-widest uppercase font-bold">
              <span className="flex items-center gap-1"><Clock size={12}/> {restaurant?.delivery_time || "30 min"}</span>
              <span className="opacity-30 hidden md:inline">|</span>
              <span>ID: {id?.toString().slice(0,8)}</span>
              <button onClick={() => {navigator.clipboard.writeText(id!.toString()); alert("COPIAT");}} className="hover:text-red-600 transition-colors p-1 bg-zinc-50 rounded"><Copy size={12}/></button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6 md:gap-10 border-t md:border-t-0 md:border-l-2 border-zinc-100 pt-6 md:pt-0 md:pl-10 w-full lg:w-auto justify-around lg:justify-end">
          <div className="text-center">
            <p className="text-[8px] md:text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Queue</p>
            <p className="text-4xl md:text-6xl text-red-600 font-black tracking-tighter">
              {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[8px] md:text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Revenue</p>
            <p className="text-4xl md:text-6xl text-zinc-900 font-black tracking-tighter">
              {orders.reduce((a, c) => a + Number(c.total_amount), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </header>

      {/* TABS - RESPONSIVE NAVIGATION */}
      <nav className="max-w-7xl mx-auto flex gap-6 md:gap-10 mb-8 md:mb-12 border-b-2 border-zinc-100 overflow-x-auto no-scrollbar px-2 md:px-6">
        <button onClick={() => {setActiveTab('orders'); setCurrentPage(1);}} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'orders' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Comenzi</button>
        <button onClick={() => setActiveTab('menu')} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'menu' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Meniu</button>
      </nav>

      {/* CONTENT GRID */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'orders' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              <AnimatePresence mode="popLayout">
                {currentOrders.map((order) => (
                  <motion.div layout key={order.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`bg-white rounded-[2.5rem] md:rounded-[4rem] border-4 transition-all overflow-hidden flex flex-col ${order.status === 'pending' ? 'border-red-600 shadow-2xl' : 'border-zinc-50 opacity-50 grayscale'}`}>
                    <div className={`p-3 md:p-4 flex justify-between px-6 md:px-10 items-center text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black ${order.status === 'pending' ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
                      <span className="flex items-center gap-2">{order.status === 'pending' && <BellRing size={12}/>} {order.status}</span>
                      <div className="flex gap-2 md:gap-4"><span>{formatOrderDate(order.created_at).time}</span><span>{formatOrderDate(order.created_at).day}</span></div>
                    </div>
                    <div className="p-6 md:p-10 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-6 md:mb-8 gap-2">
                        <h3 className="text-xl md:text-3xl tracking-tighter leading-tight font-black">{order.customer_name || "Client"}</h3>
                        <p className="text-lg md:text-2xl text-red-600 font-black whitespace-nowrap">{order.total_amount} <span className="text-[10px]">RON</span></p>
                      </div>
                      
                      <div className="bg-zinc-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] space-y-3 mb-6 md:mb-8 text-[10px] md:text-[11px] border border-zinc-100">
                        <p className="flex items-start gap-3"><MapPin size={14} className="text-red-600 shrink-0 mt-0.5"/> <span className="lowercase">{order.delivery_address}</span></p>
                        <p className="flex items-center gap-3"><Phone size={14} className="text-red-600 shrink-0"/> {order.customer_phone}</p>
                      </div>

                      <div className="space-y-2 mb-8 md:mb-10 border-l-4 border-red-600 pl-4 md:pl-6 text-[11px] md:text-[13px] flex-1">
                        {order.items?.map((item: any, i: number) => (
                          <p key={i}><span className="text-red-600 font-black">{item.quantity}X</span> {item.name}</p>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 mt-auto">
                        {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'preparing')} className="w-full py-4 md:py-6 bg-zinc-900 text-white rounded-2xl md:rounded-3xl text-[10px] md:text-xs tracking-widest uppercase hover:bg-red-600 transition-all font-black">Acceptă</button>}
                        {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'delivered')} className="w-full py-4 md:py-6 bg-red-600 text-white rounded-2xl md:rounded-3xl text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-2 uppercase shadow-xl font-black"><CheckCircle2 size={18}/> Finalizează</button>}
                        <button onClick={() => updateStatus(order.id, 'cancelled')} className="text-[8px] md:text-[9px] text-zinc-300 hover:text-red-600 uppercase tracking-widest font-bold">Anulează</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* PAGINATION RESPONSIVE */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 md:gap-6 mt-12 md:mt-16 bg-white w-fit mx-auto p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-lg border-2 border-red-600">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`p-2 rounded-xl ${currentPage === 1 ? 'text-zinc-200' : 'text-red-600'}`}><ChevronLeft size={20} /></button>
                <span className="text-[8px] md:text-[10px] tracking-widest font-black whitespace-nowrap uppercase">Pag {currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={`p-2 rounded-xl ${currentPage === totalPages ? 'text-zinc-200' : 'text-red-600'}`}><ChevronRight size={20} /></button>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 px-2 md:px-6">
            {menuItems.map((item) => (
              <div key={item.id} className="group">
                <div className="aspect-square rounded-[1.5rem] md:rounded-[3rem] overflow-hidden mb-3 md:mb-4 shadow-lg ring-2 ring-red-600/10 group-hover:ring-red-600 transition-all duration-500">
                  <img src={item.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                </div>
                <p className="text-[8px] md:text-[10px] text-center mb-1 tracking-tighter text-zinc-400 font-bold truncate px-1">{item.name}</p>
                <p className="text-[10px] md:text-[12px] text-red-600 text-center font-black">{item.price} RON</p>
              </div>
            ))}
          </div>
        )}

          {/* Restul paginii tale food */}
      <AppSupportWidget  />
      </main>
            {/* FOOTER STATIC */}
      <footer className="max-w-7xl mx-auto mt-20 py-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
        <p className="text-[10px] tracking-[0.3em]">WWW.UCAB.RO</p>
        <p className="text-[10px] tracking-[0.3em]">UCAB-FOOD technologies V 0.9.13</p>
      </footer>
    </div>
  );
}
