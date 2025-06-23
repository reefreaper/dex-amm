import { useContext } from 'react';
import { MintContext } from './mintContext';

// Custom hook for using the context
export function useMint() {
  return useContext(MintContext);
}
