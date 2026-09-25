import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single source of truth for the onboarding email and the avatar initial
// derived from it, so every avatar (Home, Culture Club, Account) shows the
// same thing instead of each screen re-deriving it independently.
export function useAccountEmail() {
  const [email, setEmail] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_email').then(setEmail);
  }, []);

  return { email, avatarInitial: email ? email[0].toUpperCase() : 'E' };
}
