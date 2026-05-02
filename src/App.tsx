import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { VisualizerPage } from './pages/VisualizerPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ScalerPage } from './pages/ScalerPage';
import { LibraryPage } from './pages/LibraryPage';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <BrowserRouter basename="/Achis-de-Amor">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app/visualizador"
          element={
            <AppLayout>
              <VisualizerPage />
            </AppLayout>
          }
        />
        <Route
          path="/app/generador"
          element={
            <AppLayout>
              <GeneratorPage />
            </AppLayout>
          }
        />
        <Route
          path="/app/escalador"
          element={
            <AppLayout>
              <ScalerPage />
            </AppLayout>
          }
        />
        <Route
          path="/app/biblioteca"
          element={
            <AppLayout>
              <LibraryPage />
            </AppLayout>
          }
        />
        <Route
          path="/app/calculadoras"
          element={
            <AppLayout>
              <CalculatorsPage />
            </AppLayout>
          }
        />
        <Route
          path="/app/configuracion"
          element={
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          }
        />
        <Route
          path="/tutoriales"
          element={
            <AppLayout>
              <TutorialsPage />
            </AppLayout>
          }
        />
        <Route path="/app" element={<Navigate to="/app/visualizador" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
