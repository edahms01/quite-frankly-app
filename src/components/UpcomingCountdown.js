import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize } from '../theme';
import { countdownTime } from '../utils/countdownTime';

const TICK_MS = 60000;

// Ticks on its own clock against scheduledStartTime — deliberately not tied
// to the Twitch-driven isLive signal (which only updates every ~3 min via
// polling and can lag the real start). Renders nothing once the countdown
// reaches 0, regardless of whether Twitch has confirmed live yet.
export default function UpcomingCountdown({ scheduledStartTime }) {
  const [label, setLabel] = useState(() => countdownTime(scheduledStartTime));

  useEffect(() => {
    setLabel(countdownTime(scheduledStartTime));
    if (!scheduledStartTime) return;
    const interval = setInterval(() => {
      setLabel(countdownTime(scheduledStartTime));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [scheduledStartTime]);

  if (!label) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Live in:</Text>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 14,
  },
});
