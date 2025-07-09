// ResultsDisplay component
// This component shows the top 3 neighborhood matches to the user
// It displays each neighborhood with its match score and details

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  Stack
} from '@mui/material';
import {
  LocationOn,
  Star,
  Refresh,
  Info,
  TrendingUp
} from '@mui/icons-material';

const ResultsDisplay = ({ results, onReset, loading, error }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // If there's an error, show error message and retry button
  if (error) {
    return (
      <Box>
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4,
            borderRadius: 2,
            background: 'rgba(245, 101, 101, 0.1)',
            border: '1px solid rgba(245, 101, 101, 0.2)',
          }}
        >
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={onReset}
          startIcon={<Refresh />}
          sx={{
            borderColor: '#F56565',
            color: '#F56565',
            '&:hover': {
              borderColor: '#E53E3E',
              backgroundColor: 'rgba(245, 101, 101, 0.05)',
            }
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  // If no results, don't show anything
  if (!results || !results.topMatches) {
    return null;
  }

  // Show top 10 matches
  const topMatches = results.topMatches.slice(0, 10);

  // Function to get color based on match score
  const getScoreColor = (score) => {
    if (score >= 80) return '#48BB78'; // Green for excellent matches
    if (score >= 60) return '#ED8936'; // Orange for good matches
    return '#F56565'; // Red for fair matches
  };

  // Function to get label based on match score
  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    return 'Fair Match';
  };

  return (
    <Box>
      {/* Warning if enrichment failed */}
      {results.enrichmentWarning && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 2, background: 'rgba(237, 137, 54, 0.1)', border: '1px solid rgba(237, 137, 54, 0.2)' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Warning:</strong> Real-time data enrichment failed. Default values are being used for all neighbourhoods. Please try again later or check your internet connection.
          </Typography>
        </Alert>
      )}
      {/* Results header section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography 
          variant="h2" 
          gutterBottom 
          color="primary"
          sx={{ 
            fontSize: { xs: '1.75rem', md: '2.5rem' },
            fontWeight: 700,
            mb: 2
          }}
        >
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 700,
            mx: 'auto',
            lineHeight: 1.6,
            fontWeight: 400,
            mb: 3
          }}
        >
          Based on your preferences, here are the best neighbourhoods for you:
        </Typography>
        
        {/* Success message */}
        <Alert 
          severity="success" 
          sx={{ 
            mb: 4,
            borderRadius: 2,
            background: 'rgba(72, 187, 120, 0.1)',
            border: '1px solid rgba(72, 187, 120, 0.2)',
            maxWidth: 800,
            mx: 'auto',
            '& .MuiAlert-icon': {
              color: '#48BB78'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Analysis complete!</strong> We compared your preferences with {results.totalNeighborhoods} neighbourhoods across India using weighted cosine similarity.
            {results.dataSource === 'realtime' && (
              <span> Data includes real-time information from external APIs.</span>
            )}
          </Typography>
        </Alert>
      </Box>

      {/* Grid of neighborhood cards */}
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 4, md: 6 } }}>
        <Grid container spacing={4}>
          {topMatches.map((neighborhood, index) => (
            <Grid item xs={12} md={6} lg={4} key={neighborhood.osmId || neighborhood.id || index}>
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: index === 0 ? '2px solid #48BB78' : '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                {/* Best match badge for the top result */}
                {index === 0 && (
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1,
                    background: 'linear-gradient(135deg, #48BB78 0%, #68D391 100%)',
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                    boxShadow: '0 4px 8px rgba(72, 187, 120, 0.3)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Star sx={{ color: 'white', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                        Best Match
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <CardContent sx={{ p: 4, pt: index === 0 ? 6 : 4 }}>
                  {/* Neighborhood name and city */}
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 700,
                        color: '#2D3748',
                        mb: 1
                      }}
                    >
                      {neighborhood.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LocationOn sx={{ color: '#718096', mr: 1, fontSize: 18 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {neighborhood.city}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Similarity/Interpretability score */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Similarity Score: <span style={{ color: '#3182CE', fontWeight: 700 }}>{neighborhood.similarity}</span>
                    </Typography>
                  </Box>

                  {/* Key features chips (all 8+ factors) */}
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                    Key Features:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {neighborhood.features && Object.entries(neighborhood.features).map(([key, value]) => (
                      <Chip 
                        key={key}
                        label={`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}/10`}
                        size="small"
                        sx={{
                          background: value >= 8 ? 'rgba(72, 187, 120, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          color: value >= 8 ? '#48BB78' : '#718096',
                          fontWeight: 600,
                          border: value >= 8 ? '1px solid rgba(72, 187, 120, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
                          mb: 1
                        }}
                      />
                    ))}
                  </Stack>

                  {/* Expandable explainability section */}
                  <Button
                    variant="text"
                    size="small"
                    sx={{ mt: 2, color: '#3182CE', fontWeight: 600 }}
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    endIcon={<Info />}
                  >
                    {expandedIndex === index ? 'Hide Details' : 'Show Explainability'}
                  </Button>

                  {expandedIndex === index && (
                    <Box sx={{ mt: 2, background: 'rgba(226, 232, 240, 0.3)', borderRadius: 2, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Factor Contributions:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {neighborhood.contributions && neighborhood.contributions.map((c, i) => (
                          <li key={i}>
                            <strong>{c.factor.charAt(0).toUpperCase() + c.factor.slice(1)}:</strong> User: {c.user.toFixed(2)}, Neighbourhood: {c.neighborhood.toFixed(2)}, Product: {c.product.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Algorithm explanation section */}
      <Box sx={{ 
        mt: 6, 
        p: 4, 
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}>
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: 600,
            mb: 3,
            color: '#2D3748'
          }}
        >
          <Info sx={{ mr: 2, color: '#38B2AC' }} />
          How We Calculate Your Matches
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 3,
            lineHeight: 1.6,
            fontSize: '0.95rem'
          }}
        >
          We use <strong>weighted cosine similarity</strong> to match your preferences with neighbourhood data. 
          The algorithm considers these factors with their importance weights:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Safety (22%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Walkability (18%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Healthcare (18%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Internet (16%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Affordability (12%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Restaurants (6%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Transport (4%)</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>• Parks (4%)</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Reset button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <Button
          variant="outlined"
          onClick={onReset}
          startIcon={<Refresh />}
          size="large"
          sx={{
            px: 4,
            py: 1.5,
            borderColor: '#38B2AC',
            color: '#38B2AC',
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              borderColor: '#319795',
              backgroundColor: 'rgba(56, 178, 172, 0.05)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Start New Search
        </Button>
      </Box>
    </Box>
  );
};

export default ResultsDisplay; 