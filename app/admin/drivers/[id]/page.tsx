"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Power, MapPin, Phone, Loader2, Navigation, 
  User, Car, Shield, Clock, Bell, BellOff,
  MessageSquare, CheckCircle2,
  LayoutGrid, History, Settings, Star, Globe,
  Navigation2, CreditCard, Wallet, TrendingUp, Gauge, LogOut, ArrowLeft, ChevronRight
} from "lucide-react";

const LiveMap = dynamic(() => import("@/components/UcabMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#050a10] animate-pulse flex items-center justify-center text-blue-900 font-mono text-[10px]">RIDERS_GRID_INITIALIZING...</div>
});

export default function UcabRideshareControl() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  

    useEffect(() => {
    const link = document.querySelector("link[rel*='manifest']") as HTMLLinkElement;
    if (link) {
      link.href = "/manifest-ride.json";
    }
    document.title = "UCAB RIDE - PILOT PANEL";
  }, []);


  const [activeTab, setActiveTab] = useState<'grid' | 'log' | 'pilot'>('grid');
  const [driver, setDriver] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const watchId = useRef<number | null>(null);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      new Notification("UCAB.RO", { body: "Notificările PWA sunt active!", icon: "/icons/icon-192x192.png" });
    }
  };

  const fetchActiveRide = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const { data } = await supabase
      .from("rideshare_trips")
      .select(`*, passenger:passenger_id (id, full_name, phone, rating, avatar_url)`)
      .eq("driver_id", driverId)
      .not("status", "in", '("completed","cancelled")')
      .maybeSingle();

    if (data && !activeRide && Notification.permission === "granted") {
      new Notification("CURSĂ NOUĂ", { body: `Pasagerul ${data.passenger?.full_name} te așteaptă!` });
    }
    setActiveRide(data);
  }, [activeRide]);

  const fetchHistory = useCallback(async (driverId: string) => {
    if (!driverId) return;
    const { data } = await supabase
      .from("rideshare_trips")
      .select(`*, passenger:passenger_id (full_name)`)
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .order('created_at', { ascending: false })
      .limit(10);
    setRideHistory(data || []);
  }, []);

  useEffect(() => {
    if (!id) return;
    if ("Notification" in window && Notification.permission === "granted") setNotificationsEnabled(true);

    async function init() {
      const { data } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
      if (data) {
        setDriver(data);
        setIsOnline(data.is_online);
        fetchActiveRide(id);
        fetchHistory(id);
      }
    }
    init();

    const channel = supabase.channel(`rideshare-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideshare_trips', filter: `driver_id=eq.${id}` }, () => {
        fetchActiveRide(id);
        fetchHistory(id);
      }).subscribe();

    return () => { 
      supabase.removeChannel(channel);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [id, fetchActiveRide, fetchHistory]);

  const toggleDuty = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    await supabase.from("drivers").update({ is_online: nextState }).eq("id", id);
    if (nextState) {
      watchId.current = navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        await supabase.from("drivers").update({ lat: latitude, lng: longitude }).eq("id", id);
      }, null, { enableHighAccuracy: true });
    } else if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRide) return;
    setLoadingAction(true);
    await supabase.from("rideshare_trips").update({ 
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
    }).eq("id", activeRide.id);
    setLoadingAction(false);
  };

  const step = (() => {
    switch(activeRide?.status) {
      case 'requested': return { label: 'ACCEPTĂ PASAGER', next: 'accepted', color: 'bg-blue-600' };
      case 'accepted': return { label: 'AM AJUNS', next: 'arrived', color: 'bg-indigo-600' };
      case 'arrived': return { label: 'START CURSĂ', next: 'in_progress', color: 'bg-cyan-500' };
      case 'in_progress': return { label: 'FINALIZAT', next: 'completed', color: 'bg-emerald-600' };
      default: return { label: 'STANDBY', next: 'accepted', color: 'bg-zinc-800' };
    }
  })();

  if (!driver) return <div className="h-screen bg-[#02060a] flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-[#02060a] overflow-hidden flex flex-col relative font-sans text-white uppercase italic font-black">
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="max-w-xl mx-auto w-full pointer-events-auto">
          <div className="bg-blue-950/20 backdrop-blur-3xl border border-blue-500/20 rounded-[2.5rem] p-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 pl-2">
              <div className={`w-11 h-11 rounded-2xl border-2 transition-all ${isOnline ? 'border-blue-500' : 'border-zinc-800'}`}>
                <img src={driver.image_url || `https://api.dicebear.com{driver.full_name}`} alt="pfp" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-[10px] tracking-tighter leading-none">{driver.full_name}</h1>
                <span className="text-[7px] bg-blue-600 px-1.5 py-0.5 rounded italic mt-1 block w-fit">UCAB.RO</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={requestNotificationPermission} className={`p-3 rounded-xl transition-all ${notificationsEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-600 bg-zinc-900'}`}>
                 {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
               </button>
               <button onClick={toggleDuty} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                <Power size={22} strokeWidth={3} />
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* VIEWPORT */}
      <main className="flex-1 relative z-10 flex flex-col overflow-hidden">
        {activeTab === 'grid' && (
          <div className="relative flex-1 h-full">
            <LiveMap lat={driver.lat} lng={driver.lng} pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : undefined} />
            <div className="absolute bottom-28 left-0 right-0 p-4 z-20 pointer-events-auto max-w-lg mx-auto w-full">
                {activeRide ? (
                  <div className="bg-[#0a1118]/95 backdrop-blur-2xl rounded-[2.8rem] p-6 shadow-2xl border-t-4 border-blue-500 animate-in slide-in-from-bottom-20">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <img src={activeRide.passenger?.avatar_url || `https://api.dicebear.com`} className="w-12 h-12 rounded-full border-2 border-blue-500" alt="user" />
                            <div>
                                <h2 className="text-lg tracking-tighter">{activeRide.passenger?.full_name}</h2>
                                <p className="text-[9px] text-zinc-500 tracking-widest">CLIENT UCAB</p>
                            </div>
                        </div>
                        <button onClick={() => window.location.href=`tel:${activeRide.passenger?.phone}`} className="p-4 bg-blue-600 rounded-2xl active:scale-95"><Phone size={20} /></button>
                    </div>
                    <button onClick={() => updateStatus(step.next)} className={`w-full h-16 rounded-2xl ${step.color} text-white tracking-widest text-[10px] shadow-xl`}>
                        {loadingAction ? <Loader2 className="animate-spin mx-auto" /> : step.label}
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-950/40 backdrop-blur-xl border border-white/5 rounded-full py-4 px-8 text-center">
                    <p className="text-[10px] tracking-[0.3em] text-blue-500 animate-pulse">SCANNING_UCAB_GRID...</p>
                  </div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="flex-1 bg-[#02060a] p-6 pt-28 overflow-y-auto space-y-3 pb-32">
             <h2 className="text-[10px] text-blue-500 tracking-widest mb-6 border-l-2 border-blue-500 pl-4">RECENT_TERMINAL_LOGS</h2>
             {rideHistory.map((ride, i) => (
               <div key={i} className="bg-zinc-900/40 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Shield size={18}/></div>
                   <div><p className="text-xs">{ride.passenger?.full_name}</p><p className="text-[8px] text-zinc-500 font-mono italic">{new Date(ride.created_at).toLocaleTimeString()}</p></div>
                 </div>
                 <span className="text-sm text-blue-400">+{ride.estimated_price} RON</span>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'pilot' && (
          <div className="flex-1 bg-[#02060a] p-6 pt-28 overflow-y-auto pb-32">
            <div className="max-w-xl mx-auto space-y-6">
                {/* PROFIL PILOT */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-8 text-center backdrop-blur-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                    <div className="w-28 h-28 rounded-[2.5rem] border-4 border-blue-600 mx-auto mb-4 overflow-hidden p-1">
                        <img src={driver.image_url || `https://api.dicebear.com{driver.full_name}`} className="w-full h-full object-cover rounded-[2rem]" alt="pilot" />
                    </div>
                    <h2 className="text-2xl tracking-tighter">{driver.full_name}</h2>
                    <p className="text-blue-500 text-[10px] tracking-[0.4em] mt-1">PILOT_OFFICER_UCAB</p>
                    
                    <div className="grid grid-cols-3 gap-2 mt-8">
                        <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[7px] text-zinc-500">RATING</p><p className="text-sm text-yellow-500">4.98</p></div>
                        <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[7px] text-zinc-500">YEARS</p><p className="text-sm">2.4</p></div>
                        <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[7px] text-zinc-500">LEVEL</p><p className="text-sm text-blue-400">PRO</p></div>
                    </div>
                </div>

                {/* FINANCIAL & SETTINGS */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2.8rem] p-8 shadow-2xl relative overflow-hidden">
                    <p className="text-[10px] text-blue-100 opacity-60 mb-2">WALLET_BALANCE</p>
                    <h3 className="text-5xl tracking-tighter leading-none mb-10">{driver.wallet_balance || 0} <span className="text-sm">RON</span></h3>
                    <div className="flex gap-3">
                        <button className="flex-1 bg-white/20 backdrop-blur-xl py-4 rounded-2xl text-[10px]">RETRAGE</button>
                        <button className="flex-1 bg-white text-blue-600 py-4 rounded-2xl text-[10px]">STATISTICI</button>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-4 space-y-2">
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-blue-600 transition-all group">
                        <div className="flex items-center gap-4"><Car size={20}/><span className="text-xs uppercase leading-none">{driver.vehicle_brand} {driver.vehicle_model}</span></div>
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={() => router.push('/admin/fleet')} className="w-full flex items-center justify-between p-5 bg-red-600/10 rounded-2xl border border-red-500/20 text-red-500">
                        <div className="flex items-center gap-4 text-[10px] tracking-widest uppercase font-black"><LogOut size={18} /><span>LOGOUT_TERMINAL</span></div>
                    </button>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* DOCK */}
      <footer className="fixed bottom-6 left-0 right-0 z-50 px-6 pointer-events-none">
        <div className="max-w-xs mx-auto w-full pointer-events-auto">
          <nav className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl">
            <button onClick={() => setActiveTab('grid')} className={`flex-1 py-4 flex flex-col items-center transition-all ${activeTab === 'grid' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
              <LayoutGrid size={22} strokeWidth={activeTab === 'grid' ? 3 : 2} />
              <span className="text-[7px] mt-1">GRID</span>
            </button>
            <button onClick={() => setActiveTab('log')} className={`flex-1 py-4 flex flex-col items-center transition-all ${activeTab === 'log' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
              <History size={22} strokeWidth={activeTab === 'log' ? 3 : 2} />
              <span className="text-[7px] mt-1">LOGS</span>
            </button>
            <button onClick={() => setActiveTab('pilot')} className={`flex-1 py-4 flex flex-col items-center transition-all ${activeTab === 'pilot' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
              <User size={22} strokeWidth={activeTab === 'pilot' ? 3 : 2} />
              <span className="text-[7px] mt-1">PILOT</span>
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
