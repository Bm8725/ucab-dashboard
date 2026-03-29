"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Power, MapPin, Phone, 
  Loader2, Navigation, ShieldCheck
} from "lucide-react";

// Incarcare dinamica pentru a evita eroarea "Window is not defined"
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#0c0c0c] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      <span className="text-[10px] text-zinc-500 font-mono tracking-[0.3em] uppercase animate-pulse">
        Initializing_Grid...
      </span>
    </div>
  )
});

export default function UcabMissionControl() {
  const params = useParams();
  const id = params?.id as string;
  
  const [driver, setDriver] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const watchId = useRef<number | null>(null);

  // Fetch misiune activa
  const fetchActiveMission = useCallback(async (driverId: string) => {
    const { data } = await supabase.from("rides")
      .select("*, restaurants(name, address)")
      .eq("driver_id", driverId)
      .neq("status", "completed")
      .maybeSingle();
    setActiveRide(data);
  }, []);

  useEffect(() => {
    if (!id) return;

    async function init() {
      const { data } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
      if (data) {
        setDriver(data);
        setIsOnline(data.is_online);
        fetchActiveMission(data.id);
      }
    }
    init();

    const channel = supabase.channel(`mission-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rides', 
        filter: `driver_id=eq.${id}` 
      }, () => fetchActiveMission(id))
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id, fetchActiveMission]);

  const updateStatus = async (newStatus: string) => {
    if (!activeRide) return;
    setLoadingAction(true);
    const { error } = await supabase
      .from("rides")
      .update({ 
        status: newStatus,
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      })
      .eq("id", activeRide.id);

    if (!error) {
      if (newStatus === 'completed') setActiveRide(null);
      else fetchActiveMission(id);
    }
    setLoadingAction(false);
  };

  const toggleDuty = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    
    await supabase.from("drivers").update({ is_online: nextState }).eq("id", id);
    
    if (nextState) {
      // Browser Geolocation (Corectat fara distanceFilter)
      watchId.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setDriver((prev: any) => ({ ...prev, lat: latitude, lng: longitude }));
          await supabase.from("drivers").update({ lat: latitude, lng: longitude }).eq("id", id);
        }, 
        (err) => console.error("GPS_ERROR:", err), 
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  if (!driver) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-1 bg-red-600 animate-bounce" />
      <span className="text-white font-black text-xs tracking-[0.5em] uppercase italic">Connecting_Ucab_OS</span>
    </div>
  );

  return (
    <div className="h-screen w-full bg-black font-sans overflow-hidden flex flex-col relative">
      
      {/* 1. HARTA (Z-INDEX 0) */}
      <div className="absolute inset-0 z-0">
        <LiveMap 
          lat={driver.lat} 
          lng={driver.lng} 
          pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : undefined}
        />
      </div>

      {/* 2. HEADER - FLOATING GLASSMORPHISM */}
      <header className="relative z-10 p-4 max-w-lg mx-auto w-full mt-2">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${isOnline ? 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-zinc-800'}`}>
                <img src={driver.image_url || `https://api.dicebear.com{driver.full_name}`} className="w-full h-full object-cover" alt="pfp" />
              </div>
              {isOnline && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border-2 border-black rounded-full animate-pulse" />}
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase italic tracking-tighter leading-tight">{driver.full_name}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{driver.vehicle_type}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className="text-[8px] text-red-500 font-black uppercase italic">Mission_Ready</span>
              </div>
            </div>
          </div>
          <button 
            onClick={toggleDuty} 
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${isOnline ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
          >
            <Power size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* 3. MISSION CARD (BOTTOM) */}
      <div className="mt-auto relative z-10 p-4 w-full max-w-lg mx-auto pb-10">
        {activeRide ? (
          <div className="bg-zinc-950/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-6 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                <span className="text-red-500 text-[8px] font-black uppercase tracking-widest">Live_Order</span>
              </div>
              <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest italic font-bold">#ORD_{activeRide.id.slice(0,6)}</span>
            </div>
            
            <div className="flex items-start gap-4 mb-8">
              <div className="bg-zinc-900 p-3 rounded-2xl border border-white/5 shadow-inner">
                <MapPin size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Destinație Ridicare</p>
                <p className="text-sm font-black text-white italic uppercase tracking-tight leading-none mb-1">{activeRide.restaurants?.name || 'Partner_Point'}</p>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight">{activeRide.restaurants?.address}</p>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3">
              <a href={`tel:${driver.phone}`} className="col-span-1 bg-zinc-900 h-14 rounded-2xl flex items-center justify-center text-zinc-400 border border-white/5 active:bg-zinc-800 transition-all shadow-xl">
                <Phone size={20} />
              </a>
              <button 
                disabled={loadingAction} 
                onClick={() => {
                  if (activeRide.status === 'pending') updateStatus('accepted');
                  else if (activeRide.status === 'accepted') updateStatus('picked_up');
                  else updateStatus('completed');
                }} 
                className="col-span-5 bg-white h-14 rounded-2xl flex items-center justify-center gap-3 text-black font-black text-[10px] shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all uppercase tracking-[0.2em] italic"
              >
                {loadingAction ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Navigation size={16} fill="black" />
                    {activeRide.status === 'pending' ? 'Acceptă Comanda' : 
                     activeRide.status === 'accepted' ? 'Am Ridicat Comanda' : 'Finalizează Livrarea'}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-black/60 backdrop-blur-md border border-white/5 p-4 rounded-[2rem] flex items-center justify-center gap-3">
             <ShieldCheck size={14} className="text-zinc-500" />
             <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.3em]">Waiting_For_Dispatch...</span>
          </div>
        )}
      </div>
    </div>
  );
}
