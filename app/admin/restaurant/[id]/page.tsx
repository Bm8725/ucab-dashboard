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
  
  // Referință pentru sunet
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inițializare fișier audio din folderul public
    const audio = new Audio("/notify.wav");
    audio.preload = "auto";
    audioRef.current = audio;

    // Funcție obligatorie pentru a "convinge" browserul să lase sunetul să meargă
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            audioRef.current!.pause();
            audioRef.current!.currentTime = 0;
            console.log("Audio deblocat");
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
          })
          .catch(() => {});
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

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
            
            // REDARE SUNET LA COMANDĂ NOUĂ
            if (audioRef.current) {
              audioRef.current.pause(); 
              audioRef.current.currentTime = 0; // Resetare obligatorie pentru a putea cânta iar
              audioRef.current.play().catch(e => console.log("Sunet blocat. Apasă pe pagină!", e));
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
          }
        }
      }).subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [id]);

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    await supabase.from("menu_items").update({ is_available: !currentStatus }).eq("id", itemId);
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: !currentStatus } : i));
  };

  const printReceipt = (order: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const content = `
      <html>
        <body style="font-family: 'Courier New', Courier, monospace; width: 280px; padding: 10px; text-transform: uppercase;">
          <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0;">UCAB FOOD</h2>
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
          <div style="text-align: center; margin-top: 30px; font-size: 10px;">*** VA MULTUMIM! ***</div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open(); doc.write(content); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
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
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-8 py-4 rounded-full border-4 transition-all ${activeTab === 'orders' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-zinc-200'}`}
          >
            COMENZI
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-8 py-4 rounded-full border-4 transition-all ${activeTab === 'menu' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-zinc-200'}`}
          >
            MENIU
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto flex-1">
        {activeTab === 'orders' ? (
          <>
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
              {['today', 'yesterday', 'all'].map((f) => (
                <button 
                  key={f}
                  onClick={() => { setDateFilter(f as any); setCurrentPage(1); }}
                  className={`px-6 py-2 rounded-xl text-sm border-2 ${dateFilter === f ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-100'}`}
                >
                  {f === 'today' ? 'AZI' : f === 'yesterday' ? 'IERI' : 'TOATE'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {currentOrders.map((order) => (
                  <motion.div 
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-white p-6 rounded-[2rem] shadow-xl border-4 ${order.status === 'pending' ? 'border-red-600 animate-pulse' : 'border-zinc-100'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] text-zinc-400 block tracking-widest font-black uppercase">#ORD-{order.id.slice(0,5)}</span>
                        <h3 className="text-xl font-black">{order.customer_name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-red-600 block">{order.total_amount} RON</span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 justify-end">
                           <Clock size={10}/> {formatOrderDate(order.created_at).time}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-dashed border-zinc-100 pb-1">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-bold">{item.price} L</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                          <CheckCircle2 size={14}/> ACCEPTĂ
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button onClick={() => updateStatus(order.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs">
                          FINALIZATĂ
                        </button>
                      )}
                      <button onClick={() => printReceipt(order)} className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                        <Printer size={14}/> PRINT
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-4 bg-white rounded-full shadow-lg border-2 border-zinc-100 disabled:opacity-50" disabled={currentPage === 1}><ChevronLeft/></button>
                <span className="font-black italic">PAGINA {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-4 bg-white rounded-full shadow-lg border-2 border-zinc-100 disabled:opacity-50" disabled={currentPage === totalPages}><ChevronRight/></button>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className={`p-4 rounded-2xl border-4 transition-all ${item.is_available ? 'bg-white border-zinc-100' : 'bg-zinc-50 border-zinc-200 opacity-60'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-sm">{item.name}</h4>
                  <button onClick={() => toggleAvailability(item.id, item.is_available)}>
                    {item.is_available ? <Eye className="text-green-600" size={20}/> : <EyeOff className="text-red-600" size={20}/>}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mb-4">{item.category}</p>
                <div className="font-black text-red-600">{item.price} RON</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AppSupportWidget />
    </div>
  );
}
