import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Screen, FormScreen, HeroScreen, Input, Button, Banner, Card, ErrorState, Sheet, useSheet, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { heroPalette } from '@/ui/tokens/colors';
import { useSession } from '@/store/session';
import { toApiError } from '@/lib/api/errors';
import { loginSchema, type LoginFormValues } from '../schema';
import wordmark from '../../../../assets/ace-wordmark-black.png';

const DEFAULT_LOCKOUT_SECONDS = 15 * 60;

type LoginError = { message: string; isNetwork: boolean };

// The API surfaces the lockout window as a `Retry-After` header, not in the JSON
// body — `toApiError` only carries `detail`, so this reads the header off the
// original axios error directly (see task-4-brief.md carry-in 6).
function loginErrorMessage(err: unknown): LoginError {
  const e = toApiError(err);
  if (e.kind === 'network') return { message: 'No connection', isNetwork: true };
  if (e.code === 'invalid_credentials') return { message: 'Invalid credentials — check password', isNetwork: false };
  if (e.code === 'too_many_attempts') {
    const header = isAxiosError(err) ? err.response?.headers['retry-after'] : undefined;
    const seconds = Number(header);
    const minutes = Math.ceil((Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_LOCKOUT_SECONDS) / 60);
    return { message: `Too many attempts — try again in ${minutes} min`, isNetwork: false };
  }
  return { message: e.message, isNetwork: false };
}

/** The `login` frame: the app's one signature surface — wordmark on glossy
 * black, the two fields in a single card, a bright primary pill. */
export function LoginScreen() {
  const reason = useSession((s) => s.reason);
  const signIn = useSession((s) => s.signIn);
  const forgot = useSheet();
  const [error, setError] = useState<LoginError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      await signIn(values.email, values.password);
    } catch (err) {
      setError(loginErrorMessage(err));
    }
  }

  if (error?.isNetwork) {
    return (
      <HeroScreen>
        <Screen>
          <View style={styles.centred}>
            <ErrorState message={error.message} onRetry={() => setError(null)} />
          </View>
        </Screen>
      </HeroScreen>
    );
  }

  return (
    // `FormScreen` rather than a bare `Screen`: the password field is the last
    // thing on a short screen, and on a small device the keyboard covered both
    // it and Sign in with nothing to scroll.
    <HeroScreen>
      <FormScreen>
        <View style={styles.wrap}>
          <View style={styles.identity}>
            {/* The wordmark asset is black; on the hero surface it always needs
                the bright tint, in either app theme. `heroText`, not `onJet` —
                in the dark palette `jet` *is* the bright, so its "on" colour is
                the void, which painted the wordmark invisible on device. */}
            <Image
              source={wordmark}
              resizeMode="contain"
              style={styles.wordmark}
              tintColor={heroPalette.heroText}
            />
            <Text variant="label" color="heroLabel">Sales</Text>
          </View>

          {reason === 'session_expired' ? (
            <Banner tone="warning" title="Session expired — sign in again" />
          ) : null}
          {error ? <Banner tone="danger" title={error.message} /> : null}

          <Card>
            <View style={styles.fields}>
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <Input
                    label="Email"
                    accessibilityLabel="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <Input
                    label="Password"
                    accessibilityLabel="Password"
                    secureToggle
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Button label="Sign in" fullWidth size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
            </View>
          </Card>

          <View style={styles.forgot}>
            <Button label="Forgot password?" variant="ghost" onPress={forgot.open} />
          </View>
        </View>

        <Text variant="caption" color="muted" align="center" style={styles.build}>
          {`ACE Sales · v${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
        </Text>

        <Sheet ref={forgot.ref} snapPoints={['30%']} title="Forgot password?">
          <Text variant="body" color="muted">Ask your admin to reset your password</Text>
        </Sheet>
      </FormScreen>
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  centred: { flex: 1, justifyContent: 'center' },
  wrap: { flex: 1, justifyContent: 'center', gap: space[4] },
  identity: { alignItems: 'center', gap: space[2], marginBottom: space[4] },
  wordmark: { width: 140, height: 40 },
  fields: { gap: space[4] },
  forgot: { alignSelf: 'center' },
  build: { paddingTop: space[4] },
});
