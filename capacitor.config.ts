import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rids.RidsMovilFront',
  appName: 'RidsMovilFront',
  webDir: 'www',

  server: {
    cleartext: true,
  },

  ios: {
    contentInset: 'always',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },

    Camera: {
      permissions: {
        camera: 'prompt',
        photos: 'prompt',
      },
    },
  },
};

export default config;
