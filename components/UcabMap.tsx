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

  // Coordonate Pilot [lng, lat]
  const driverPos = useMemo<[number, number]>(() => [
    lng ?? 26.1025, 
    lat ?? 44.4268
  ], [lat, lng]);

  // Coordonate Pasager [lng, lat]
  const passengerPos = useMemo<[number, number] | null>(() => 
    (pickup && pickup.length >= 2) ? [pickup[1], pickup[0]] : null, 
  [pickup]);

  // 1. URMARIRE AUTOMATĂ ȘOFER (Auto-centering)
  // Când lat/lng se schimbă în baza de date, harta se mută lin după șofer
  useEffect(() => {
    if (mapRef.current && !passengerPos) {
      mapRef.current.flyTo({
        center: driverPos,
        speed: 0.8,
        curve: 1,
        essential: true,
        bearing: 0, // Forțează Nordul în timpul mișcării
        pitch: 45
      });
    }
  }, [driverPos, passengerPos]);

  // 2. AUTO-FIT VIZUAL (Când apare pasagerul)
  useEffect(() => {
    if (mapRef.current && passengerPos) {
      mapRef.current.fitBounds([driverPos, passengerPos] as [[number, number], [number, number]], {
        padding: 100,
        duration: 2000,
        bearing: 0, // Menține Nordul sus după încadrare
        pitch: 45
      });
    }
  }, [driverPos, passengerPos]);

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
          pitch: 45,
          bearing: 0, // Începe orientat spre NORD
        }}
        // --- BLOCARE ORIENTARE NORD ---
        bearing={0}               // Forțează valoarea 0 (Nord)
        dragRotate={false}        // Dezactivează rotirea cu degetele/click-dreapta
        touchZoomRotate={false}   // Permite zoom, dar interzice rotirea pe mobil
        pitchWithRotate={false}   // Blochează schimbarea unghiului 3D prin rotire
        // ------------------------------
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* TRASEU UCAB */}
        {passengerPos && (
          <Source id="ride-route" type="geojson" data={routeData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 5,
                "line-opacity": 0.8
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        )}

        {/* MARKER PILOT (CAR) */}
        <Marker longitude={driverPos[0]} latitude={driverPos[1]} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-14 h-14 bg-blue-500/20 rounded-full animate-ping" />
            <div className="bg-blue-600 p-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.6)] border-2 border-white text-white z-10 transition-transform duration-500">
              <Car size={24} strokeWidth={2.5} />
            </div>
          </div>
        </Marker>

        {/* MARKER PASAGER */}
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

      {/* TACTICAL OVERLAY */}
      <div className="absolute top-6 left-6 p-5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] shadow-2xl pointer-events-none">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">NORTH_LOCKED</span>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Telemetry</span>
            <div className="flex items-center gap-2 text-green-400 font-black text-[10px] italic">
               <ShieldCheck size={12} /> LIVE_SYNC
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 font-mono text-[9px] text-zinc-400">
             {driverPos[1].toFixed(5)} N / {driverPos[0].toFixed(5)} E
          </div>
        </div>
      </div>
    </div>
  );
}
