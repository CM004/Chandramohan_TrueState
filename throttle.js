const Bottleneck = require('bottleneck');

const overpassLimiter = new Bottleneck({ minTime: 3000, maxConcurrent: 1 });
const aqiLimiter = new Bottleneck({ minTime: 3000, maxConcurrent: 1 });
const indiaDataLimiter = new Bottleneck({ minTime: 3000, maxConcurrent: 1 });

module.exports = {
  overpassLimiter,
  aqiLimiter,
  indiaDataLimiter
}; 