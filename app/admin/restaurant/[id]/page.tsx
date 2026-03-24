"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, CheckCircle2, Copy, Clock, Calendar, ChevronLeft, ChevronRight, BellRing, Utensils, Heart } from "lucide-react";

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
    // SUNET ACTUALIZAT: Am pus un link direct către un sunet de notificare tip "ding"
    audioRef.current = new Audio("https://assets.mixkit.co");
    
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => { 
          audioRef.current!.pause(); 
          audioRef.current!.currentTime = 0; 
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
            // Play sunet la comandă nouă
            if (audioRef.current) audioRef.current.play().catch(() => {});
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
          }
        }
      }).subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      window.removeEventListener('click', unlockAudio); 
    };
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

  if (loading) return <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em] px-6 text-center">UCAB-FOOD LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-4 md:p-8 lg:p-12 font-sans italic uppercase font-black flex flex-col">
      
      <div className="flex-grow">
        {/* TOP LOGO BAR */}
        <div className="max-w-7xl mx-auto flex justify-between items-center mb-6 md:mb-8 px-2 md:px-4 opacity-40">
          <div className="flex items-center gap-2">
            <Utensils size={14} className="text-red-600" />
            <span className="text-[8px] md:text-[10px] tracking-[0.4em]">UCAB.RO / UCAB-FOOD ROMANIA</span>
          </div>
        </div>

        {/* MAIN HEADER */}
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

        <nav className="max-w-7xl mx-auto flex gap-6 md:gap-10 mb-8 md:mb-12 border-b-2 border-zinc-100 overflow-x-auto no-scrollbar px-2 md:px-6">
          <button onClick={() => {setActiveTab('orders'); setCurrentPage(1);}} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'orders' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Comenzi</button>
          <button onClick={() => setActiveTab('menu')} className={`pb-4 md:pb-6 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] whitespace-nowrap transition-all ${activeTab === 'menu' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Meniu</button>
        </nav>

        <main className="max-w-7xl mx-auto mb-20">
          {activeTab === 'orders' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              <AnimatePresence mode="popLayout">
                {currentOrders.map((order) => (
                  <motion.div 
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-6 rounded-[2rem] border-2 transition-all ${order.status === 'pending' ? 'bg-red-600 text-white border-red-600 shadow-xl' : 'bg-white border-zinc-100'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] opacity-60 tracking-widest mb-1">#ORDER-{order.id.slice(0,5)}</p>
                        <p className="text-2xl font-black tracking-tighter">{order.customer_name || "Client Anonim"}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] tracking-widest border-2 ${order.status === 'pending' ? 'border-white animate-pulse' : 'border-zinc-100 text-zinc-400'}`}>
                        {order.status}
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-8 min-h-[100px]">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-4">
                          <p className="text-xs md:text-sm truncate">{item.quantity}X {item.name}</p>
                          <div className="h-[1px] flex-grow border-t border-current opacity-10"></div>
                          <p className="text-xs md:text-sm">{item.price} L</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'preparing')}
                          className="flex-grow bg-white text-red-600 py-4 rounded-2xl text-[10px] tracking-widest hover:bg-zinc-100 transition-colors"
                        >
                          ACCEPTĂ COMANDA
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'completed')}
                          className="flex-grow bg-zinc-900 text-white py-4 rounded-2xl text-[10px] tracking-widest"
                        >
                          FINALIZEAZĂ
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20 text-zinc-300 tracking-[0.5em]">MODUL MENIU ACTIV</div>
          )}
        </main>
      </div>

      {/* FOOTER ADAUGAT */}
      <footer className="max-w-7xl mx-auto w-full pt-10 pb-6 mt-auto border-t border-zinc-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Utensils size={12} className="text-red-600" />
              <span className="text-[10px] tracking-[0.3em]">UCAB-FOOD ADMIN SYSTEM</span>
            </div>
            <p className="text-[8px] tracking-[0.1em]">© 2024 UCAB ROMANIA. TOATE DREPTURILE REZERVATE.</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center md:text-right">
              <p className="text-[8px] tracking-[0.2em] mb-1">STATUS SERVER</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px]">OPERATIONAL</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <span className="text-[8px] tracking-[0.2em]">MADE WITH</span>
              <Heart size={10} fill="currentColor" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
