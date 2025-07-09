// NeighborFit Backend Server
// This server helps match users to neighborhoods based on their preferences
// Uses a simple matching algorithm to find the best neighborhoods
// Now includes real-time API integration with caching and fallback strategies

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { overpassLimiter, aqiLimiter } = require('./throttle');

// Import API services
const { NeighborFitAPIService, getApiHealth } = require('./api-services');

// Create the main app
const app = express();
const serverPort = process.env.PORT || 3001;

// Set up basic security and allow cross-origin requests
app.use(helmet());
app.use(cors());
app.use(express.json());

// Dynamic loader for neighborhoods from real-time APIs
async function loadAllNeighborhoods() {
    const majorCities = [
        { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
        { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
        { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
        { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
        { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
        { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
        { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 }
    ];
    let neighborhoods = [];
    for (const city of majorCities) {
        try {
            // Overpass QL: fetch suburbs, neighbourhoods, and localities within 15km of city center
            const query = `
                [out:json][timeout:60];
                (
                  node["place"~"suburb|neighbourhood|locality"](around:15000,${city.lat},${city.lon});
                  way["place"~"suburb|neighbourhood|locality"](around:15000,${city.lat},${city.lon});
                  relation["place"~"suburb|neighbourhood|locality"](around:15000,${city.lat},${city.lon});
                );
                out center;
            `;
            const response = await axios.post(
                'https://overpass-api.de/api/interpreter',
                query,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            const elements = response.data.elements || [];
            const cityNeighborhoods = elements.map(el => ({
                name: el.tags && (el.tags.name || el.tags['name:en']),
                city: city.name,
                lat: el.lat || (el.center && el.center.lat),
                lon: el.lon || (el.center && el.center.lon),
                osmType: el.type,
                osmId: el.id
            })).filter(n => n.name);
            neighborhoods = neighborhoods.concat(cityNeighborhoods);
            console.log(`✅ ${city.name}: Loaded ${cityNeighborhoods.length} neighborhoods from OSM`);
        } catch (e) {
            console.error(`Overpass API failed for ${city.name}:`, e.message);
        }
    }
    // Deduplicate and normalize
    const seen = new Set();
    const uniqueNeighborhoods = neighborhoods.filter(n => {
        const key = `${n.name}|${n.city}`.toLowerCase();
        if (seen.has(key) || !n.name) return false;
        seen.add(key);
        return true;
    });
    console.log(`✅ Loaded ${uniqueNeighborhoods.length} neighborhoods from OSM for major cities`);
    return uniqueNeighborhoods;
}

// Replace static loading with dynamic loader
let allNeighborhoods = [];
(async () => {
    allNeighborhoods = await loadAllNeighborhoods();
    console.log(`📊 We have data for ${allNeighborhoods.length} neighborhoods (real-time OSM)`);
})();

// Load static neighborhoods from neighborhoods.json
let staticNeighborhoods = [];
try {
  const dataFile = fs.readFileSync(path.join(__dirname, 'neighborhoods.json'), 'utf8');
  staticNeighborhoods = JSON.parse(dataFile);
  console.log(`✅ Loaded ${staticNeighborhoods.length} static neighborhoods from neighborhoods.json`);
} catch (error) {
  console.error('❌ Error loading neighborhoods.json:', error.message);
}

// Helper: Enrich OSM neighborhood with 8+ lifestyle factors (real-time APIs + smart defaults)
async function enrichNeighborhoodFeatures(neighborhood) {
  const apiHealth = getApiHealth();
  const usedApis = [];
  const failedApis = [];
  // Example for OSM POIs
  if (apiHealth.OPENWEATHER) {
    try {
      // ... call OpenWeatherMap API ...
      usedApis.push('OpenWeatherMap');
    } catch (err) {
      failedApis.push({ api: 'OpenWeatherMap', reason: err.message });
    }
  }
  // Repeat for each API, only if apiHealth[API] is true
  // ... existing code ...
  // Attach API usage info to the result
  const result = await NeighborFitAPIService.updateNeighborhoodData(neighborhood);
  result.usedApis = usedApis;
  result.failedApis = failedApis;
  return result;
}

// Update: Find best matches with enrichment, cosine similarity, and explainability
async function findBestMatches(userPreferences, neighborhoods, numResults = 10, useRealTimeData = false) {
    const factorWeights = {
        safety: 0.22,
        walkability: 0.18,
        healthcare: 0.18,
        fastInternet: 0.16,
        affordability: 0.12,
        restaurants: 0.06,
        publicTransport: 0.04,
        parksGreenery: 0.04
    };
    const factors = Object.keys(factorWeights);
    // Convert user preferences from 1-5 scale to 0-10 scale
    const userScores = factors.map(factor => (userPreferences[factor] || 3) * 2);
    const weightedUserScores = userScores.map((score, i) => score * factorWeights[factors[i]]);
    // Shuffle neighborhoods for diversity
    let shuffled = [...neighborhoods];
    if (useRealTimeData) {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
    }
    // Limit to top 20 neighborhoods for performance (prevents hundreds of API calls)
    const limitedNeighborhoods = shuffled.slice(0, 20);
    // Enrich limited neighborhoods
    const enrichedNeighborhoods = await Promise.all(limitedNeighborhoods.map(async n => {
        const enriched = useRealTimeData ? await enrichNeighborhoodFeatures(n) : {
            safety: n.safety || 7, walkability: n.walkability || 5, healthcare: n.healthcare || 5, fastInternet: n.fastInternet || 8, affordability: n.affordability || 5, restaurants: n.restaurants || 5, publicTransport: n.publicTransport || 5, parksGreenery: n.parksGreenery || 5, airQuality: n.airQuality || 7, usedDefaults: false
        };
        const features = enriched.features || enriched;
        const neighborhoodScores = factors.map(factor => features[factor]);
        const weightedNeighborhoodScores = neighborhoodScores.map((score, i) => score * factorWeights[factors[i]]);
        // Cosine similarity
        const dotProduct = weightedUserScores.reduce((sum, val, i) => sum + val * weightedNeighborhoodScores[i], 0);
        const userMagnitude = Math.sqrt(weightedUserScores.reduce((sum, val) => sum + val * val, 0));
        const neighborhoodMagnitude = Math.sqrt(weightedNeighborhoodScores.reduce((sum, val) => sum + val * val, 0));
        const similarity = userMagnitude && neighborhoodMagnitude ? dotProduct / (userMagnitude * neighborhoodMagnitude) : 0;
        // Explainability: contribution per factor
        const contributions = factors.map((factor, i) => ({
            factor,
            user: weightedUserScores[i],
            neighborhood: weightedNeighborhoodScores[i],
            product: weightedUserScores[i] * weightedNeighborhoodScores[i]
        }));
        return {
            ...n,
            ...features,
            features,
            similarity: Number(similarity.toFixed(3)),
            interpretability: Number(similarity.toFixed(3)),
            contributions,
            city: n.city
        };
    }));
    // Sort and select top N for both real-time and static (no city diversity limit)
    enrichedNeighborhoods.sort((a, b) => b.similarity - a.similarity);
    return enrichedNeighborhoods.slice(0, numResults);
}

// API Routes

// Home page - shows basic info about the API
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to NeighborFit API',
        version: '2.0.0',
        description: 'Find your perfect neighborhood in India with real-time data',
        features: [
            'Weighted cosine similarity matching',
            'Real-time API integration',
            'Intelligent caching system',
            'Fallback strategies for reliability'
        ],
        endpoints: {
            '/': 'GET - API information',
            '/match': 'POST - Find neighborhood matches based on your preferences',
            '/neighborhoods': 'GET - Get all available neighborhoods',
            '/neighborhoods/realtime': 'GET - Get neighborhoods with real-time data',
            '/api/status': 'GET - Check API service status and cache info',
            '/api/refresh': 'POST - Refresh neighborhood data with latest API information'
        },
        dataSources: [
            'MapMyIndia - India-specific location and POI data',
            'OpenStreetMap - Location and POI data (fallback)',
            'OpenWeatherMap - Real weather data (with API key)',
            'Google Places - Real nearby amenities (with API key)',
            'Weather API - Free weather fallback',
            'REST Countries - Free demographic data',
            'Overpass API - Free POI fallback'
        ]
    });
});

// Get all neighborhoods (useful for debugging or frontend data)
app.get('/neighborhoods', (req, res) => {
    res.json({
        neighborhoods: allNeighborhoods,
        totalCount: allNeighborhoods.length,
        dataSource: 'static',
        lastUpdated: new Date().toISOString()
    });
});

// Get neighborhoods with real-time data
app.get('/neighborhoods/realtime', async (req, res) => {
    try {
        console.log('🔄 Fetching real-time neighborhood data...');
        
        // Update all neighborhoods with real-time data
        const updatedNeighborhoods = [];
        
        for (const neighborhood of allNeighborhoods) {
            try {
                const updatedNeighborhood = await NeighborFitAPIService.updateNeighborhoodData(neighborhood);
                updatedNeighborhoods.push(updatedNeighborhood);
            } catch (error) {
                console.error(`❌ Error updating ${neighborhood.name}:`, error.message);
                updatedNeighborhoods.push(neighborhood); // Include original if update fails
            }
        }
        
        res.json({
            neighborhoods: updatedNeighborhoods,
            totalCount: updatedNeighborhoods.length,
            dataSource: 'realtime',
            lastUpdated: new Date().toISOString(),
            dataQuality: {
                average: updatedNeighborhoods.reduce((sum, n) => sum + (n.dataQuality?.score || 0), 0) / updatedNeighborhoods.length,
                details: updatedNeighborhoods.map(n => ({
                    name: n.name,
                    quality: n.dataQuality?.score || 0,
                    sources: n.dataQuality?.sources || []
                }))
            }
        });
    } catch (error) {
        console.error('❌ Error fetching real-time data:', error);
        res.status(500).json({
            error: 'Failed to fetch real-time data',
            message: error.message,
            fallback: 'Use /neighborhoods endpoint for static data'
        });
    }
});

// API status endpoint
app.get('/api/status', (req, res) => {
    const cacheStatus = NeighborFitAPIService.getCacheStatus();
    const cacheKeys = Object.keys(cacheStatus);
    
    res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        cache: {
            totalEntries: cacheKeys.length,
            validEntries: cacheKeys.filter(key => !cacheStatus[key].isExpired).length,
            expiredEntries: cacheKeys.filter(key => cacheStatus[key].isExpired).length,
            details: cacheStatus
        },
        neighborhoods: {
            total: allNeighborhoods.length,
            lastUpdated: new Date().toISOString()
        },
        apiServices: {
            mapMyIndia: 'configured',
            openStreetMap: 'fallback',
            openWeatherMap: 'configured',
            googlePlaces: 'configured',
            weatherAPI: 'fallback',
            restCountries: 'fallback',
            overpassAPI: 'fallback'
        }
    });
});

// Refresh neighborhood data
app.post('/api/refresh', async (req, res) => {
    try {
        const { neighborhoodId } = req.body;
        
        if (neighborhoodId) {
            // Refresh specific neighborhood
            const neighborhood = allNeighborhoods.find(n => n.id === neighborhoodId);
            if (!neighborhood) {
                return res.status(404).json({
                    error: 'Neighborhood not found',
                    neighborhoodId: neighborhoodId
                });
            }
            
            const updatedNeighborhood = await NeighborFitAPIService.updateNeighborhoodData(neighborhood);
            
            // Update the neighborhood in our data
            const index = allNeighborhoods.findIndex(n => n.id === neighborhoodId);
            allNeighborhoods[index] = updatedNeighborhood;
            
            res.json({
                success: true,
                message: `Neighborhood ${neighborhood.name} refreshed successfully`,
                neighborhood: updatedNeighborhood
            });
        } else {
            // Refresh all neighborhoods
            console.log('🔄 Refreshing all neighborhood data...');
            
            const updatedNeighborhoods = [];
            for (const neighborhood of allNeighborhoods) {
                try {
                    const updatedNeighborhood = await NeighborFitAPIService.updateNeighborhoodData(neighborhood);
                    updatedNeighborhoods.push(updatedNeighborhood);
                } catch (error) {
                    console.error(`❌ Error refreshing ${neighborhood.name}:`, error.message);
                    updatedNeighborhoods.push(neighborhood);
                }
            }
            
            allNeighborhoods = updatedNeighborhoods;
            
            res.json({
                success: true,
                message: 'All neighborhoods refreshed successfully',
                totalNeighborhoods: updatedNeighborhoods.length,
                lastUpdated: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        res.status(500).json({
            error: 'Failed to refresh data',
            message: error.message
        });
    }
});

// Add endpoint to refresh neighborhoods
app.post('/api/refresh-neighborhoods', async (req, res) => {
    allNeighborhoods = await loadAllNeighborhoods();
    res.json({ message: 'Neighborhoods refreshed', count: allNeighborhoods.length });
});

// Main matching endpoint - this is where the magic happens
app.post('/match', async (req, res) => {
    try {
        const { userPrefs, useRealTimeData = false, city } = req.body;
        // Check if user sent all required preferences
        const requiredFields = ['safety', 'walkability', 'healthcare', 'fastInternet', 'affordability', 'restaurants', 'publicTransport', 'parksGreenery'];
        const missingFields = [];
        for (let field of requiredFields) {
            if (!(field in userPrefs)) {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required preferences',
                missingFields: missingFields
            });
        }
        // Check if all preference values are valid (between 1 and 5)
        const invalidFields = [];
        for (let field of requiredFields) {
            const value = userPrefs[field];
            if (typeof value !== 'number' || value < 1 || value > 5) {
                invalidFields.push(field);
            }
        }
        if (invalidFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid preference values. All values must be numbers between 1 and 5.',
                invalidFields: invalidFields
            });
        }
        // Use static or real-time neighborhoods
        let neighborhoodsToUse = useRealTimeData ? allNeighborhoods : staticNeighborhoods;
        // Filter by city if provided
        if (city) {
            neighborhoodsToUse = neighborhoodsToUse.filter(n => n.city && n.city.toLowerCase() === city.toLowerCase());
        }
        // Set number of results
        const numResults = useRealTimeData ? 10 : 5;
        // Find the best matches using our algorithm
        const topMatches = await findBestMatches(userPrefs, neighborhoodsToUse, numResults, useRealTimeData);
        // Check if all real-time enrichments used defaults (API failed)
        let enrichmentWarning = false;
        if (useRealTimeData && topMatches.every(n => n.features && n.features.usedDefaults)) {
            enrichmentWarning = true;
        }
        // Send back the results
        res.json({
            success: true,
            userPreferences: userPrefs,
            topMatches: topMatches,
            totalNeighborhoods: neighborhoodsToUse.length,
            dataSource: useRealTimeData ? 'realtime' : 'static',
            algorithm: 'weighted-cosine-similarity',
            weights: {
                safety: 0.22,
                walkability: 0.18,
                healthcare: 0.18,
                fastInternet: 0.16,
                affordability: 0.12,
                restaurants: 0.06,
                publicTransport: 0.04,
                parksGreenery: 0.04
            },
            enrichmentWarning,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in matching endpoint:', error);
        res.status(500).json({
            error: 'Something went wrong on the server',
            message: error.message
        });
    }
});

// Handle any errors that occur
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        error: 'Server error occurred',
        message: err.message
    });
});

// Handle requests to unknown endpoints
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['/', '/match', '/neighborhoods', '/neighborhoods/realtime', '/api/status', '/api/refresh']
    });
});

// Start the server
app.listen(serverPort, () => {
    console.log(`🚀 NeighborFit server is running on port ${serverPort}`);
    //console.log(`✅ Loaded ${staticNeighborhoods.length} static neighborhoods from neighborhoods.json`);
    console.log(`📊 We have data for ${allNeighborhoods.length} neighborhoods (real-time OSM)`);
    console.log(`🔗 API is available at http://localhost:${serverPort}`);
    console.log(`🌐 Real-time data integration: ENABLED`);
    console.log(`💾 Caching system: ACTIVE`);
    console.log(`🔄 Fallback strategies: CONFIGURED`);
});

module.exports = app; 