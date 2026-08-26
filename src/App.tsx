import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { Providers } from '@/providers';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useSession } from '@/store/session';

export default function App() {
  useEffect(() => {
    useSession
      .getState()
      .boot()
      .finally(() => BootSplash.hide({ fade: true }));
  }, []);

  return (
    <Providers>
      <RootNavigator />
    </Providers>
  );
}
