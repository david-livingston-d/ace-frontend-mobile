import Config from 'react-native-config';

export const env = {
  API_URL: (Config.API_URL ?? '').replace(/\/$/, ''),
  POSTHOG_API_KEY: Config.POSTHOG_API_KEY ?? '',
  POSTHOG_HOST: Config.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  ENV: (Config.ENV ?? 'dev') as 'dev' | 'test' | 'prod',
};

if (!env.API_URL) throw new Error('API_URL is not set — copy .env.example to .env');
