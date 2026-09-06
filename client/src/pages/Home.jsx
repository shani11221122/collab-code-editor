import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [joinId, setJoinId] = useState('');
  const navigate = useNavigate();

  // 1. Naya room banane ke liye backend ko call karo
  const createRoom = async () => {
    const res = await fetch('http://localhost:5000/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Project' }),
    });
    const room = await res.json();
    // 2. Naya room ban gaya — us page pe navigate kar do
    navigate(`/room/${room.roomId}`);
  };

  const joinRoom = () => {
    if (joinId.trim()) navigate(`/room/${joinId.trim()}`);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Collab Code Editor</h1>
      <button onClick={createRoom} className="bg-green-600 px-4 py-2 rounded">
        Create New Room
      </button>
      <div className="flex gap-2">
        <input
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          placeholder="Enter Room ID"
          className="px-2 py-1 rounded text-black"
        />
        <button onClick={joinRoom} className="bg-blue-600 px-4 py-2 rounded">
          Join
        </button>
      </div>
    </div>
  );
}

export default Home;