import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage.jsx';
import Game from './components/Game.jsx';
import ApiGame from './components/ApiGame.jsx';

export default function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-[#080a0e] relative">
      {/* background gradient layers for glass refraction */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_40%_50%,#1a2332_0%,#0d1117_50%,transparent_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_75%_75%,rgba(90,60,150,0.10)_0%,transparent_70%)]" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<Game />} />
        <Route path="/play/api" element={<ApiGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
