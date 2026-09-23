import { Button } from 'react-native';
import PlaceholderScreen from '../../components/PlaceholderScreen';

/**
 * Scaffold-only: the button below exists purely to verify the chained
 * SubscriptionConfirmed modal route resolves structurally (Phase 1 QA).
 * Real implementation loads Frank's live Squarespace checkout in a
 * system-browser sheet and detects the URL leaving the checkout page.
 */
export default function SubscriptionCheckout({ navigation }) {
  return (
    <PlaceholderScreen title="Subscription Checkout">
      <Button
        title="[Scaffold QA] Simulate Checkout Complete"
        onPress={() => navigation.navigate('SubscriptionConfirmed')}
      />
    </PlaceholderScreen>
  );
}
