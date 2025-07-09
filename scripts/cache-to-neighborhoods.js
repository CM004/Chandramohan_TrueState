// Node.js script to convert api-cache.json to neighborhoods.json
// Usage: node scripts/cache-to-neighborhoods.js

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../cache/api-cache.json');
const OUTPUT_PATH = path.join(__dirname, '../neighborhoods.json');

// Helper: Capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractNeighborhoodsFromCache(cache) {
  // Find all unique neighborhoods by parsing cache keys
  const neighborhoods = {};
  for (const key of Object.keys(cache)) {
    // Example keys: location_bandra west_mumbai, poi_19.076_72.8777_2000, weather_19.076_72.8777
    if (key.startsWith('location_')) {
      const parts = key.replace('location_', '').split('_');
      const city = capitalize(parts.pop());
      const name = capitalize(parts.join(' '));
      const loc = cache[key].data || cache[key];
      if (!name || !city) continue;
      const nKey = `${name}|${city}`;
      if (!neighborhoods[nKey]) {
        neighborhoods[nKey] = {
          name,
          city,
          lat: loc.lat || loc.lng || loc.centerLat || null,
          lon: loc.lng || loc.lon || loc.centerLon || null,
        };
      }
      neighborhoods[nKey].lat = loc.lat || neighborhoods[nKey].lat;
      neighborhoods[nKey].lon = loc.lng || neighborhoods[nKey].lon;
      neighborhoods[nKey].displayName = loc.displayName || undefined;
    }
  }
  // Now, for each neighborhood, try to add POI, weather, etc.
  for (const nKey of Object.keys(neighborhoods)) {
    const n = neighborhoods[nKey];
    // Try to find POI and weather by lat/lon
    if (n.lat && n.lon) {
      const poiKey = `poi_${n.lat}_${n.lon}_2000`;
      const weatherKey = `weather_${n.lat}_${n.lon}`;
      const poi = cache[poiKey] && (cache[poiKey].data || cache[poiKey]);
      const weather = cache[weatherKey] && (cache[weatherKey].data || cache[weatherKey]);
      // Features (use defaults if missing)
      n.safety = 7;
      n.walkability = 5;
      n.healthcare = 5;
      n.fastInternet = 8;
      n.affordability = 5;
      n.restaurants = 5;
      n.publicTransport = 5;
      n.parksGreenery = 5;
      // --- Safety ---
      if (poi && poi.police) n.safety = Math.min(10, 5 + poi.police);
      if (weather && weather.precipitation > 30) n.safety = Math.max(2, n.safety - 2);
      // --- Walkability ---
      if (poi && poi.footways) n.walkability = Math.min(10, 5 + poi.footways);
      // --- Healthcare ---
      if (poi && poi.hospitals) n.healthcare = Math.min(10, 5 + poi.hospitals);
      // --- Restaurants ---
      if (poi && poi.restaurants) n.restaurants = Math.min(10, 5 + poi.restaurants);
      // --- Public Transport ---
      if (poi && poi.busStops) n.publicTransport = Math.min(10, 5 + poi.busStops);
      // --- Parks & Greenery ---
      if (poi && poi.parks) n.parksGreenery = Math.min(10, 5 + poi.parks);
      // --- Fast Internet, Affordability ---
      // (No direct API, keep defaults or add logic if you have more data)
    }
  }
  // Return as array
  return Object.values(neighborhoods);
}

function main() {
  if (!fs.existsSync(CACHE_PATH)) {
    console.error('❌ api-cache.json not found!');
    process.exit(1);
  }
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  const neighborhoods = extractNeighborhoodsFromCache(cache);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(neighborhoods, null, 2));
  console.log(`✅ Extracted ${neighborhoods.length} neighborhoods to neighborhoods.json`);
}

main(); 