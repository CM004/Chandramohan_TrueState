// PreferenceForm component
// This component shows sliders for users to rate their lifestyle preferences
// It also has bonus toggles for family-oriented and mixed preferences

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Slider,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  Security,
  DirectionsWalk,
  LocalHospital,
  Wifi,
  AttachMoney,
  Restaurant,
  DirectionsBus,
  Park
} from '@mui/icons-material';

const PreferenceForm = ({ onSubmit, loading }) => {
  // Store user's preference ratings (1-5 scale)
  const [userRatings, setUserRatings] = useState({
    safety: 3,
    walkability: 3,
    healthcare: 3,
    fastInternet: 3,
    affordability: 3,
    restaurants: 3,
    publicTransport: 3,
    parksGreenery: 3
  });

  // Bonus preference toggles
  const [isFamilyOriented, setIsFamilyOriented] = useState(false);
  const [isMixedQuietLively, setIsMixedQuietLively] = useState(false);
  const [useRealTimeData, setUseRealTimeData] = useState(false);

  // Configuration for each preference factor with professional colors
  const preferenceFactors = [
    { key: 'safety', label: 'Safety & Security', icon: Security, color: '#48BB78', description: 'Crime rates and personal safety' },
    { key: 'walkability', label: 'Walkability', icon: DirectionsWalk, color: '#FFC107', description: 'Pedestrian-friendly areas' },
    { key: 'healthcare', label: 'Healthcare Access', icon: LocalHospital, color: '#63B3ED', description: 'Hospitals and medical facilities' },
    { key: 'fastInternet', label: 'Fast Internet', icon: Wifi, color: '#9F7AEA', description: 'High-speed internet connectivity' },
    { key: 'affordability', label: 'Affordability', icon: AttachMoney, color: '#ED8936', description: 'Cost of living and housing' },
    { key: 'restaurants', label: 'Restaurants & Food', icon: Restaurant, color: '#E53E3E', description: 'Dining options and food variety' },
    { key: 'publicTransport', label: 'Public Transport', icon: DirectionsBus, color: '#4A5568', description: 'Bus, train, and metro access' },
    { key: 'parksGreenery', label: 'Parks & Greenery', icon: Park, color: '#68D391', description: 'Green spaces and recreation' }
  ];

  const majorCities = [
    'Delhi',
    'Mumbai',
    'Bengaluru',
    'Pune',
    'Chennai',
    'Hyderabad',
    'Kolkata',
    'Ahmedabad'
  ];
  const [selectedCity, setSelectedCity] = useState(majorCities[0]);

  // Function called when user moves a slider
  const handleSliderChange = (factorKey, newValue) => {
    setUserRatings(prevRatings => ({
      ...prevRatings,
      [factorKey]: newValue
    }));
  };

  // Function called when user clicks the submit button
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Start with user's original ratings
    let finalRatings = { ...userRatings };
    
    // Apply bonus adjustments if toggles are on
    if (isFamilyOriented) {
      // Family-oriented users care more about safety, healthcare, and parks
      finalRatings.safety = Math.min(5, finalRatings.safety + 0.5);
      finalRatings.healthcare = Math.min(5, finalRatings.healthcare + 0.5);
      finalRatings.parksGreenery = Math.min(5, finalRatings.parksGreenery + 0.5);
    }
    
    if (isMixedQuietLively) {
      // Mixed preference users want both quiet and lively areas
      finalRatings.restaurants = Math.min(5, finalRatings.restaurants + 0.3);
      finalRatings.walkability = Math.min(5, finalRatings.walkability + 0.3);
    }
    
    // Send the final ratings and city to the parent component
    onSubmit(finalRatings, useRealTimeData, selectedCity);
  };

  // Helper function to create slider marks (1, 2, 3, 4, 5)
  const getSliderMarks = () => [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' }
  ];

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* City selector */}
      <FormControl fullWidth sx={{ mb: 4 }}>
        <InputLabel id="city-select-label">Select City</InputLabel>
        <Select
          labelId="city-select-label"
          id="city-select"
          value={selectedCity}
          label="Select City"
          onChange={e => setSelectedCity(e.target.value)}
        >
          {majorCities.map(city => (
            <MenuItem key={city} value={city}>{city}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Information alert for users */}
      <Alert 
        severity="info" 
        sx={{ 
          mb: 4,
          borderRadius: 2,
          background: 'rgba(56, 178, 172, 0.1)',
          border: '1px solid rgba(56, 178, 172, 0.2)',
          '& .MuiAlert-icon': {
            color: '#38B2AC'
          }
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Rate each lifestyle factor from 1 (least important) to 5 (very important) based on your preferences.
        </Typography>
      </Alert>

      {/* Grid of preference sliders */}
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {preferenceFactors.map(({ key, label, icon: Icon, color, description }) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${color}20`,
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Factor header with icon */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      background: `${color}15`,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon sx={{ color: color, fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Current rating display */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 3,
                    p: 1.5,
                    borderRadius: 2,
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Current rating:
                    </Typography>
                    <Chip 
                      label={`${userRatings[key]}/5`}
                      size="small"
                      sx={{
                        background: `${color}20`,
                        color: color,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    />
                  </Box>
                  
                  {/* Slider for rating */}
                  <Slider
                    value={userRatings[key]}
                    onChange={(e, value) => handleSliderChange(key, value)}
                    min={1}
                    max={5}
                    step={1}
                    marks={getSliderMarks()}
                    valueLabelDisplay="auto"
                    sx={{
                      '& .MuiSlider-thumb': {
                        backgroundColor: color,
                        width: 20,
                        height: 20,
                        '&:hover': {
                          boxShadow: `0 0 0 8px ${color}20`,
                        },
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: color,
                        height: 4,
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#E2E8F0',
                        height: 4,
                      },
                      '& .MuiSlider-mark': {
                        backgroundColor: '#CBD5E0',
                        width: 2,
                        height: 2,
                      },
                      '& .MuiSlider-markLabel': {
                        color: '#718096',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      },
                      '& .MuiSlider-valueLabel': {
                        background: color,
                        fontWeight: 600,
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 6, opacity: 0.3 }} />
      
      {/* Bonus preference section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
          Additional Preferences
        </Typography>
        <Grid container spacing={3} justifyContent="center" alignItems="stretch">
          {/* Family-oriented toggle */}
          <Grid item xs={12} sm={4} md={4} display="flex">
            <Card 
              elevation={0}
              sx={{ 
                p: 3,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: isFamilyOriented ? 'rgba(56, 178, 172, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                border: isFamilyOriented ? '2px solid #38B2AC' : '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                minHeight: 120,
                height: 120,
                '&:hover': {
                  background: isFamilyOriented ? 'rgba(56, 178, 172, 0.15)' : 'rgba(255, 255, 255, 0.9)',
                }
              }}
              onClick={() => setIsFamilyOriented(!isFamilyOriented)}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={isFamilyOriented}
                    onChange={(e) => setIsFamilyOriented(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Chip 
                      label="Family-Oriented" 
                      size="small" 
                      color="primary" 
                      sx={{ mb: 1, fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Prioritize safety, healthcare, and green spaces for family living
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Card>
          </Grid>
          {/* Mixed quiet & lively toggle */}
          <Grid item xs={12} sm={4} md={4} display="flex">
            <Card 
              elevation={0}
              sx={{ 
                p: 3,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: isMixedQuietLively ? 'rgba(159, 122, 234, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                border: isMixedQuietLively ? '2px solid #9F7AEA' : '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                minHeight: 120,
                height: 120,
                '&:hover': {
                  background: isMixedQuietLively ? 'rgba(159, 122, 234, 0.15)' : 'rgba(255, 255, 255, 0.9)',
                }
              }}
              onClick={() => setIsMixedQuietLively(!isMixedQuietLively)}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={isMixedQuietLively}
                    onChange={(e) => setIsMixedQuietLively(e.target.checked)}
                    color="secondary"
                  />
                }
                label={
                  <Box>
                    <Chip 
                      label="Mixed Quiet & Lively" 
                      size="small" 
                      color="secondary" 
                      sx={{ mb: 1, fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Balance of peaceful residential and vibrant commercial areas
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Card>
          </Grid>
          {/* Real-time data toggle */}
          <Grid item xs={12} sm={4} md={4} display="flex">
            <Card 
              elevation={0}
              sx={{ 
                p: 3,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: useRealTimeData ? 'rgba(72, 187, 120, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                border: useRealTimeData ? '2px solid #48BB78' : '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                minHeight: 120,
                height: 120,
                '&:hover': {
                  background: useRealTimeData ? 'rgba(72, 187, 120, 0.15)' : 'rgba(255, 255, 255, 0.9)',
                }
              }}
              onClick={() => setUseRealTimeData(!useRealTimeData)}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={useRealTimeData}
                    onChange={(e) => setUseRealTimeData(e.target.checked)}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Chip 
                      label="Real-time Data" 
                      size="small" 
                      color="success" 
                      sx={{ mb: 1, fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Use live data from APIs (may take longer but more accurate)
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Submit button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ 
            px: 6, 
            py: 2, 
            fontSize: '1.1rem',
            minWidth: 280,
            background: 'linear-gradient(135deg, #2E3B55 0%, #4A5568 100%)',
            boxShadow: '0 8px 16px rgba(46, 59, 85, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4A5568 0%, #2E3B55 100%)',
              boxShadow: '0 12px 24px rgba(46, 59, 85, 0.4)',
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              background: '#CBD5E0',
              transform: 'none',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} sx={{ mr: 2, color: 'white' }} />
              Finding Matches...
            </Box>
          ) : (
            'Find My Perfect Neighbourhood'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default PreferenceForm; 