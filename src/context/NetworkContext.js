import { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Default to connected so a brand-new mount (before the first NetInfo event
// fires) never flashes the offline banner on a normal, connected launch.
const NetworkContext = createContext({ isConnected: true });

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected can be null before the native module reports its first
      // reading — treat unknown as connected rather than false-alarming.
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
