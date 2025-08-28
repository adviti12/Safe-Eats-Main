
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f89d775a84e94221877de5f4b05181d6',
  appName: 'allergy-aware-scanner-ai',
  webDir: 'dist',
  server: {
    url: "https://f89d775a-84e9-4221-877d-e5f4b05181d6.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    // Add plugin configuration here if needed
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
