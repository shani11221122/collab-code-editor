import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RoomPage from './pages/RoomPage';
import Login from './pages/Login';
import Signup from './pages/Signup';



function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
}

export default App;