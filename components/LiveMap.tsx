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

  // Calcul distanță reală UCAB
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

  // Auto-zoom inteligent 3D
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

  if (!mounted) return <div className="w-full h-full bg-zinc-100 animate-pulse" />;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: driverPos[0],
          latitude: driverPos[1],
          zoom: 16,
          pitch: 60, // Efect 3D real
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/standard" // Full Color & Clădiri 3D
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* TRASEU ROȘU UCAB */}
        {pickupPos && (
          <Source id="route-source" type="geojson" data={lineData}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#ef4444",
                "line-width": 5,
                "line-opacity": 1
              }}
            />
          </Source>
        )}

        {/* MARKER PILOT UCAB */}
        <Marker longitude={driverPos[0]} latitude={driverPos[1]} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-14 h-14 bg-red-600/30 rounded-full animate-ping" />
            <div className="bg-red-600 p-3 rounded-2xl shadow-xl border-2 border-white text-white z-10">
              <Bike size={24} strokeWidth={3} />
            </div>
          </div>
        </Marker>

        {/* MARKER RESTAURANT */}
        {pickupPos && (
          <Marker longitude={pickupPos[0]} latitude={pickupPos[1]} anchor="bottom">
            <div className="bg-white p-2.5 rounded-2xl shadow-2xl border-2 border-zinc-900 text-zinc-900 flex flex-col items-center">
              <MapPin size={22} fill="#ef4444" className="text-red-600" />
            </div>
          </Marker>
        )}
      </Map>

      {/* DASHBOARD OVERLAY UCAB */}
      <div className="absolute top-6 left-6 p-5 bg-white/90 backdrop-blur-md border border-zinc-200 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
          <span className="text-[10px] font-black text-black uppercase italic tracking-widest leading-none">UCAB-FOOD</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-400 uppercase font-black tracking-widest">Mission</span>
            <div className="flex items-center gap-2 text-red-600 font-black text-sm italic leading-none">
               <Navigation size={14} className="rotate-45" />
               {distance ? `${distance} KM` : '--.--'}
            </div>
          </div>
          
          <div className="h-[1px] bg-zinc-100 w-full" />
          
          <div className="flex gap-4">
            <div>
              <p className="text-[6px] text-zinc-400 uppercase font-bold">Lat</p>
              <p className="text-[9px] font-mono text-black font-bold">{driverPos[1].toFixed(4)}</p>
            </div>
            <div>
              <p className="text-[6px] text-zinc-400 uppercase font-bold">Lng</p>
              <p className="text-[9px] font-mono text-black font-bold">{driverPos[0].toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
