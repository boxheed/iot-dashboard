
import { Routes, Route } from 'react-router-dom';
import { Dashboard, DeviceManagement, Settings } from '../pages';

/**
 * Application routing configuration
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/devices" element={<DeviceManagement />} />
      <Route path="/settings" element={<Settings />} />
      {/* Catch-all route - redirect to dashboard */}
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}