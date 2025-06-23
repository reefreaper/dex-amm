import { useState } from 'react';
import { MintContext } from './mintContext';

// Provider component
export function MintProvider({ children }) {
  const [latestMint, setLatestMint] = useState(null);
  
  const clearLatestMint = () => {
    setLatestMint(null);
  };
  
  // Value object that will be passed to consumers
  const value = {
    latestMint,
    setLatestMint,
    clearLatestMint
  };
  
  return (
    <MintContext.Provider value={value}>
      {children}
    </MintContext.Provider>
  );
}

