// 1. IMPORTURI CORECTE (Deno are nevoie de URL-uri complete)
import { serve } from "https://deno.land"
import { createClient } from "https://esm.sh"

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')

serve(async (req) => {
  try {
    const { record } = await req.json() // Datele vin de la Webhook (INSERT pe tabelul rides)

    // 2. COORDONATE (Format: longitude,latitude)
    const start = `${record.pickup_lng},${record.pickup_lat}`
    const end = `${record.dropoff_lng},${record.dropoff_lat}`

    // 3. URL MAPBOX CORECTAT (Lipseau 'directions/v5/mapbox/driving/')
    const url = `https://api.mapbox.com{start};${end}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    
    const resp = await fetch(url)
    const data = await resp.json()

    // Verificăm dacă Mapbox a găsit o rută
    if (!data.routes || data.routes.length === 0) {
      return new Response(JSON.stringify({ error: "No route found" }), { status: 404 })
    }

    const route = data.routes[0]

    // 4. CLIENT SUPABASE (Folosim Service Role Key pentru a trece de RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // 5. SALVARE ÎN TABELUL TĂU
    const { error } = await supabase.from('route_optimization').insert({
      ride_id: record.id,
      suggested_route: route.geometry, // Acesta este GeoJSON-ul pentru hartă
      distance_km: parseFloat((route.distance / 1000).toFixed(2)),
      estimated_time_min: Math.round(route.duration / 60)
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
