import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rids.RidsMovilFront',
  appName: 'RidsMovilFront',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    cleartext: true, // Permite conexiones HTTP no seguras en desarrollo
  },

  ios: {
    // Ajustes específicos de iOS
    contentInset: 'always', // Ajusta el padding automático (opcional)
    scrollEnabled: true, // Si quieres permitir scroll nativo
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
  
};

export default config;
