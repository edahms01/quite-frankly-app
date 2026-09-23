import { Button } from 'react-native';
import PlaceholderScreen from '../../components/PlaceholderScreen';

/**
 * Scaffold-only: the button below exists purely to verify MainTabs is
 * reachable structurally (Phase 1 QA) — real onboarding->main handoff
 * logic (skip/complete flow) isn't built until a later phase.
 */
export default function Welcome({ navigation }) {
  return (
    <PlaceholderScreen title="Welcome">
      <Button
        title="[Scaffold QA] Skip to App"
        onPress={() => navigation.navigate('MainTabs')}
      />
    </PlaceholderScreen>
  );
}
