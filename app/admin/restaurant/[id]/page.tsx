"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
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
    audioRef.current = new Audio("https://assets.mixkit.co");
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

  if (loading) return <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em]">UCAB-FOOD loading...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-6 md:p-12 font-sans italic uppercase font-black">
      
      {/* TOP LOGO BAR */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 px-4 opacity-40">
        <div className="flex items-center gap-2">
          <Utensils size={16} className="text-red-600" />
          <span className="text-[10px] tracking-[0.4em]">UCAB.RO / UCAB-FOOD romania</span>
        </div>
     
      </div>

      {/* MAIN HEADER */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-red-600 relative overflow-hidden">
        <div className="flex items-center gap-10">
          <img src={restaurant?.image_url} className="w-32 h-32 rounded-[3.5rem] object-cover shadow-2xl ring-8 ring-[#FDFCF7]" alt="" />
          <div>
            <h1 className="text-6xl md:text-8xl tracking-tighter leading-none mb-2 text-zinc-900 uppercase">UCAB <span className="text-red-600">FOOD</span></h1>
            <div className="mb-4">
              <p className="text-2xl text-zinc-800 leading-none font-black">{restaurant?.name}</p>
              <p className="text-[10px] text-red-600 tracking-[0.2em] mt-1 flex items-center gap-2 italic">
                <MapPin size={12} strokeWidth={3} /> {restaurant?.address || "Adresă nespecificată"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-zinc-400 text-[10px] tracking-widest uppercase">
              <span className="flex items-center gap-1"><Clock size={12}/> {restaurant?.delivery_time || "30 min"}</span>
              <span className="opacity-30">|</span>
              <span>ID: {id?.toString().slice(0,8)}</span>
              <button onClick={() => {navigator.clipboard.writeText(id!.toString()); alert("COPIAT");}} className="hover:text-red-600 transition-colors"><Copy size={14}/></button>
            </div>
          </div>
        </div>
        <div className="flex gap-10">
          <div className="text-center">
            <p className="text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Live Queue</p>
            <p className="text-6xl text-red-600 font-black tracking-tighter">
              {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
            </p>
          </div>
          <div className="text-center border-l-2 border-zinc-50 pl-10">
            <p className="text-[9px] text-zinc-400 mb-1 tracking-widest uppercase font-black">Revenue</p>
            <p className="text-6xl text-zinc-900 font-black tracking-tighter">
              {orders.reduce((a, c) => a + Number(c.total_amount), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </header>


      {/* TABS */}
      <nav className="max-w-7xl mx-auto flex gap-10 mb-12 border-b-2 border-zinc-100 px-6">
        <button onClick={() => {setActiveTab('orders'); setCurrentPage(1);}} className={`pb-6 text-sm tracking-[0.4em] transition-all ${activeTab === 'orders' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Comenzi</button>
        <button onClick={() => setActiveTab('menu')} className={`pb-6 text-sm tracking-[0.4em] transition-all ${activeTab === 'menu' ? 'text-red-600 border-b-4 border-red-600' : 'text-zinc-300'}`}>Meniu</button>
      </nav>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'orders' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AnimatePresence mode="popLayout">
                {currentOrders.map((order) => (
                  <motion.div layout key={order.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`bg-white rounded-[4rem] border-4 transition-all ${order.status === 'pending' ? 'border-red-600 shadow-2xl' : 'border-zinc-50 opacity-50 grayscale'}`}>
                    <div className={`p-4 flex justify-between px-10 items-center text-[10px] tracking-[0.2em] font-black ${order.status === 'pending' ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
                      <span className="flex items-center gap-2">{order.status === 'pending' && <BellRing size={12}/>} {order.status}</span>
                      <div className="flex gap-4"><span>{formatOrderDate(order.created_at).time}</span><span>{formatOrderDate(order.created_at).day}</span></div>
                    </div>
                    <div className="p-10">
                      <h3 className="text-3xl tracking-tighter leading-none mb-8 truncate">{order.customer_name || "Client"}</h3>
                      <div className="bg-zinc-50 p-6 rounded-[2.5rem] space-y-3 mb-8 text-[11px] border border-zinc-100">
                        <p className="flex items-start gap-4 text-[11px] leading-tight"><MapPin size={16} className="text-red-600 shrink-0"/> {order.delivery_address}</p>
                        <p className="flex items-center gap-4 text-[11px] font-mono"><Phone size={16} className="text-red-600 shrink-0"/> {order.customer_phone}</p>
                      </div>
                      <div className="space-y-2 mb-10 border-l-4 border-red-600 pl-6 text-[13px]">
                        {order.items?.map((item: any, i: number) => (
                          <p key={i}><span className="text-red-600 font-black">{item.quantity}X</span> {item.name}</p>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3">
                        {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'preparing')} className="w-full py-6 bg-zinc-900 text-white rounded-3xl text-xs tracking-widest uppercase hover:bg-red-600 transition-all">Acceptă</button>}
                        {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'delivered')} className="w-full py-6 bg-red-600 text-white rounded-3xl text-xs tracking-widest flex items-center justify-center gap-2 uppercase shadow-xl"><CheckCircle2 size={18}/> Finalizează</button>}
                        <button onClick={() => updateStatus(order.id, 'cancelled')} className="text-[9px] text-zinc-300 hover:text-red-500 uppercase pt-2 tracking-widest transition-colors">Refuză Comanda</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-16 bg-white w-fit mx-auto p-4 rounded-3xl shadow-lg border-2 border-red-600">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`p-3 rounded-2xl ${currentPage === 1 ? 'text-zinc-200' : 'text-red-600'}`}><ChevronLeft size={24} /></button>
                <span className="text-[10px] tracking-widest font-black">PAGINA {currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={`p-3 rounded-2xl ${currentPage === totalPages ? 'text-zinc-200' : 'text-red-600'}`}><ChevronRight size={24} /></button>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {menuItems.map((item) => (
              <div key={item.id} className="group">
                <div className="aspect-square rounded-[3rem] overflow-hidden mb-4 shadow-lg ring-2 ring-red-600/10 group-hover:ring-red-600 transition-all duration-500">
                  <img src={item.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                </div>
                <p className="text-[10px] text-center mb-1 tracking-tighter text-zinc-400 font-bold">{item.name}</p>
                <p className="text-[12px] text-red-600 text-center font-black">{item.price} RON</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
