import { Stack } from 'expo-router';

export default function PartnerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#09090b' },
        animation: 'slide_from_right',
      }}
    />
  );
}
