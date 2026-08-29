import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/client';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { ToastHost, ToastTabBarProvider } from '@/ui/Toast';
import { AnalyticsProvider } from '@/analytics/Provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AnalyticsProvider>
              <BottomSheetModalProvider>
                {/* Wraps both the app and the toast host: the host is a
                    sibling of the navigator, so "is a tab bar on screen" can
                    only travel between them through a provider above both. */}
                <ToastTabBarProvider>
                  {children}
                  <ToastHost />
                </ToastTabBarProvider>
              </BottomSheetModalProvider>
            </AnalyticsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
