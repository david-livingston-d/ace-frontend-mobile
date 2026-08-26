import React, { useEffect } from 'react';
import { Text } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { Providers } from '@/providers';

export default function App() {
  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <Providers>
      <Text>ACE Sales</Text>
    </Providers>
  );
}
