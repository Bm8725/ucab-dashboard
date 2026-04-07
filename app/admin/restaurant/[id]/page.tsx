"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import AppSupportWidget from "@/components/AppSupportWidget";
import {
  MapPin, Phone, CheckCircle2, Clock, Calendar,
  ChevronLeft, ChevronRight, Utensils, Printer,
  Eye, EyeOff, Navigation, Timer, Bike, X
} from "lucide-react";

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { label: "Nouă",       color: "border-red-600 bg-red-50",     badge: "bg-red-600 text-white",     dot: "bg-red-500" },
  confirmed:  { label: "Confirmată", color: "border-orange-400 bg-orange-50", badge: "bg-orange-400 text-white", dot: "bg-orange-400" },
  preparing:  { label: "Pregătire",  color: "border-yellow-400 bg-yellow-50", badge: "bg-yellow-400 text-black", dot: "bg-yellow-400" },
  ready:      { label: "Gata",       color: "border-green-500 bg-green-50",  badge: "bg-green-500 text-white",   dot: "bg-green-500" },
  picked_up:  { label: "Preluată",   color: "border-blue-500 bg-blue-50",    badge: "bg-blue-500 text-white",    dot: "bg-blue-500" },
  delivered:  { label: "Livrată",    color: "border-zinc-200 bg-zinc-50",    badge: "bg-zinc-400 text-white",    dot: "bg-zinc-400" },
  cancelled:  { label: "Anulată",    color: "border-zinc-100 bg-zinc-50",    badge: "bg-zinc-300 text-zinc-600", dot: "bg-zinc-300" },
};

// Butoanele de acțiune pe care restaurantul le poate face
// Driver-ul face picked_up → delivered, restaurantul nu atinge acele statusuri
const RESTAURANT_ACTIONS = {
  pending:   { next: "confirmed",  label: "✓ ACCEPTĂ COMANDA",  style: "bg-zinc-900 hover:bg-red-600 text-white" },
  confirmed: { next: "preparing",  label: "🍳 ÎNCEPE PREPARARE", style: "bg-orange-500 hover:bg-orange-600 text-white" },
  preparing: { next: "ready",      label: "✅ GATA DE LIVRARE",  style: "bg-green-600 hover:bg-green-700 text-white" },
  ready:     null, // restaurantul nu mai face nimic — asteapta driver
  picked_up: null,
  delivered: null,
  cancelled: null,
};

