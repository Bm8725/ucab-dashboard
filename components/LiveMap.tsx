"use client";
import { MapContainer, TileLayer, Marker, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";

// 1. REPARARE ICONIȚE (Folosim link-uri standard Leaflet)
const bikeIcon = L.icon({ 
  iconUrl: 'https://unpkg.com', 
  shadowUrl: 'https://unpkg.com',
  iconSize: [25, 41], iconAnchor: [12, 41] 
});

const pickupIcon = L.icon({ 
  iconUrl: 'https://cdn-icons-png.flaticon.com', 
  iconSize: [35, 35], iconAnchor: [17, 35] 
});

// 2. COMPONENTĂ DE CONTROL (Rezolvă ecranul alb)
function MapEffect({ lat, lng, pLat, pLng }: any) {
  const map = useMap();
  
  useEffect(() => {
    // FIX CRITIC: Forțează harta să se "trezească" și să randeze tiles-urile
    const timer = setTimeout(() => {
      map.invalidateSize(true);
      if (pLat && pLng && pLat !== 0) {
        const bounds = L.latLngBounds([[lat, lng], [pLat, pLng]]);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      } else {
        map.setView([lat, lng], 15, { animate: true });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [lat, lng, pLat, pLng, map]);

  return null;
}

export default function LiveMap({ lat, lng, pickup }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-[#FDFCF0]" />;

  const safeLat = lat || 44.4268;
  const safeLng = lng || 26.1025;
  const pLat = pickup ? pickup[0] : 0;
  const pLng = pickup ? pickup[1] : 0;

  return (
    <div className="w-full h-full relative" style={{ minHeight: '350px', background: '#FDFCF0' }}>
      <MapContainer 
        center={[safeLat, safeLng]} 
        zoom={15} 
        zoomControl={false}
        // FIX: Înălțimea trebuie să fie definită clar în stil
        style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }}
      >
        {/* TILE LAYER - Stil Wolt (Voyager) care se încarcă rapid */}
        <TileLayer 
          url="https://{s}://{z}/{x}/{y}{r}.png"
          attribution='&copy; UCAB FOOD'
        />
        
        <MapEffect lat={safeLat} lng={safeLng} pLat={pLat} pLng={pLng} />

        {lat && lng && <Marker position={[safeLat, safeLng]} icon={bikeIcon} />}
        
        {pLat !== 0 && (
          <Marker position={[pLat, pLng]} icon={pickupIcon} />
        )}

        {lat && pLat !== 0 && (
          <Polyline 
            positions={[[safeLat, safeLng], [pLat, pLng]]} 
            pathOptions={{ color: '#f97316', weight: 4, dashArray: '10, 15' }} 
          />
        )}
      </MapContainer>

      {/* CSS Forțat pentru z-index și Tiles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { background: #FDFCF0 !important; cursor: crosshair; }
        .leaflet-tile-pane { opacity: 1 !important; }
      `}} />
    </div>
  );
}
