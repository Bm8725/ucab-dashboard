"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import "mapbox-gl/dist/mapbox-gl.css";
import { Car, User, Compass, Crosshair, Zap, Navigation2 } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface RideshareMapProps {
  lat?: number;
  lng?: number;
  heading?: number; 
  pickup?: [number, number]; 
  suggestedRoute?: any; 
}

export default function RideshareMap({ lat, lng, heading, pickup, suggestedRoute }: RideshareMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mounted, setMounted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stabilizăm coordonatele pentru a evita eroarea de render
  const driverPos = useMemo<[number, number]>(() => [
    lng ?? 25.4585, 
    lat ?? 44.9315
  ], [lng, lat]);

  const passengerPos = useMemo<[number, number] | null>(() => 
    (pickup && pickup.length >= 2) ? [pickup[1], pickup[0]] : null, 
  [pickup]);

  const safeHeading = useMemo(() => heading ?? 0, [heading]);

  // --- LOGICĂ NAVIGAȚIE 3D ȘI URRMĂRIRE AUTOMATĂ (FIXED) ---
  useEffect(() => {
    if (mapRef.current && isFollowing) {
      mapRef.current.flyTo({
        center: driverPos,
        duration: 1000,
        essential: true,
        zoom: 17.5,
        pitch: 65,
        bearing: safeHeading, 
      });
    }
    // Dependențe stabile: driverPos este array memoizat, safeHeading e număr, isFollowing e bool
  }, [driverPos, safeHeading, isFollowing]);

  const handleRecenter = () => {
    setIsFollowing(true);
    mapRef.current?.flyTo({ 
      center: driverPos, 
      zoom: 18, 
      pitch: 70, 
      bearing: safeHeading, 
      duration: 1500 
    });
  };

  const routeData = useMemo(() => {
    if (suggestedRoute) return suggestedRoute;
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: passengerPos ? [driverPos, passengerPos] : [],
      },
    };
  }, [driverPos, passengerPos, suggestedRoute]);

  if (!mounted) return <div className="w-full h-full bg-[#02060a] flex items-center justify-center text-blue-500 font-black italic">UCAB_GRID_INITIALIZING...</div>;

  return (
    <div className="w-full h-full relative overflow-hidden font-sans">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: driverPos[0],
          latitude: driverPos[1],
          zoom: 16,
          pitch: 60,
          bearing: 0,
        }}
        dragRotate={false}
        touchZoomRotate={false}
        pitchWithRotate={false}
        onMoveStart={() => setIsFollowing(false)} 
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* RUTA ELECTRICĂ */}
        {passengerPos && (
          <Source id="ride-route" type="geojson" data={routeData}>
            <Layer
              id="route-glow"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 12,
                "line-blur": 8,
                "line-opacity": 0.4
              }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#60a5fa",
                "line-width": 5,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        )}

        {/* MAȘINA (Orientată 3D) */}
        <Marker longitude={driverPos[0]} latitude={driverPos[1]} anchor="center">
          <div 
            className="transition-transform duration-500 flex items-center justify-center"
            style={{ transform: `rotate(${safeHeading}deg)` }}
          >
            <div className="absolute w-20 h-20 bg-blue-500/20 rounded-full animate-pulse" />
            <div className="bg-blue-600 p-4 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.8)] border-2 border-white text-white z-10">
              <Car size={32} strokeWidth={2.5} />
            </div>
          </div>
        </Marker>

        {/* PASAGER */}
        {passengerPos && (
          <Marker longitude={passengerPos[0]} latitude={passengerPos[1]} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-white p-2 rounded-full shadow-2xl border-2 border-blue-600 text-blue-600 animate-bounce">
                <User size={24} fill="currentColor" />
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* CONTROALE NAVIGAȚIE */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-6">
        <button 
          onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 1000 })}
          className="bg-black/80 backdrop-blur-xl p-4 rounded-full border border-white/10 flex flex-col items-center shadow-2xl"
        >
          <span className="text-[12px] font-black text-blue-500 mb-1">N</span>
          <Compass size={28} />
        </button>

        <button 
          onClick={handleRecenter}
          className={`p-5 rounded-[2rem] border-2 transition-all shadow-2xl ${isFollowing ? 'bg-blue-600 border-white text-white scale-110 shadow-blue-500/50' : 'bg-black/80 border-white/10 text-zinc-500'}`}
        >
          <Crosshair size={32} />
        </button>
      </div>

      {/* OVERLAY TACTIC UCAB */}
      <div className="absolute top-6 left-6 p-5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] shadow-2xl pointer-events-none">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${isFollowing ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">
            UCAB<span className="text-blue-600">.RO</span>_NAV
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-blue-400 font-black text-xs italic uppercase">
               <Zap size={12} className="fill-blue-400" />
               {isFollowing ? 'AUTO_FOLLOW' : 'MANUAL'}
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 flex flex-col font-mono text-[9px] text-zinc-400">
             {driverPos[1].toFixed(5)} N / {driverPos[0].toFixed(5)} E
          </div>
        </div>
      </div>
    </div>
  );
}
