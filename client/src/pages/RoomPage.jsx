import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import socket from '../socket';

function RoomPage() {
  const { roomId } = useParams(); // URL se roomId nikalo
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  // 1. Page load hote hi is room ki files fetch karo
  useEffect(() => {
    fetch(`http://localhost:5000/api/rooms/${roomId}/files`)
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        if (data.length > 0) setActiveFileId(data[0]._id); // pehli file khol do
      });
  }, [roomId]);

  // 2. Jab active file badle, purani file ka socket room chhodo
  const handleFileSwitch = (fileId) => {
    if (activeFileId) socket.emit('leave-file', activeFileId);
    setActiveFileId(fileId);
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar roomId={roomId} />
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