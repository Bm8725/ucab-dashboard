/*

admin/restaurant[id]/page.tsx
*/ 

"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MapPin, Phone, Trash2, Zap, Clock, Store } from "lucide-react";

export default function RestaurantLiveDash() {
  const { id } = useParams();
  const router = useRouter();
const [restaurant, setRestaurant] = useState<any>(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function getData() {
      const { data: res } = await supabase.from("restaurants").select("*").eq("id", id).single();
      setRestaurant(res);
      const { data: ord } = await supabase.from("orders").select("*").eq("restaurant_name", res?.name).order("created_at", { ascending: false });
      setOrders(ord || []);
      setLoading(false);
    }
    getData();

    const channel = supabase.channel(`live-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
      if (payload.new.restaurant_name === restaurant?.name) {
        setOrders(prev => [payload.new, ...prev]);
        new Audio("https://assets.mixkit.co").play().catch(() => {});
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, restaurant?.name]);

  const updateStatus = async (orderId, status) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-red-600 font-black italic tracking-[0.5em] uppercase">Connecting to Hub...</div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white p-8 md:p-12 font-sans italic uppercase">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
        <div className="flex items-center gap-8">
          <button onClick={() => router.back()} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-red-600 transition-all"><ChevronLeft/></button>
          <div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic leading-none">{restaurant?.name}</h1>
            <div className="flex items-center gap-3 mt-4 text-red-600 font-black text-[10px] tracking-[0.4em] animate-pulse">
              <Zap size={14} className="fill-red-600" /> Live Kitchen Terminal
            </div>
          </div>
        </div>
        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex gap-10">
            <div className="text-center"><p className="text-[9px] font-black text-zinc-600 mb-1">Incoming</p><p className="text-3xl font-black text-red-600">{orders.filter(o => o.status === 'pending').length}</p></div>
            <div className="text-center"><p className="text-[9px] font-black text-zinc-600 mb-1">Revenue Today</p><p className="text-3xl font-black">{orders.reduce((a,c) => a + c.total_amount, 0).toFixed(0)} <span className="text-xs">RON</span></p></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div layout key={order.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`bg-[#080808] rounded-[3.5rem] border overflow-hidden ${order.status === 'pending' ? 'border-red-600 shadow-2xl shadow-red-600/10' : 'border-white/5 opacity-50'}`}>
              <div className={`p-4 text-center text-[10px] font-black tracking-widest ${order.status === 'pending' ? 'bg-red-600' : 'bg-white/5 text-zinc-600'}`}>{order.status}</div>
              <div className="p-10">
                <div className="flex justify-between mb-8">
                  <h3 className="text-2xl font-black italic tracking-tighter">{order.customer_name}</h3>
                  <p className="text-xl font-black text-red-600 italic">{order.total_amount} <span className="text-[10px]">RON</span></p>
                </div>
                <div className="space-y-4 mb-8 text-[11px] font-bold text-zinc-400">
                  <p className="flex items-center gap-3"><MapPin size={16} className="text-red-600" /> {order.delivery_address}</p>
                  <p className="flex items-center gap-3"><Phone size={16} className="text-red-600" /> {order.customer_phone}</p>
                </div>
                <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/5 space-y-2 font-black italic text-[11px]">
                  {order.items?.map((item, i) => <div key={i} className="flex justify-between"><span>{item.quantity}X {item.name}</span><span className="text-zinc-600">{item.price} RON</span></div>)}
                </div>
                <div className="flex gap-3">
                  {order.status === 'pending' ? (
                    <button onClick={() => updateStatus(order.id, 'preparing')} className="flex-1 py-5 bg-white text-black rounded-2xl font-black text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl shadow-white/5 uppercase">Accept Order</button>
                  ) : (
                    <button onClick={() => updateStatus(order.id, 'delivered')} className="flex-1 py-5 border border-white/10 text-zinc-500 rounded-2xl font-black text-[10px] tracking-widest hover:bg-green-600 hover:text-white transition-all uppercase">Finish Hub</button>
                  )}
                  <button onClick={() => updateStatus(order.id, 'cancelled')} className="p-5 bg-white/5 text-zinc-800 hover:text-red-600 rounded-2xl transition-all"><Trash2 size={20}/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>
    </div>
  );
}
