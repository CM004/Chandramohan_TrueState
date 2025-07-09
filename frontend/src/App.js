// Main App component for NeighborFit
// This is the main page that shows the neighborhood matching app

import React, { useState } from 'react';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Box,
  Typography,
  Paper
} from '@mui/material';
import PreferenceForm from './components/PreferenceForm';
import ResultsDisplay from './components/ResultsDisplay';
import Header from './components/Header';
import './App.css';

// Set up the color theme for the app with professional colors
const appTheme = createTheme({
  palette: {
    primary: {
      main: '#2E3B55', // Professional dark blue
      light: '#4A5568',
      dark: '#1A202C',
    },
    secondary: {
      main: '#38B2AC', // Teal accent
      light: '#4FD1C7',
      dark: '#319795',
    },
    background: {
      default: '#F7FAFC', // Very light gray-blue
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2D3748',
      secondary: '#718096',
    },
    success: {
      main: '#48BB78',
      light: '#68D391',
    },
    warning: {
      main: '#ED8936',
      light: '#F6AD55',
    },
    error: {
      main: '#F56565',
      light: '#FC8181',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.1)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 16px 32px rgba(0, 0, 0, 0.1)',
    '0px 32px 64px rgba(0, 0, 0, 0.1)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

function App() {
  // State variables to track the app's current state
  const [matchResults, setMatchResults] = useState(null); // Store the matching results
  const [isLoading, setIsLoading] = useState(false); // Track if we're loading data
  const [errorMessage, setErrorMessage] = useState(null); // Store any error messages

  // This function is called when user submits their preferences
  const handleUserPreferences = async (userPrefs, useRealTimeData = false, city) => {
    setIsLoading(true); // Start loading
    setErrorMessage(null); // Clear any previous errors
    
    try {
      // Send user preferences to our backend server
      const response = await fetch('http://localhost:3001/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrefs,
          useRealTimeData,
          city
        }),
      });

      const resultData = await response.json();
      
      // Check if the request was successful
      if (!response.ok) {
        throw new Error(resultData.error || 'Failed to get neighborhood matches');
      }
      
      // Save the results
      setMatchResults(resultData);
    } catch (err) {
      // If something went wrong, save the error message
      setErrorMessage(err.message);
      console.error('Error getting matches:', err);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Function to reset the app and start over
  const resetApp = () => {
    setMatchResults(null);
    setErrorMessage(null);
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: 'background.default',
        background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)'
      }}>
        <Header />
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: { xs: 3, md: 6 },
            px: { xs: 2, md: 3 }
          }}
        >
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 3, md: 6 }, 
              mb: 4,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography 
                variant="h1" 
                component="h1" 
                gutterBottom 
                color="primary"
                sx={{ 
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #2E3B55 0%, #4A5568 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                Find Your Perfect Neighbourhood
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: 600,
                  mx: 'auto',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                Rate your lifestyle preferences and discover the best Indian neighbourhoods that match your needs
              </Typography>
            </Box>
            
            {/* Show preference form if no results yet, otherwise show results */}
            {!matchResults ? (
              <PreferenceForm onSubmit={handleUserPreferences} loading={isLoading} />
            ) : (
              <ResultsDisplay 
                results={matchResults} 
                onReset={resetApp}
                loading={isLoading}
                error={errorMessage}
              />
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
