"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import "mapbox-gl/dist/mapbox-gl.css";
import { Car, User, Navigation2, ShieldCheck, Zap, Globe } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface RideshareMapProps {
  lat?: number;
  lng?: number;
  pickup?: [number, number]; // [lat, lng]
}

export default function RideshareMap({ lat, lng, pickup }: RideshareMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Locație Pilot (Default București dacă datele lipsesc)
  const driverPos = useMemo<[number, number]>(() => [
    lng ?? 26.1025, 
    lat ?? 44.4268
  ], [lat, lng]);

  // Locație Pasager (Conversie pentru Mapbox [lng, lat])
  const passengerPos = useMemo<[number, number] | null>(() => 
    (pickup && pickup.length >= 2) ? [pickup[1], pickup[0]] : null, 
  [pickup]);

  // Auto-fit vizual: Încadrează ambii markeri pe ecran
  useEffect(() => {
    if (mapRef.current && passengerPos) {
      mapRef.current.fitBounds([driverPos, passengerPos] as [[number, number], [number, number]], {
        padding: 100,
        duration: 2000,
      });
    }
  }, [driverPos, passengerPos]);

  // Datele pentru linia de traseu (Path)
  const routeData: any = useMemo(() => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: passengerPos ? [driverPos, passengerPos] : [],
    },
  }), [driverPos, passengerPos]);

  if (!mounted) return <div className="w-full h-full bg-[#02060a] animate-pulse" />;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: driverPos[0],
          latitude: driverPos[1],
          zoom: 15,
          pitch: 55, // Unghi 3D imersiv
          bearing: -15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1" // Cel mai bun stil pentru condus noaptea
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* TRASEU ELECTRIC BLUE UCAB */}
        {passengerPos && (
          <Source id="ride-route" type="geojson" data={routeData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 5,
                "line-gradient": [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, "#3b82f6",
                  1, "#60a5fa"
                ],
                "line-opacity": 0.8
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round"
              }}
            />
          </Source>
        )}

        {/* MARKER PILOT (CAR) */}
        <Marker longitude={driverPos[0]} latitude={driverPos[1]} anchor="center">
          <div className="relative flex items-center justify-center">
            {/* Glow efect pulsatoriu */}
            <div className="absolute w-14 h-14 bg-blue-500/20 rounded-full animate-ping" />
            <div className="bg-blue-600 p-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.6)] border-2 border-white text-white z-10">
              <Car size={24} strokeWidth={2.5} />
            </div>
          </div>
        </Marker>

        {/* MARKER PASAGER (USER) */}
        {passengerPos && (
          <Marker longitude={passengerPos[0]} latitude={passengerPos[1]} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-white p-2 rounded-full shadow-2xl border-2 border-blue-600 text-blue-600 animate-bounce">
                <User size={20} fill="currentColor" />
              </div>
              <div className="mt-1 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                Pickup
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* UCAB TACTICAL OVERLAY */}
      <div className="absolute top-6 left-6 p-5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] shadow-2xl pointer-events-none">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={14} className="text-blue-500 animate-spin-slow" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">UCAB.RO_GRID</span>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">System_Status</span>
            <div className="flex items-center gap-2 text-green-400 font-black text-[10px] italic">
               <ShieldCheck size={12} />
               ENCRYPTED_LINK
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Pilot_Signal</span>
            <div className="flex items-center gap-2 text-blue-400 font-black text-xs italic">
               <Zap size={12} className="fill-blue-400" />
               STABLE_5G
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
             <p className="text-[9px] font-mono text-zinc-400">LOC: {driverPos[1].toFixed(4)}, {driverPos[0].toFixed(4)}</p>
          </div>
        </div>
      </div>

      {/* DASHBOARD INDICATOR DREAPTA (OPȚIONAL) */}
      <div className="absolute top-6 right-6">
         <div className="bg-blue-600/90 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 shadow-2xl flex items-center gap-2">
            <Navigation2 size={12} className="text-white fill-white" />
            <span className="text-[9px] font-black text-white tracking-widest uppercase">Live_Telemetry</span>
         </div>
      </div>
    </div>
  );
}
