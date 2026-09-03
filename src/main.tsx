import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {DeviceSimulatorWrapper} from './components/DeviceSimulator/DeviceSimulatorWrapper';
import {registerPWA} from './registerServiceWorker';
import {getQualityProfile} from './utils/deviceProfile';
import './index.css';

// Resolve the adaptive quality profile before the first render so the low-power
// UI rules are already in place when the initial paint happens.
const profile = getQualityProfile();
if (profile.isLowPower) {
  document.documentElement.classList.add('low-power-ui');
}
console.info(
  `[perf] tier=${profile.tier} dpr<=${profile.maxPixelRatio} shadows=${profile.shadows} post=${profile.postProcessing} - ${profile.reason}`
);

// Initialize Progressive Web App registration
registerPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceSimulatorWrapper />
  </StrictMode>,
);


