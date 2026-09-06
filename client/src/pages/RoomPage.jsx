import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import socket from '../socket';

function RoomPage() {
  const { roomId } = useParams();
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/rooms/${roomId}/files`)
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        if (data.length > 0) setActiveFileId(data[0]._id);
      });
  }, [roomId]);

  // Connected users ki list Toolbar ke liye yahan track karo
  useEffect(() => {
    socket.on('users-update', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.off('users-update');
    };
  }, [activeFileId]);

  const handleFileSwitch = (fileId) => {
    if (activeFileId) socket.emit('leave-file', activeFileId);
    setActiveFileId(fileId);
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar language={language} setLanguage={setLanguage} users={users} />
      <div className="flex flex-1">
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onFileSelect={handleFileSwitch}
          roomId={roomId}
          setFiles={setFiles}
        />
        <div className="flex-1">
          {activeFileId && <Editor key={activeFileId} fileId={activeFileId} />}
        </div>
      </div>
    </div>
  );
}

export default RoomPage;