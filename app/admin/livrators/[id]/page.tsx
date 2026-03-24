"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Bike, Power, MapPin, Package, Phone, 
  CheckCircle2, Navigation, Radio, Utensils, 
  ChevronRight, ShoppingBag, Zap, Clock, ShieldCheck, Loader2
} from "lucide-react";

// Harta se incarca doar pe client
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#FDFCF0] animate-pulse" />
});

export default function UcabMissionControl() {
  const { id } = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const watchId = useRef<number | null>(null);

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

    const channel = supabase.channel(`mission-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `driver_id=eq.${id}` }, 
      () => fetchActiveMission(id as string))
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id]);

  const fetchActiveMission = async (driverId: string) => {
    const { data } = await supabase.from("rides")
      .select("*, restaurants(name, address)")
      .eq("driver_id", driverId)
      .neq("status", "completed")
      .maybeSingle();
    setActiveRide(data);
  };

  const updateStatus = async (newStatus: string) => {
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
      watchId.current = navigator.geolocation.watchPosition(async (pos) => {
        await supabase.from("drivers").update({ 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        }).eq("id", id);
      }, null, { enableHighAccuracy: true });
    } else if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }
  };

  if (!driver) return <div className="h-screen bg-[#FDFCF0] flex items-center justify-center text-red-600 font-bold uppercase tracking-widest">Ucab_Connecting...</div>;

  return (
    <div className="h-screen w-full bg-[#FDFCF0] font-sans overflow-hidden flex flex-col relative">
      
      {/* 1. HARTA (BACKGROUND FULL) */}
      <div className="absolute inset-0 z-0">
        <LiveMap 
          lat={driver.lat} 
          lng={driver.lng} 
          pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : null}
          dropoff={activeRide ? [activeRide.dropoff_lat, activeRide.dropoff_lng] : null}
        />
      </div>

      {/* 2. PREMIUM HEADER (LIVRATOR INFO) */}
      <header className="relative z-10 p-4 max-w-lg mx-auto w-full">
        <div className="bg-white/95 backdrop-blur-xl border-b-4 border-red-600 rounded-[2.5rem] p-4 shadow-2xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${isOnline ? 'border-green-500' : 'border-zinc-200'}`}>
                <img src={driver.image_url || 'https://via.placeholder.com'} className={`w-full h-full object-cover ${!isOnline && 'grayscale'}`} alt="pfp" />
              </div>
              {isOnline && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-black leading-none uppercase italic tracking-tighter">{driver.full_name}</h1>
                <span className="bg-zinc-100 text-[8px] font-black px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-500">{driver.app_id || 'PRO'}</span>
              </div>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{driver.vehicle_type} • {driver.phone}</p>
            </div>
          </div>
          <button onClick={toggleDuty} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 border ${isOnline ? 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-200' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
            <Power size={20} />
          </button>
        </div>
      </header>

      {/* 3. INTERACTIVE BOTTOM CARDS */}
      <div className="mt-auto relative z-10 p-4 w-full max-w-lg mx-auto space-y-3">
        {activeRide ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase italic tracking-[0.2em]">Comandă Activă</span>
              <span className="text-zinc-300 font-black text-[10px]">#{activeRide.id.slice(0,5)}</span>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="bg-red-50 p-2 rounded-full mt-1"><MapPin size={16} className="text-red-600" /></div>
                <div>
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-tighter">De unde ridici:</p>
                  <p className="text-sm font-black text-black">{activeRide.restaurants?.name || 'Restaurant'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border-t border-zinc-50 pt-4">
                <div className="bg-zinc-50 p-2 rounded-full"><Navigation size={16} className="text-zinc-400" /></div>
                <div>
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-tighter">Destinație:</p>
                  <p className="text-sm font-black text-black italic">Adresă Securizată Client</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <a href={`tel:${driver.phone}`} className="col-span-1 bg-zinc-100 h-14 rounded-2xl flex items-center justify-center text-zinc-500"><Phone size={20} /></a>
              <button disabled={loadingAction} onClick={() => {
                if (activeRide.status === 'pending') updateStatus('accepted');
                else if (activeRide.status === 'accepted') updateStatus('picked_up');
                else updateStatus('completed');
              }} className="col-span-4 bg-red-600 h-14 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest">
                {loadingAction ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <CheckCircle2 size={18} />
                    {activeRide.status === 'pending' && 'Acceptă Misiunea'}
                    {activeRide.status === 'accepted' && 'Am Ridicat Comanda'}
                    {activeRide.status === 'picked_up' && 'Finalizează Livrarea'}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border border-white">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center relative">
                <Radio size={28} className="text-red-600 animate-pulse" />
                {isOnline && <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full" />}
              </div>
              <h3 className="text-lg font-black text-black uppercase italic tracking-tighter">{isOnline ? 'Căutăm comenzi...' : 'Ești Offline'}</h3>
              <div className="grid grid-cols-3 gap-6 w-full mt-4 border-t border-zinc-50 pt-6">
                <div className="text-center"><Zap size={14} className="mx-auto text-orange-400 mb-1" /><p className="text-[10px] font-black uppercase">Bat</p></div>
                <div className="text-center border-x border-zinc-50"><Clock size={14} className="mx-auto text-blue-400 mb-1" /><p className="text-[10px] font-black uppercase">Duty</p></div>
                <div className="text-center"><ShieldCheck size={14} className="mx-auto text-green-400 mb-1" /><p className="text-[10px] font-black uppercase">Safe</p></div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white/80 backdrop-blur-xl rounded-full p-4 flex justify-around shadow-xl border border-white/20">
          <Navigation size={22} className="text-red-600" />
          <div className="w-[1px] h-6 bg-zinc-100" />
          <ShoppingBag size={22} className="text-zinc-300" />
        </div>
      </div>
    </div>
  );
}
