import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aquahub.app',
  appName: 'AquaHub',
  webDir: 'dist',
  server: {
    url: 'https://aquahub.app',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#185b7a',
      showSpinner: false
    }
  }
};

export default config;