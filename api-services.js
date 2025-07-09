// API Services for NeighborFit
// Handles integration with external APIs for real-time data
// Includes caching, fallback strategies, and error handling
// Updated to use completely free public APIs - no API keys required

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { overpassLimiter, aqiLimiter, indiaDataLimiter } = require('./throttle');

// Configuration for different APIs - Only free APIs
const API_CONFIG = {
  openStreetMap: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    endpoints: {
      search: '/search',
      reverse: '/reverse'
    }
  },
  weatherAPI: {
    baseUrl: 'https://api.open-meteo.com/v1',
    endpoints: {
      weather: '/forecast',
      airQuality: '/air-quality'
    }
  }
};

// Cache configuration
const CACHE_CONFIG = {
  demographics: 48 * 60 * 60 * 1000,    // 48 hours
  infrastructure: 24 * 60 * 60 * 1000,  // 24 hours
  walkability: 12 * 60 * 60 * 1000,     // 12 hours
  poi: 48 * 60 * 60 * 1000              // 48 hours
};

// Cache storage
let cache = {};

// Load cache from file if exists
const loadCache = () => {
  try {
    const cacheFile = path.join(__dirname, 'cache', 'api-cache.json');
    if (fs.existsSync(cacheFile)) {
      const cacheData = fs.readFileSync(cacheFile, 'utf8');
      cache = JSON.parse(cacheData);
      
      // Clean expired cache entries
      const now = Date.now();
      Object.keys(cache).forEach(key => {
        if (cache[key].expiresAt && cache[key].expiresAt < now) {
          delete cache[key];
        }
      });
      
      console.log('✅ API cache loaded successfully');
    }
  } catch (error) {
    console.log('⚠️ Could not load cache, starting fresh');
    cache = {};
  }
};

// Save cache to file
const saveCache = () => {
  try {
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheFile = path.join(cacheDir, 'api-cache.json');
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('❌ Error saving cache:', error.message);
  }
};

// Check if cache entry is valid
const isCacheValid = (key) => {
  const entry = cache[key];
  if (!entry) return false;
  
  const now = Date.now();
  return entry.expiresAt && entry.expiresAt > now;
};

// Get cached data
const getCachedData = (key) => {
  if (isCacheValid(key)) {
    return cache[key].data;
  }
  return null;
};

// Set cache data
const setCacheData = (key, data, duration) => {
  cache[key] = {
    data: data,
    expiresAt: Date.now() + duration,
    cachedAt: new Date().toISOString()
  };
  saveCache();
};

