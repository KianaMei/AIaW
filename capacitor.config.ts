import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kianamei.alaw',
  appName: 'AlaW',
  webDir: 'dist/spa',
  plugins: {
    EdgeToEdge: {
      backgroundColor: '#00ffffff'
    },
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
}

export default config
