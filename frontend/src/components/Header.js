// Header component
// This shows the app title and branding at the top of the page

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { LocationOn, Home } from '@mui/icons-material';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #2E3B55 0%, #4A5568 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1 }}>
        {/* Left side - app name and location */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 2,
            p: 1,
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Home sx={{ 
              mr: 1, 
              fontSize: 28,
              color: '#38B2AC'
            }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                background: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NeighborFit
            </Typography>
          </Box>
          
          {!isMobile && (
            <Chip 
              icon={<LocationOn sx={{ fontSize: 16 }} />} 
              label="India" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(56, 178, 172, 0.2)',
                color: '#38B2AC',
                fontWeight: 600,
                border: '1px solid rgba(56, 178, 172, 0.3)',
                '& .MuiChip-icon': {
                  color: '#38B2AC',
                }
              }}
            />
          )}
        </Box>
        
        {/* Right side - tagline */}
        {!isMobile && (
          <Typography 
            variant="body2" 
            sx={{ 
              opacity: 0.9,
              fontWeight: 500,
              color: '#E2E8F0',
              fontSize: '0.875rem'
            }}
          >
            Smart Neighbourhood Matching
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 