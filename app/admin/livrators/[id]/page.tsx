"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Power, MapPin, Phone, Loader2, Navigation, 
  Package, ShoppingBag, Receipt, Clock, 
  MessageSquare, MoreHorizontal, CheckCircle2,
  LayoutGrid, History, User, Settings, XCircle, Info, Star, Globe
} from "lucide-react";

// Încărcare dinamică a hărții pentru a evita erorile de SSR
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0c0c0c] animate-pulse flex items-center justify-center text-zinc-800 font-mono text-[10px]">UCAB_GRID_INITIALIZING...</div>
});

export default function UcabMissionControl() {
  const params = useParams();
  const id = params?.id as string;
  
  // State-uri pentru Navigație (Tabs)
  const [activeTab, setActiveTab] = useState<'grid' | 'log' | 'pilot' | 'core'>('grid');
  
  // State-uri Date
  const [driver, setDriver] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const watchId = useRef<number | null>(null);

  // 1. FETCH MISIUNE ACTIVĂ (JOIN CU ORDERS)
  const fetchActiveMission = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const { data, error } = await supabase
      .from("rides")
      .select(`
        *,
        order:order_id (
          id, items, total_amount, delivery_address, 
          customer_name, customer_phone, restaurant_name,
          notes
        )
      `)
      .eq("driver_id", driverId)
      .not("status", "eq", "completed")
      .maybeSingle();

    if (error) console.error("Fetch Mission Error:", error);
    setActiveRide(data);
  }, []);

  // 2. FETCH ISTORIC (LOG)
  const fetchHistory = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const { data } = await supabase
      .from("rides")
      .select(`*, order:order_id (restaurant_name, total_amount)`)
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .order('completed_at', { ascending: false })
      .limit(15);
    setRideHistory(data || []);
  }, []);

  useEffect(() => {
    if (!id) return;

    async function init() {
      const { data } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
      if (data) {
        setDriver(data);
        setIsOnline(data.is_online);
        fetchActiveMission(id);
        fetchHistory(id);
      }
    }
    init();

    const channel = supabase.channel(`ucab-core-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rides', 
        filter: `driver_id=eq.${id}` 
      }, () => {
        fetchActiveMission(id);
        fetchHistory(id);
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id, fetchActiveMission, fetchHistory]);

  const updateStatus = async (newStatus: string) => {
    if (!activeRide) return;
    setLoadingAction(true);
    
    const { error } = await supabase.from("rides").update({ 
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
    }).eq("id", activeRide.id);

    if (!error) {
      if (newStatus === 'completed') {
        setActiveRide(null);
        setShowDetails(false);
        fetchHistory(id);
      } else {
        fetchActiveMission(id);
      }
    }
    setLoadingAction(false);
  };

  const toggleDuty = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    await supabase.from("drivers").update({ is_online: nextState }).eq("id", id);
    
    if (nextState) {
      watchId.current = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setDriver((prev: any) => ({ ...prev, lat: latitude, lng: longitude }));
        await supabase.from("drivers").update({ lat: latitude, lng: longitude }).eq("id", id);
      }, (err) => console.error("GPS_ERROR:", err), { enableHighAccuracy: true });
    } else if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const getStep = () => {
    switch(activeRide?.status) {
      case 'pending': return { label: 'ACCEPTĂ MISIUNEA', next: 'accepted', color: 'bg-[#ff007a]' };
      case 'accepted': return { label: 'AM RIDICAT COLETUL', next: 'picked_up', color: 'bg-blue-600' };
      case 'picked_up': return { label: 'FINALIZEAZĂ LIVRAREA', next: 'completed', color: 'bg-green-600' };
      default: return { label: 'CONFIRMĂ', next: 'accepted', color: 'bg-zinc-900' };
    }
  };

  if (!driver) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="text-[#ff007a] animate-spin" /></div>;

  const step = getStep();

  // Navigație pură prin coordonatele Mapbox
  const handleNavigation = () => {
    if (!activeRide) return;
    const target = activeRide.status === 'picked_up' 
      ? `geo:0,0?q=${encodeURIComponent(activeRide.order?.delivery_address || "")}` 
      : `geo:${activeRide.pickup_lat},${activeRide.pickup_lng}?z=18`;
    window.location.href = target;
  };

  return (
    <div className="h-screen w-full bg-[#0c0c0c] overflow-hidden flex flex-col relative font-sans text-white">
      
      {/* HEADER - UCAB DYNAMIC ISLAND */}
      <header className="relative z-20 p-4 max-w-xl mx-auto w-full">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] p-3 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${isOnline ? 'border-[#ff007a]' : 'border-zinc-800'}`}>
              <img src={driver.image_url || `https://api.dicebear.com{driver.full_name}`} alt="pfp" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <h1 className="text-xs font-black uppercase italic tracking-tighter">{driver.full_name}</h1>
                <span className="text-[7px] bg-[#ff007a] px-1.5 py-0.5 rounded font-black italic">UCAB.RO</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-black uppercase mt-1 block tracking-widest">{driver.vehicle_type} • {isOnline ? 'ONLINE' : 'STANDBY'}</span>
            </div>
          </div>
          <button onClick={toggleDuty} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-[#ff007a] text-white' : 'bg-zinc-900 text-zinc-600'}`}>
            <Power size={22} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        
        {activeTab === 'grid' && (
          <>
            <div className="absolute inset-0 z-0">
              <LiveMap lat={driver.lat} lng={driver.lng} pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : undefined} />
            </div>
            
            <div className="absolute top-4 right-6 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] italic text-white/60">ucab_food_network</span>
            </div>

            <div className="mt-auto p-4 w-full max-w-xl mx-auto pb-28">
              {activeRide ? (
                <div className="bg-white rounded-[2.8rem] p-7 shadow-2xl animate-in slide-in-from-bottom-60 duration-700 border-t-4 border-[#ff007a]">
                  <div className="flex justify-between items-start mb-6 border-b border-zinc-100 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#ff007a] shadow-inner"><ShoppingBag size={24} /></div>
                      <div>
                         <p className="text-[9px] text-zinc-400 font-black uppercase mb-1.5 leading-none">Misiune_Ucab_Food</p>
                         <h2 className="text-zinc-900 font-black text-base uppercase italic leading-none">{activeRide.order?.restaurant_name || 'Restaurant'}</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-900 font-black text-xl italic">{activeRide.order?.total_amount} <span className="text-xs">RON</span></p>
                      <p className="text-[#ff007a] text-[8px] font-black uppercase mt-1 italic tracking-widest">CASH_SYSTEM</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-8 px-1">
                    <ActionButton icon={<Navigation size={20}/>} label="Traseu" onClick={handleNavigation} active={true} />
                    <ActionButton icon={<Phone size={20}/>} label="Sună" href={`tel:${activeRide.order?.customer_phone}`} />
                    <ActionButton icon={<MessageSquare size={20}/>} label="Chat" onClick={() => alert("Chat inactiv momentan")} />
                    <ActionButton icon={<MoreHorizontal size={20}/>} label="Detalii" onClick={() => setShowDetails(!showDetails)} active={showDetails} />
                  </div>

                  {showDetails && (
                    <div className="mb-6 p-5 bg-zinc-50 rounded-[2rem] border border-zinc-100 animate-in zoom-in-95">
                      <div className="space-y-2">
                        {activeRide.order?.items?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[11px] font-bold text-zinc-800 uppercase italic">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-zinc-400">{item.price} lei</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button disabled={loadingAction} onClick={() => updateStatus(step.next)} className={`w-full ${step.color} h-18 rounded-[2.2rem] flex items-center justify-center gap-3 text-white font-black text-xs uppercase italic tracking-[0.3em] shadow-2xl active:scale-95 transition-all`}>
                    {loadingAction ? <Loader2 className="animate-spin" /> : step.label}
                  </button>
                </div>
              ) : (
                <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6 shadow-2xl">
                   <div className="w-16 h-16 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/5"><Loader2 size={28} className="text-[#ff007a] animate-spin" /></div>
                   <h2 className="text-white font-black text-sm uppercase italic tracking-[0.2em]">Căutăm Misiuni_Ucab_Food</h2>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'log' && (
          <div className="p-4 pt-4 overflow-y-auto pb-32 max-w-xl mx-auto w-full animate-in fade-in slide-in-from-right-5">
            <div className="flex justify-between items-end mb-8 px-2">
              <h2 className="text-sm font-black uppercase italic tracking-widest">LOG_ISTORIC</h2>
              <span className="text-[10px] text-[#ff007a] font-black italic tracking-tighter uppercase">ucab.ro/food</span>
            </div>
            <div className="space-y-3">
              {rideHistory.length > 0 ? rideHistory.map((ride) => (
                <div key={ride.id} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex justify-between items-center shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/10 p-3 rounded-2xl"><CheckCircle2 className="text-green-500" size={20} /></div>
                    <div>
                      <p className="text-[11px] font-black uppercase italic text-white">{ride.order?.restaurant_name}</p>
                      <p className="text-[9px] text-zinc-600 font-mono mt-1">{new Date(ride.completed_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-black text-sm italic">{ride.order?.total_amount} RON</p>
                </div>
              )) : <p className="text-center text-zinc-600 py-20 font-black uppercase text-[10px] tracking-widest italic opacity-30">Nicio_misiune_finalizată</p>}
            </div>
          </div>
        )}

        {activeTab === 'pilot' && (
          <div className="p-6 max-w-xl mx-auto w-full animate-in fade-in slide-in-from-right-5">
            <div className="bg-white/5 border border-white/5 p-10 rounded-[3rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Globe size={120} /></div>
              <div className="relative w-28 h-28 mx-auto">
                <img src={driver.image_url || `https://api.dicebear.com{driver.full_name}`} alt="pilot" className="w-full h-full object-cover rounded-[2.5rem] border-4 border-white/5 shadow-2xl" />
                <div className="absolute -bottom-2 -right-2 bg-[#ff007a] p-2 rounded-xl border-2 border-[#0c0c0c] shadow-lg"><Star size={16} fill="white" /></div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase italic leading-none">{driver.full_name}</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 tracking-widest leading-none">Official_Ucab_Pilot</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                  <p className="text-[8px] text-zinc-500 font-black uppercase mb-1 tracking-widest">Misiuni Totale</p>
                  <p className="text-2xl font-black italic">{rideHistory.length}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                  <p className="text-[8px] text-zinc-500 font-black uppercase mb-1 tracking-widest">Rating Pilot</p>
                  <p className="text-2xl font-black italic">4.98</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NAVBAR JOS - UCAB SYSTEM */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 p-4 max-w-xl mx-auto pointer-events-none">
        <div className="bg-black/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl pointer-events-auto">
          <NavBtn icon={<LayoutGrid size={24}/>} label="GRID" active={activeTab === 'grid'} onClick={() => setActiveTab('grid')} />
          <NavBtn icon={<History size={24}/>} label="LOG" active={activeTab === 'log'} onClick={() => setActiveTab('log')} />
          
          <div onClick={() => setActiveTab('grid')} className="relative -translate-y-4 w-15 h-15 bg-[#ff007a] rounded-full flex items-center justify-center text-white border-4 border-[#0c0c0c] shadow-[0_0_30px_#ff007a40] active:scale-90 transition-all cursor-pointer">
             <MapPin size={28} />
          </div>
          
          <NavBtn icon={<User size={24}/>} label="PILOT" active={activeTab === 'pilot'} onClick={() => setActiveTab('pilot')} />
          <NavBtn icon={<Settings size={24}/>} label="CORE" active={activeTab === 'core'} onClick={() => setActiveTab('core')} />
        </div>
      </nav>
    </div>
  );
}

// HELPERS
function ActionButton({ icon, label, href, onClick, active = false }: any) {
  const content = (
    <div className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${active ? 'bg-zinc-100' : 'active:bg-zinc-50'}`}>
      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center border ${active ? 'bg-white border-[#ff007a] text-[#ff007a]' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase italic ${active ? 'text-[#ff007a]' : 'text-zinc-400'}`}>{label}</span>
    </div>
  );
  return href ? <a href={href} className="no-underline">{content}</a> : <button onClick={onClick}>{content}</button>;
}

function NavBtn({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 p-3">
      <div className={`${active ? 'text-[#ff007a]' : 'text-zinc-700 transition-colors'}`}>{icon}</div>
      <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${active ? 'text-white' : 'text-zinc-700'}`}>{label}</span>
    </button>
  );
}