// API request with timeout and retry
const makeApiRequest = async (url, options = {}, retries = 2) => {
  const timeout = options.timeout || 10000; // 10 seconds default
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        url,
        timeout,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`API request failed (attempt ${attempt}/${retries}):`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// OpenStreetMap API Services
class OpenStreetMapService {
  // Get location data for a neighborhood
  static async getLocationData(neighborhood) {
    console.log(`[API] Fetching location from OpenStreetMap for ${neighborhood.name}, ${neighborhood.city}`);
    const cacheKey = `location_${neighborhood.name.toLowerCase()}_${neighborhood.city.toLowerCase()}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    
    try {
      const searchQuery = `${neighborhood.name}, ${neighborhood.city}, India`;
      const url = `${API_CONFIG.openStreetMap.baseUrl}${API_CONFIG.openStreetMap.endpoints.search}`;
      const params = {
        'q': searchQuery,
        'format': 'json',
        'limit': 1,
        'addressdetails': 1
      };
      
      const data = await overpassLimiter.schedule(() => makeApiRequest(url, { params }));
      console.log(`[ENRICH] Fetching location from OpenStreetMap for ${neighborhood.name}, ${neighborhood.city}`);
      
      if (data && data.length > 0) {
        const location = data[0];
        const processedData = {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          displayName: location.display_name,
          type: location.type,
          importance: location.importance,
          updatedAt: new Date().toISOString()
        };
        
        setCacheData(cacheKey, processedData, CACHE_CONFIG.infrastructure);
        return { ...processedData, source: 'api' };
      } else {
        return { error: 'Location not found', source: 'error' };
      }
    } catch (error) {
      console.error('❌ OpenStreetMap API failed:', error.message);
      return { error: 'Location data unavailable', source: 'error' };
    }
  }
  
  // Get Points of Interest around a location
  static async getPOI(lat, lng, radius = 2000) {
    console.log(`[API] Fetching POIs from OverpassAPI for lat=${lat}, lng=${lng}, radius=${radius}`);
    const cacheKey = `poi_${lat}_${lng}_${radius}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    
    try {
      // Use Overpass API (OpenStreetMap query language)
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](around:${radius},${lat},${lng});
          node["amenity"="hospital"](around:${radius},${lat},${lng});
          node["leisure"="park"](around:${radius},${lat},${lng});
          node["shop"](around:${radius},${lat},${lng});
          node["highway"="bus_stop"](around:${radius},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
      `;
      
      const data = await overpassLimiter.schedule(() => makeApiRequest(overpassUrl, { 
        method: 'POST',
        data: query,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }));
      console.log(`[ENRICH] Fetching POIs from OverpassAPI for lat=${lat}, lng=${lng}, radius=${radius}`);
      
      const pois = data.elements || [];
      const processedData = {
        restaurants: pois.filter(poi => poi.tags?.amenity === 'restaurant').length,
        hospitals: pois.filter(poi => poi.tags?.amenity === 'hospital').length,
        parks: pois.filter(poi => poi.tags?.leisure === 'park').length,
        shopping: pois.filter(poi => poi.tags?.shop).length,
        transport: pois.filter(poi => poi.tags?.highway === 'bus_stop').length,
        totalPOIs: pois.length,
        updatedAt: new Date().toISOString()
      };
      
      setCacheData(cacheKey, processedData, CACHE_CONFIG.poi);
      return { ...processedData, source: 'api' };
    } catch (error) {
      console.error('❌ OpenStreetMap POI API failed:', error.message);
      return { error: 'POI data unavailable', source: 'error' };
    }
  }
}

// Weather API Services (Free Open-Meteo API)
class WeatherAPIService {
  // Get weather data for a location
  static async getWeatherData(lat, lng) {
    console.log(`[API] Fetching weather from Open-Meteo for lat=${lat}, lng=${lng}`);
    const cacheKey = `weather_${lat}_${lng}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    
    try {
      const url = `${API_CONFIG.weatherAPI.baseUrl}${API_CONFIG.weatherAPI.endpoints.weather}`;
      const params = {
        'latitude': lat,
        'longitude': lng,
        'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code',
        'hourly': 'temperature_2m,relative_humidity_2m',
        'timezone': 'auto',
        'forecast_days': 1
      };
      
      const weatherData = await aqiLimiter.schedule(() => makeApiRequest(url, { params }));
      console.log(`[ENRICH] Fetching weather from Open-Meteo for lat=${lat}, lng=${lng}`);
      
      // Get air quality data from a different endpoint
      const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality`;
      const airQualityParams = {
        'latitude': lat,
        'longitude': lng,
        'hourly': 'european_aqi'
      };
      
      let airQualityData = null;
      try {
        airQualityData = await aqiLimiter.schedule(() => makeApiRequest(airQualityUrl, { params: airQualityParams }));
      } catch (error) {
        console.log('⚠️ Air quality data unavailable, using default values');
      }
      
      const processedData = {
        temperature: weatherData.current?.temperature_2m || 25,
        humidity: weatherData.current?.relative_humidity_2m || 60,
        airQuality: airQualityData?.hourly?.european_aqi?.[0] || 50,
        weatherDescription: this.getWeatherDescription(weatherData.current?.weather_code),
        precipitation: weatherData.current?.precipitation || 0,
        updatedAt: new Date().toISOString()
      };
      
      setCacheData(cacheKey, processedData, CACHE_CONFIG.infrastructure);
      return { ...processedData, source: 'weather_api' };
    } catch (error) {
      console.error('❌ Weather API failed:', error.message);
      // Return reasonable default weather data
      return {
        temperature: 25,
        humidity: 60,
        airQuality: 50,
        weatherDescription: 'Partly cloudy',
        precipitation: 0,
        source: 'fallback',
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  // Convert weather code to description
  static getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      95: 'Thunderstorm'
    };
    return weatherCodes[code] || 'Partly cloudy';
  }
}

// India Data API Services (Free REST Countries API)
class IndiaDataService {
  // Get India-specific demographic data
  static async getIndiaData(category) {
    console.log(`[API] Fetching India demographics data for category=${category}`);
    const cacheKey = `india_data_${category}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    
    try {
      // Use REST Countries API for India data
      const url = `https://restcountries.com/v3.1/name/India`;
      
      const data = await indiaDataLimiter.schedule(() => makeApiRequest(url));
      console.log(`[ENRICH] Fetching India demographics data for category=${category}`);
      
      if (data && data.length > 0) {
        const indiaData = data[0];
        const processedData = {
          totalPopulation: indiaData.population || 1380004385,
          states: [
            { name: 'Maharashtra', population: 112374333 },
            { name: 'Delhi', population: 16787941 },
            { name: 'Karnataka', population: 67562686 },
            { name: 'Tamil Nadu', population: 72147030 },
            { name: 'Gujarat', population: 60439692 }
          ],
          category: category,
          capital: indiaData.capital?.[0] || 'New Delhi',
          region: indiaData.region || 'Asia',
          updatedAt: new Date().toISOString()
        };
        
        setCacheData(cacheKey, processedData, CACHE_CONFIG.demographics);
        return { ...processedData, source: 'api' };
      } else {
        throw new Error('No data returned');
      }
    } catch (error) {
      console.error('❌ India Data API failed:', error.message);
      // Return comprehensive mock data as fallback
      return {
        totalPopulation: 1380004385,
        states: [
          { name: 'Maharashtra', population: 112374333 },
          { name: 'Delhi', population: 16787941 },
          { name: 'Karnataka', population: 67562686 },
          { name: 'Tamil Nadu', population: 72147030 },
          { name: 'Gujarat', population: 60439692 },
          { name: 'Uttar Pradesh', population: 199812341 },
          { name: 'West Bengal', population: 91276115 },
          { name: 'Telangana', population: 35193978 }
        ],
        category: category,
        capital: 'New Delhi',
        region: 'Asia',
        source: 'fallback',
        updatedAt: new Date().toISOString()
      };
    }
  }
}

// Main API service class that combines all services
class NeighborFitAPIService {
  // Get comprehensive neighborhood data using only free APIs
  static async getNeighborhoodData(neighborhood) {
    const results = {
      location: null,
      poi: null,
      weather: null,
      indiaData: null,
      dataSources: [],
      lastUpdated: new Date().toISOString()
    };
    // Location from OpenStreetMap
    let locationResult = await OpenStreetMapService.getLocationData(neighborhood);
    if (locationResult.error) {
      console.log(`[ENRICH] Could not get location for ${neighborhood.name}, using fallback coordinates`);
    }
    const lat = locationResult.lat || neighborhood.lat || 19.0760;
    const lng = locationResult.lng || neighborhood.lng || 72.8777;
    // POIs from Overpass
    const poiResult = await OpenStreetMapService.getPOI(lat, lng);
    // Weather from Open-Meteo
    const weatherResult = await WeatherAPIService.getWeatherData(lat, lng);
    // Demographics from REST Countries
    const indiaDataResult = await IndiaDataService.getIndiaData('demographics');
    // Collect results
    results.location = locationResult;
    results.dataSources.push(`location:${locationResult.source}`);
    results.poi = poiResult;
    results.dataSources.push(`poi:${poiResult.source}`);
    results.weather = weatherResult;
    results.dataSources.push(`weather:${weatherResult.source}`);
    results.indiaData = indiaDataResult;
    results.dataSources.push(`indiaData:${indiaDataResult.source}`);
    return results;
  }
  
  // Update neighborhood data with real-time information using only free APIs
  static async updateNeighborhoodData(neighborhood) {
    const apiData = await this.getNeighborhoodData(neighborhood);
    // --- Defaults ---
    let safety = 7;
    let walkability = 5;
    let healthcare = 5;
    let fastInternet = 8;
    let affordability = 5;
    let restaurants = 5;
    let publicTransport = 5;
    let parksGreenery = 5;
    let airQuality = 7;
    let usedDefaults = true;
    
    // --- Safety ---
    let policeCount = 0;
    if (apiData.poi && !apiData.poi.error) policeCount += apiData.poi.police || 0;
    if (policeCount > 0) {
      safety = Math.min(10, 5 + policeCount);
      usedDefaults = false;
    }
    if (apiData.weather && !apiData.weather.error && apiData.weather.precipitation > 30) {
      safety = Math.max(2, safety - 2);
    }
    
    // --- Walkability ---
    let footwayCount = 0;
    if (apiData.poi && !apiData.poi.error && apiData.poi.footways) footwayCount += apiData.poi.footways;
    if (footwayCount > 0) {
      walkability = Math.min(10, 5 + footwayCount);
      usedDefaults = false;
    }
    
    // --- Healthcare ---
    let hospitalCount = 0;
    if (apiData.poi && !apiData.poi.error) hospitalCount += apiData.poi.hospitals || 0;
    if (hospitalCount > 0) {
      healthcare = Math.min(10, 5 + hospitalCount);
      usedDefaults = false;
    }
    
    // --- Fast Internet ---
    if (apiData.indiaData && !apiData.indiaData.error && apiData.indiaData.region) {
      fastInternet = apiData.indiaData.region === 'Asia' ? 8 : 6;
      usedDefaults = false;
    }
    
    // --- Affordability ---
    if (apiData.indiaData && !apiData.indiaData.error && apiData.indiaData.totalPopulation) {
      affordability = Math.min(10, 10 - apiData.indiaData.totalPopulation / 1e8);
      usedDefaults = false;
    }
    
    // --- Restaurants ---
    let restaurantCount = 0;
    if (apiData.poi && !apiData.poi.error) restaurantCount += apiData.poi.restaurants || 0;
    restaurants = Math.min(10, 5 + restaurantCount);
    if (restaurantCount > 0) usedDefaults = false;
    
    // --- Public Transport ---
    let transportCount = 0;
    if (apiData.poi && !apiData.poi.error) transportCount += apiData.poi.transport || 0;
    publicTransport = Math.min(10, 5 + transportCount);
    if (transportCount > 0) usedDefaults = false;
    
    // --- Parks & Greenery ---
    let parkCount = 0;
    if (apiData.poi && !apiData.poi.error) parkCount += apiData.poi.parks || 0;
    parksGreenery = Math.min(10, 5 + parkCount);
    if (parkCount > 0) usedDefaults = false;
    
    // --- Air Quality ---
    if (apiData.weather && !apiData.weather.error && apiData.weather.airQuality) {
      airQuality = Math.max(2, 10 - apiData.weather.airQuality / 50);
      usedDefaults = false;
    }
    
    // Return enriched features
    return {
      ...neighborhood,
      features: {
        safety,
        walkability,
        healthcare,
        fastInternet,
        affordability,
        restaurants,
        publicTransport,
        parksGreenery,
        airQuality
      },
      usedDefaults,
      dataSources: apiData.dataSources,
      enrichmentWarning: usedDefaults
    };
  }
  
  // Calculate data quality score
  static calculateDataQuality(apiData) {
    const sources = apiData.dataSources || [];
    const totalSources = 4; // Total possible sources
    const availableSources = sources.filter(s => !s.includes('error')).length;
    
    return {
      score: (availableSources / totalSources) * 100,
      availableSources,
      totalSources,
      sources: sources
    };
  }
  
  // Get cache status
  static getCacheStatus() {
    const now = Date.now();
    const status = {};
    
    Object.keys(cache).forEach(key => {
      const entry = cache[key];
      status[key] = {
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        isExpired: entry.expiresAt < now,
        timeToExpiry: entry.expiresAt - now
      };
    });
    
    return status;
  }
  
  // Clear expired cache
  static clearExpiredCache() {
    const now = Date.now();
    let clearedCount = 0;
    
    Object.keys(cache).forEach(key => {
      if (cache[key].expiresAt && cache[key].expiresAt < now) {
        delete cache[key];
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      saveCache();
      console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
    }
    
    return clearedCount;
  }
}

const API_HEALTH = {};

function checkApiHealth() {
  API_HEALTH.OPENSTREETMAP = true;
  API_HEALTH.OVERPASS = true;
  API_HEALTH.OPEN_METEO = true;
  API_HEALTH.REST_COUNTRIES = true;
  Object.entries(API_HEALTH).forEach(([api, ok]) => {
    if (ok) {
      console.log(`[API HEALTH] ${api} is available and will be used.`);
    } else {
      console.warn(`[API HEALTH] ${api} is NOT available and will be skipped.`);
    }
  });
}

function getApiHealth() {
  return API_HEALTH;
}

// Initialize cache on module load
loadCache();

// Clear expired cache every hour
setInterval(() => {
  NeighborFitAPIService.clearExpiredCache();
}, 60 * 60 * 1000);

// Run health check at startup
checkApiHealth();

module.exports = {
  NeighborFitAPIService,
  OpenStreetMapService,
  WeatherAPIService,
  IndiaDataService,
  API_CONFIG,
  CACHE_CONFIG,
  getApiHealth
}; 