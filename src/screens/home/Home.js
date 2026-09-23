import { Button } from 'react-native';
import PlaceholderScreen from '../../components/PlaceholderScreen';

/**
 * Scaffold-only: the "Open Subscription Modal" button below exists purely to
 * verify the SubscriptionCheckout -> SubscriptionConfirmed modal route resolves
 * structurally (Phase 1 QA). Remove once Phase 2 wires the real trigger.
 */
export default function Home({ navigation }) {
  return (
    <PlaceholderScreen title="Home">
      <Button
        title="[Scaffold QA] Open Subscription Modal"
        onPress={() => navigation.navigate('SubscriptionCheckout')}
      />
    </PlaceholderScreen>
  );
}
