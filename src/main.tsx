import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {DeviceSimulatorWrapper} from './components/DeviceSimulator/DeviceSimulatorWrapper';
import {registerPWA} from './registerServiceWorker';
import './index.css';

// Initialize Progressive Web App registration
registerPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceSimulatorWrapper />
  </StrictMode>,
);


