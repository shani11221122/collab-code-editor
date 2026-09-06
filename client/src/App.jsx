import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RoomPage from './pages/RoomPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}

export default App;