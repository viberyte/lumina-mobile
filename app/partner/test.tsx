import { View, Text } from 'react-native';

export default function TestScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>TEST WORKS!</Text>
    </View>
  );
}
