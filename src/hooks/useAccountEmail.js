import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single source of truth for the onboarding email, so every screen that
// needs it (Account's masked-email row, etc.) reads the same value instead
// of each one re-fetching it independently.
export function useAccountEmail() {
  const [email, setEmail] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_email').then(setEmail);
  }, []);

  return { email };
}
