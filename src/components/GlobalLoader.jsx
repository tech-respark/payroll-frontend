import React, { useState, useEffect } from 'react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

const GlobalLoader = () => {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const handleStart = () => setActiveRequests(prev => prev + 1);
    const handleEnd = () => setActiveRequests(prev => Math.max(0, prev - 1));

    window.addEventListener('api_call_start', handleStart);
    window.addEventListener('api_call_end', handleEnd);

    return () => {
      window.removeEventListener('api_call_start', handleStart);
      window.removeEventListener('api_call_end', handleEnd);
    };
  }, []);

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 9999 }}
      open={activeRequests > 0}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};

export default GlobalLoader;
