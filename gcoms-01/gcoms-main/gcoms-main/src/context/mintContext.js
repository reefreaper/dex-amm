import { createContext } from 'react';

// Create context with default values
export const MintContext = createContext({
  latestMint: null,
  setLatestMint: () => {},
  clearLatestMint: () => {}
});
