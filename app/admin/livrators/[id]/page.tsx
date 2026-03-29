/**livarators/[id]/page.tsx */

"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Bike, Power, MapPin, Phone, 
  CheckCircle2, Navigation, Loader2
} from "lucide-react";

// Incarcare dinamica a hartii pentru a preveni erorile de tip Window is not defined (SSR)
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#FDFCF0] animate-pulse flex items-center justify-center text-zinc-300 font-mono text-xs">INITIALIZING_MAP...</div>
});

export default function UcabMissionControl() {
  const { id } = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const watchId = useRef<number | null>(null);

  // Fetch misiune activa - definita cu useCallback pentru a fi refolosita in realtime
  const fetchActiveMission = useCallback(async (driverId: string) => {
    const { data } = await supabase.from("rides")
      .select("*, restaurants(name, address)")
      .eq("driver_id", driverId)
      .neq("status", "completed")
      .maybeSingle();
    setActiveRide(data);
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
      if (data) {
        setDriver(data);
        setIsOnline(data.is_online);
        fetchActiveMission(data.id);
      }
    }
    init();

    // Abonare la schimbarile de status ale comenzilor (Realtime)
    const channel = supabase.channel(`mission-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rides', 
        filter: `driver_id=eq.${id}` 
      }, () => fetchActiveMission(id as string))
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id, fetchActiveMission]);

  const updateStatus = async (newStatus: string) => {
    if (!activeRide) return;
    setLoadingAction(true);
    const { error } = await supabase
      .from("rides")
      .update({ 
        status: newStatus,
        ...(newStatus === 'completed' ? { completed_at: new Date() } : {})
      })
      .eq("id", activeRide.id);

    if (!error) {
      if (newStatus === 'completed') setActiveRide(null);
      else fetchActiveMission(id as string);
    }
    setLoadingAction(false);
  };

  const toggleDuty = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    await supabase.from("drivers").update({ is_online: nextState }).eq("id", id);
    
    if (nextState) {
      // Incepem urmarirea locatiei GPS
watchId.current = navigator.geolocation.watchPosition(
  async (pos) => {
    const { latitude, longitude } = pos.coords;

    // 1. Update imediat în interfața grafică (pentru marker-ul de pe hartă)
    setDriver((prev: any) => ({ 
      ...prev, 
      lat: latitude, 
      lng: longitude 
    }));

    try {
      // 2. Update în baza de date Supabase pentru dispecerat
      const { error } = await supabase
        .from("drivers")
        .update({ lat: latitude, lng: longitude })
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Eroare la update DB:", err);
    }
  },
  (err) => {
    console.error("Eroare Geolocation:", err);
  },
  { 
    enableHighAccuracy: true, // Folosește GPS-ul pentru precizie maximă
    maximumAge: 0,            // Nu folosi locații vechi din cache
    timeout: 5000             // Așteaptă maxim 5 secunde pentru un semnal
  }
);

    } else if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }
  };

  if (!driver) return <div className="h-screen bg-[#FDFCF0] flex items-center justify-center text-red-600 font-black uppercase tracking-[0.3em] animate-pulse">Ucab_Connecting...</div>;

  return (
    <div className="h-screen w-full bg-[#FDFCF0] font-sans overflow-hidden flex flex-col relative">
      
      {/* 1. HARTA (BACKGROUND) */}
      <div className="absolute inset-0 z-0">
        <LiveMap 
          lat={driver.lat} 
          lng={driver.lng} 
          pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : null}
        />
      </div>

      {/* 2. HEADER LIVRATOR */}
      <header className="relative z-10 p-4 max-w-lg mx-auto w-full">
        <div className="bg-white/90 backdrop-blur-2xl border-b-4 border-red-600 rounded-[2.5rem] p-4 shadow-2xl flex justify-between items-center border border-white/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all duration-500 ${isOnline ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-zinc-200'}`}>
                <img src={driver.image_url || 'https://api.dicebear.com'} className={`w-full h-full object-cover ${!isOnline && 'grayscale opacity-50'}`} alt="pfp" />
              </div>
              {isOnline && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-black leading-none uppercase italic tracking-tighter">{driver.full_name}</h1>
                <span className="bg-zinc-900 text-white text-[7px] font-black px-2 py-0.5 rounded-md italic uppercase">{driver.app_id || 'PRO'}</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{driver.vehicle_type} • {driver.phone}</p>
            </div>
          </div>
          <button onClick={toggleDuty} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 border-2 ${isOnline ? 'bg-green-500 text-white border-green-400 shadow-lg shadow-green-200' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
            <Power size={20} />
          </button>
        </div>
      </header>

      {/* 3. CARD INTERACTIV (MODAL JOS) */}
      <div className="mt-auto relative z-10 p-4 w-full max-w-lg mx-auto pb-8">
        {activeRide ? (
          <div className="bg-white rounded-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border border-white p-6 animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase italic tracking-[0.2em] animate-pulse">Misiune_Activă</span>
              <span className="text-zinc-300 font-mono text-[10px]">ID_{activeRide.id.slice(0,5)}</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-red-50 p-3 rounded-2xl"><MapPin size={18} className="text-red-600" /></div>
                <div>
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-tighter">Locație Ridicare:</p>
                  <p className="text-sm font-black text-black">{activeRide.restaurants?.name || 'Restaurant Partener'}</p>
                  <p className="text-[10px] text-zinc-500">{activeRide.restaurants?.address}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <a href={`tel:${driver.phone}`} className="col-span-1 bg-zinc-100 h-15 rounded-2xl flex items-center justify-center text-zinc-500 active:bg-zinc-200 transition-colors">
                <Phone size={20} />
              </a>
              <button 
                disabled={loadingAction} 
                onClick={() => {
                  if (activeRide.status === 'pending') updateStatus('accepted');
                  else if (activeRide.status === 'accepted') updateStatus('picked_up');
                  else updateStatus('completed');
                }} 
                className="col-span-4 bg-zinc-900 h-15 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-[11px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
              >
                {loadingAction ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <CheckCircle2 size={18} className="text-red-600" />
                    {activeRide.status === 'pending' && 'Confirmă Preluarea'}
                    {activeRide.status === 'accepted' && 'Am Ridicat Comanda'}
                    {activeRide.status === 'picked_up' && 'Finalizează Misiunea'}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-black/90 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Bike className="text-white" size={24} />
            </div>
            <h3 className="text-white font-black uppercase italic tracking-widest text-sm mb-1">Status: {isOnline ? 'Suntem online' : 'Offline'}</h3>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tighter">
              {isOnline ? 'Așteptăm comenzi noi din sistem...' : 'Activează butonul Power pentru a primi comenzi'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
