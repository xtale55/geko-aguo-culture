import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c4c0bdcad9424109bdb18569081be53d',
  appName: 'AquaHub',
  webDir: 'dist',
  server: {
    url: 'https://c4c0bdca-d942-4109-bdb1-8569081be53d.lovableproject.com?forceHideBadge=true',
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