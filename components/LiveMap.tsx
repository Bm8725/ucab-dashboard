"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Map, { Marker, Source, Layer, NavigationControl, MapRef } from 'react-map-gl/mapbox';

import "mapbox-gl/dist/mapbox-gl.css";
import { Bike, MapPin, Navigation } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface LiveMapProps {
  lat?: number;
  lng?: number;
  pickup?: [number, number]; // [lat, lng]
}

export default function LiveMap({ lat, lng, pickup }: LiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  
  // Coordonate sigure (Bucuresti default)
  const driverPos = useMemo<[number, number]>(() => [
    lng ?? 26.1025, 
    lat ?? 44.4268
  ], [lat, lng]);

  const pickupPos = useMemo<[number, number] | null>(() => 
    (pickup && pickup.length >= 2) ? [pickup[1], pickup[0]] : null, 
  [pickup]);

  // Calcul distanță aproximativă (Haversine simplificat) pentru UI
  const distance = useMemo(() => {
    if (!pickupPos) return null;
    const R = 6371; // km
    const dLat = (pickupPos[1] - driverPos[1]) * Math.PI / 180;
    const dLon = (pickupPos[0] - driverPos[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(driverPos[1] * Math.PI / 180) * Math.cos(pickupPos[1] * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  }, [driverPos, pickupPos]);

  // Auto-zoom inteligent
  useEffect(() => {
    if (mapRef.current && pickupPos) {
      const coords = [driverPos, pickupPos];
      const bounds = coords.reduce((acc, curr) => [
        [Math.min(acc[0][0], curr[0]), Math.min(acc[0][1], curr[1])],
        [Math.max(acc[1][0], curr[0]), Math.max(acc[1][1], curr[1])]
      ], [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]);

      mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
        padding: 100,
        duration: 2500,
      });
    }
  }, [driverPos, pickupPos]);

  const lineData: any = useMemo(() => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: pickupPos ? [driverPos, pickupPos] : [],
    },
  }), [driverPos, pickupPos]);

  if (!mounted) return <div className="w-full h-full bg-[#0c0c0c] animate-pulse" />;

  return (
    <div className="w-full h-full relative overflow-hidden rounded-3xl border border-white/5">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: driverPos[0],
          latitude: driverPos[1],
          zoom: 14,
          pitch: 45,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11" // Dark mode arată mai bine cu overlay-ul tău
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {pickupPos && (
          <Source id="route-source" type="geojson" data={lineData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#ff007a",
                "line-width": 2,
                "line-dasharray": [3, 2],
                "line-opacity": 0.6
              }}
            />
          </Source>
        )}

        <Marker longitude={driverPos[0]} latitude={driverPos[1]} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-14 h-14 bg-[#ff007a]/30 rounded-full animate-ping" />
            <div className="bg-[#ff007a] p-2.5 rounded-2xl shadow-[0_0_20px_rgba(255,0,122,0.5)] border-2 border-white text-white z-10">
              <Bike size={22} strokeWidth={2.5} />
            </div>
          </div>
        </Marker>

        {pickupPos && (
          <Marker longitude={pickupPos[0]} latitude={pickupPos[1]} anchor="bottom">
            <div className="bg-white p-2 rounded-xl shadow-2xl border-2 border-zinc-900 text-zinc-900 flex flex-col items-center gap-1">
              <MapPin size={18} fill="black" />
              <span className="text-[9px] font-bold uppercase tracking-tighter">Restaurant</span>
            </div>
          </Marker>
        )}

        <NavigationControl position="bottom-right" showCompass={false} />
      </Map>

      {/* DASHBOARD OVERLAY */}
      <div className="absolute top-6 left-6 p-5 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[180px]">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-[#ff007a] rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-[#ff007a] rounded-full blur-[4px] animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">Live_Tracking</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase font-bold">Status Traseu</span>
            <div className="flex items-center gap-2 text-white font-mono text-xs font-bold">
               <Navigation size={12} className="text-[#ff007a]" />
               {distance ? `${distance} KM până la destinație` : 'Calculare...'}
            </div>
          </div>
          
          <div className="h-[1px] bg-white/5 w-full" />
          
          <div className="text-[9px] font-mono text-zinc-400 flex justify-between uppercase">
            <span>Lat: {driverPos[1].toFixed(4)}</span>
            <span>Lng: {driverPos[0].toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
