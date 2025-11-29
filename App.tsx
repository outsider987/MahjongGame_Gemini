import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OrientationGuard } from './components/OrientationGuard';
import { AuthProvider } from './contexts/AuthContext';
import { routes } from './routes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OrientationGuard>
          <div className="w-full h-screen overflow-hidden bg-[#1a1a1a]">
            <Routes>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
            </Routes>
          </div>
        </OrientationGuard>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