// ─── COMPONENT PRINCIPAL ─────────────────────────────────────────────────────
export default function RestaurantLiveDash() {
  const params = useParams();
  const id = params.id;

  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelModal, setCancelModal] = useState(null); // order id
  const [cancelReason, setCancelReason] = useState("");
  const ordersPerPage = 6;
 const audioRef = useRef<HTMLAudioElement | null>(null);


  // ─── INIT ─────────────────────────────────────────────────────────────────
    useEffect(() => {
    audioRef.current = new Audio("/notify.wav");
    
    const unlockAudio = () => {
      // Verificăm cu ? dacă play() poate fi apelat
      audioRef.current?.play().then(() => {
        // CORECȚIE: Adăugat ? la pause() și verificare IF pentru currentTime
        audioRef.current?.pause();
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }).catch(() => {});
      window.removeEventListener("click", unlockAudio);
    };
    
    window.addEventListener("click", unlockAudio);

    if (!id) return;

    async function getData() {
      const { data: res } = await supabase
        .from("restaurants").select("*").eq("id", id).single();
      setRestaurant(res);

      if (res) {
        const { data: ord } = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", id)
          .order("created_at", { ascending: false });
        setOrders(ord || []);

        const { data: menu } = await supabase
          .from("menu_items").select("*").eq("restaurant_id", id);
        setMenuItems(menu || []);
      }
      setLoading(false);
    }
    getData();

    // REALTIME — ascultă orice schimbare pe orders pentru acest restaurant
    const channel = supabase
      .channel(`restaurant-dash-${id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "orders",
        filter: `restaurant_id=eq.${id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders(prev => [payload.new, ...prev]);
          // CORECȚIE: Verificare sigură pentru play() la sunet nou
          audioRef.current?.play().catch(() => {});
        } else if (payload.eventType === "UPDATE") {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("click", unlockAudio);
    };
  }, [id]);


  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  // Actualizează status + timestamp corespunzător
  const updateStatus = async (orderId, newStatus) => {
    const timestampField = {
      confirmed: "confirmed_at",
      preparing: "preparing_at",
      ready:     "ready_at",
      picked_up: "picked_up_at",
      delivered: "delivered_at",
      cancelled: "cancelled_at",
    }[newStatus];

    const updateData = { status: newStatus };
    if (timestampField) updateData[timestampField] = new Date().toISOString();

    await supabase.from("orders").update(updateData).eq("id", orderId);
    // Realtime va actualiza UI-ul automat
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    await supabase.from("orders").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancelReason || "Anulat de restaurant",
    }).eq("id", cancelModal);
    setCancelModal(null);
    setCancelReason("");
  };

  const toggleAvailability = async (itemId, currentStatus) => {
    await supabase.from("menu_items")
      .update({ is_available: !currentStatus }).eq("id", itemId);
    setMenuItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, is_available: !currentStatus } : i)
    );
  };

  const printReceipt = (order) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <html><body style="font-family:'Courier New',monospace;width:280px;padding:10px;text-transform:uppercase;">
          <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;margin-bottom:10px;">
            <h2 style="margin:0;">UVAB.RO / UVAB FOOD</h2>
            <p style="margin:5px 0;">${restaurant?.name || "Restaurant"}</p>
            <p style="font-size:10px;">${new Date(order.created_at).toLocaleString("ro-RO")}</p>
          </div>
          <div style="font-size:12px;margin-bottom:10px;">
            <strong>CLIENT:</strong> ${order.customer_name}<br>
            <strong>TEL:</strong> ${order.customer_phone || "N/A"}<br>
            <strong>ADR:</strong> ${order.delivery_address || "RIDICARE PERSONALĂ"}<br>
            <strong>PLATĂ:</strong> ${order.payment_method?.toUpperCase()}
          </div>
          <div style="border-bottom:1px solid #000;margin-bottom:10px;"></div>
          ${order.items?.map(i => `
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
              <span>${i.quantity}x ${i.name}</span>
              <span>${i.price} RON</span>
            </div>
          `).join("")}
          <div style="border-top:2px dashed #000;margin-top:10px;padding-top:10px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <span>Subtotal</span><span>${(order.total_amount - (order.delivery_fee||0)).toFixed(2)} RON</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <span>Livrare</span><span>${order.delivery_fee || 0} RON</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;margin-top:6px;">
              <span>TOTAL</span><span>${order.total_amount} RON</span>
            </div>
          </div>
          <div style="text-align:center;margin-top:30px;font-size:10px;">*** VĂ MULȚUMIM! ***</div>
        </body></html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  // ─── FILTRARE ────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;

    return orders
      .filter(o => {
        const oDate = new Date(o.created_at).getTime();
        const dateOk =
          dateFilter === "today" ? oDate >= today :
          dateFilter === "yesterday" ? oDate >= yesterday && oDate < today :
          true;
        const statusOk = statusFilter === "all" || o.status === statusFilter;
        return dateOk && statusOk;
      })
      .sort((a, b) => {
        const priority = { pending: 0, confirmed: 1, preparing: 2, ready: 3, picked_up: 4, delivered: 5, cancelled: 6 };
        if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [orders, dateFilter, statusFilter]);

  const currentOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage, currentPage * ordersPerPage
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const formatDate = (ds) => {
    const d = new Date(ds);
    return {
      time: d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
      day: d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }),
    };
  };

  const activeCount = orders.filter(o =>
    ["pending", "confirmed", "preparing", "ready"].includes(o.status)
  ).length;

  if (loading) return (
    <div className="h-screen bg-[#FDFCF7] flex items-center justify-center font-black italic text-red-600 tracking-[0.5em]">
      LOADING...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-zinc-900 p-4 md:p-8 lg:p-12 font-sans italic uppercase font-black flex flex-col">

      {/* HEADER */}
      <div className="flex items-center gap-2 mb-6">
        <img src="/ucabfood.png" alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
        <span className="text-[12px] tracking-[0.4em] uppercase text-zinc-400">UVAB.RO / UVAB FOOD ROMANIA</span>
      </div>

      <header className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row justify-between items-center mb-10 bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-4 border-red-600 gap-8">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <img src={restaurant?.image_url} className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] object-cover shadow-xl ring-4 ring-[#FDFCF7]" alt="" />
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-8xl tracking-tighter leading-none mb-2 uppercase">
              UVAB <span className="text-red-600">FOOD</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-800 leading-none font-black">{restaurant?.name}</p>
            <p className="text-[9px] text-red-600 tracking-[0.2em] mt-2 flex items-center justify-center md:justify-start gap-2 italic">
              <MapPin size={12} strokeWidth={3} /> {restaurant?.address || "ADRESĂ ACTIVĂ"}
            </p>
          </div>
        </div>
        <div className="flex gap-6 md:gap-10 border-t md:border-t-0 md:border-l-2 border-zinc-100 pt-6 md:pt-0 md:pl-10 w-full lg:w-auto justify-around lg:justify-end">
          <div className="text-center">
            <p className="text-[8px] text-zinc-400 mb-1 tracking-widest">TOTAL COMENZI</p>
            <p className="text-4xl md:text-6xl font-black tracking-tighter">{restaurant?.orders_count || orders.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-zinc-400 mb-1 tracking-widest">ACTIVE</p>
            <p className="text-4xl md:text-6xl text-red-600 font-black tracking-tighter">{activeCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-zinc-400 mb-1 tracking-widests">REVENUE</p>
            <p className="text-4xl md:text-6xl font-black tracking-tighter">
              {orders.filter(o => o.status === "delivered")
                .reduce((a, c) => a + Number(c.total_amount), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </header>

      {/* NAV + FILTRE */}
      <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <nav className="flex gap-6 md:gap-10 border-b-2 border-zinc-100 w-full md:w-auto">
          <button
            onClick={() => { setActiveTab("orders"); setCurrentPage(1); }}
            className={`pb-4 md:pb-6 text-xs tracking-[0.3em] transition-all ${activeTab === "orders" ? "text-red-600 border-b-4 border-red-600" : "text-zinc-300"}`}
          >Comenzi</button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`pb-4 md:pb-6 text-xs tracking-[0.3em] transition-all ${activeTab === "menu" ? "text-red-600 border-b-4 border-red-600" : "text-zinc-300"}`}
          >Meniu</button>
        </nav>

        {activeTab === "orders" && (
          <div className="flex flex-wrap gap-3">
            {/* Filtru dată */}
            <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-zinc-100">
              {[["today", "Azi"], ["yesterday", "Ieri"], ["all", "Toate"]].map(([f, label]) => (
                <button key={f} onClick={() => { setDateFilter(f); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-[9px] tracking-widest transition-all ${dateFilter === f ? "bg-red-600 text-white" : "text-zinc-300 hover:text-red-600"}`}>
                  {label}
                </button>
              ))}
            </div>
            {/* Filtru status */}
            <div className="flex bg-white p-2 rounded-2xl shadow-lg border border-zinc-100 flex-wrap gap-1">
              {[["all", "Toate"], ["pending", "Noi"], ["confirmed", "Conf."], ["preparing", "Prep."], ["ready", "Gata"], ["delivered", "Livrate"]].map(([s, label]) => (
                <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-xl text-[9px] tracking-widest transition-all ${statusFilter === s ? "bg-zinc-900 text-white" : "text-zinc-300 hover:text-zinc-600"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MAIN */}
      <main className="max-w-7xl w-full mx-auto flex-1">
        <AnimatePresence mode="wait">
          {activeTab === "orders" ? (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              
              {currentOrders.length === 0 && (
                <div className="text-center py-20 text-zinc-300 text-sm tracking-widest">
                  Nicio comandă pentru filtrele selectate
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const action = RESTAURANT_ACTIONS[order.status];
                  const { time, day } = formatDate(order.created_at);
                  const isPending = order.status === "pending";

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border-2 transition-all ${cfg.color} ${isPending ? "scale-[1.02] z-10" : ""}`}
                    >
                      {/* Header card */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            {isPending && (
                              <span className="text-[8px] text-red-600 font-black animate-pulse tracking-widest">● NOUĂ</span>
                            )}
                          </div>
                          <span className="text-[9px] text-red-600 font-black tracking-widest">
                            #{order.id.slice(0, 8)}
                          </span>
                          <div className="flex items-center gap-2 text-[8px] text-zinc-400 mt-1 normal-case font-bold">
                            <Calendar size={10} /> {day} | <Clock size={10} /> {time}
                          </div>
                          <h3 className="text-xl tracking-tighter text-zinc-900 font-black leading-tight mt-1">
                            {order.customer_name}
                          </h3>
                        </div>
                        <button onClick={() => printReceipt(order)}
                          className="p-3 bg-zinc-50 rounded-xl text-zinc-400 hover:text-red-600 transition-all">
                          <Printer size={18} />
                        </button>
                      </div>

                      {/* Info client */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl mb-4 space-y-2 border border-zinc-100">
                        <p className="text-[10px] flex items-center gap-2 font-black text-zinc-600">
                          <Phone size={12} className="text-red-600" /> {order.customer_phone}
                        </p>
                        <p className="text-[10px] flex items-start gap-2 font-black text-zinc-500 normal-case italic leading-tight">
                          <Navigation size={12} className="text-red-600 mt-0.5 shrink-0" />
                          {order.delivery_address || "RIDICARE PERSONALĂ"}
                        </p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                          💳 {order.payment_method}
                        </p>
                      </div>

                      {/* Produse */}
                      <div className="space-y-2 mb-6 border-y-2 border-zinc-50 py-4 max-h-36 overflow-y-auto">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-[11px] font-black tracking-tight">
                            <span className="text-red-600">{item.quantity}x</span>
                            <span className="flex-1 px-2 text-zinc-700">{item.name}</span>
                            <span className="text-zinc-900">{item.price} RON</span>
                          </div>
                        ))}
                        {order.notes && (
                          <p className="text-[9px] text-zinc-400 italic normal-case pt-1 border-t border-zinc-100">
                            📝 {order.notes}
                          </p>
                        )}
                      </div>

                      {/* Total */}
                      <div className="flex items-end justify-between mb-6">
                        <div>
                          <p className="text-[8px] text-zinc-400 tracking-widest uppercase">Total</p>
                          <p className="text-3xl text-red-600 font-black tracking-tighter leading-none">
                            {order.total_amount} RON
                          </p>
                          {order.delivery_fee > 0 && (
                            <p className="text-[8px] text-zinc-400 normal-case">
                              incl. {order.delivery_fee} RON livrare
                            </p>
                          )}
                        </div>
                        {/* Status livrat / preluat de driver */}
                        {order.status === "ready" && (
                          <div className="text-[9px] text-green-600 font-black tracking-widest flex items-center gap-1">
                            <Bike size={14} /> Așteptăm driver
                          </div>
                        )}
                        {order.status === "picked_up" && (
                          <div className="text-[9px] text-blue-600 font-black tracking-widest flex items-center gap-1">
                            <Bike size={14} /> În drum
                          </div>
                        )}
                        {order.status === "delivered" && (
                          <div className="text-[9px] text-zinc-400 font-black tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={14} /> Livrat
                          </div>
                        )}
                      </div>

                      {/* BUTOANE ACȚIUNE */}
                      <div className="space-y-2">
                        {action && (
                          <button
                            onClick={() => updateStatus(order.id, action.next)}
                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${action.style}`}
                          >
                            {action.label}
                          </button>
                        )}
                        {/* Buton anulare — doar pentru pending/confirmed */}
                        {["pending", "confirmed"].includes(order.status) && (
                          <button
                            onClick={() => setCancelModal(order.id)}
                            className="w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 border-red-200 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                          >
                            ✕ ANULEAZĂ
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* PAGINARE */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 py-12">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                    className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all">
                    <ChevronLeft size={24} strokeWidth={3} />
                  </button>
                  <div className="text-center">
                    <span className="text-[10px] text-zinc-300 tracking-widest block uppercase">PAGINA</span>
                    <span className="text-xl font-black text-zinc-900">{currentPage} / {totalPages}</span>
                  </div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                    className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-100 text-red-600 disabled:opacity-20 active:scale-95 transition-all">
                    <ChevronRight size={24} strokeWidth={3} />
                  </button>
                </div>
              )}
            </motion.div>

          ) : (
            // ─── TAB MENIU ──────────────────────────────────────────────────
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
              <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-zinc-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] tracking-widest text-zinc-400 border-b uppercase">
                        <th className="p-8">PRODUS</th>
                        <th className="p-8 text-center">GRAMAJ</th>
                        <th className="p-8 text-center">PREȚ</th>
                        <th className="p-8 text-right">STOC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map((item) => (
                        <tr key={item.id} className={`border-b transition-all ${!item.is_available ? "bg-red-50/20" : "hover:bg-zinc-50"}`}>
                          <td className="p-8">
                            <div className="flex items-center gap-6">
                              <img src={item.image_url} className={`w-16 h-16 rounded-2xl object-cover shadow-lg ${!item.is_available ? "grayscale opacity-40" : ""}`} alt="" />
                              <div>
                                <p className={`text-lg font-black leading-tight ${!item.is_available ? "text-zinc-400 line-through" : "text-zinc-900"}`}>{item.name}</p>
                                <p className="text-[10px] normal-case italic font-medium text-zinc-400 mt-1 line-clamp-1">{item.description || "FĂRĂ DESCRIERE"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-8 text-center text-zinc-400 font-bold text-sm">{item.weight || 0} gr</td>
                          <td className="p-8 text-center text-2xl text-red-600 font-black">{item.price} RON</td>
                          <td className="p-8 text-right">
                            <button
                              onClick={() => toggleAvailability(item.id, item.is_available)}
                              className={`px-6 py-3 rounded-2xl text-[9px] font-black tracking-widest transition-all ${item.is_available ? "bg-zinc-900 text-white" : "bg-red-600 text-white"}`}
                            >
                              {item.is_available ? "ONLINE" : "OFFLINE"}
                            </button>
                          </td>
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

      {/* MODAL ANULARE */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Anulează Comanda</h2>
              <p className="text-[10px] text-zinc-400 tracking-widest mb-6 normal-case font-bold">
                Clientul va fi notificat. Specificați motivul:
              </p>
              <textarea
                placeholder="Motiv anulare (opțional)..."
                className="w-full p-5 border rounded-2xl font-bold h-28 outline-none focus:ring-4 ring-red-50 border-gray-200 resize-none normal-case italic text-sm mb-6"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCancelModal(null)}
                  className="py-4 rounded-2xl border-2 border-zinc-200 text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-all">
                  Înapoi
                </button>
                <button onClick={handleCancel}
                  className="py-4 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">
                  Confirmă Anulare
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppSupportWidget />
    </div>
  );
}