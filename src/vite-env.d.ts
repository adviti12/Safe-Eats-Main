
/// <reference types="vite/client" />

// Define Capacitor global object for TypeScript
interface Window {
  Capacitor?: {
    isNativePlatform: () => boolean;
  };
}
