import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Editor from '../components/Editor';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import OutputPanel from '../components/OutputPanel';
import Chat from '../components/Chat';
import socket from '../socket';
import { API_URL } from '../config';
import { DEFAULT_LANGUAGE, languageInfo } from '../lib/languages';

/**
 * Room workspace — the main IDE screen.
 *
 * Responsibilities:
 *   · load + validate the room, select the first file
 *   · track connection state (connect/disconnect) for the toolbar pill
 *   · run the active file's code through the execute service
 */
function RoomPage() {
  const { roomId } = useParams();
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [roomError, setRoomError] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Validate the room, then load its files. A bad link shows a friendly
  //    error instead of a blank page.
  useEffect(() => {
    setLoading(true);
    setRoomError(false);
    setFiles([]);
    setActiveFileId(null);

    fetch(`${API_URL}/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Room not found');
        return fetch(`${API_URL}/api/rooms/${roomId}/files`);
      })
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        if (data.length > 0) {
          setActiveFileId(data[0]._id);
          setLanguage(data[0].language || DEFAULT_LANGUAGE);
        }
      })
      .catch(() => setRoomError(true))
      .finally(() => setLoading(false));
  }, [roomId]);

  // 2. Live user presence.
  useEffect(() => {
    const onUsers = (list) => setUsers(list);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('users-update', onUsers);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('users-update', onUsers);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleFileSwitch = (fileId) => {
    if (activeFileId && activeFileId !== fileId) socket.emit('leave-file', activeFileId);
    const next = files.find((f) => f._id === fileId);
    setActiveFileId(fileId);
    setLanguage(next?.language || DEFAULT_LANGUAGE);
  };

  const handleAddFile = (newFile) => {
    setActiveFileId(newFile._id);
    setLanguage(newFile.language || DEFAULT_LANGUAGE);
  };

  // 3. Run the current file's content via the Judge0 execute service.
  const runCode = async () => {
    setRunning(true);
    setOutput('');
    try {
      const res = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: languageInfo(language).judge0 }),
      });
      const data = await res.json();
      setOutput(data.output || (data.error ? `Error: ${data.error}` : 'No output'));
    } catch (err) {
      setOutput(`Execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const copyRoomLink = async () => {
    const link = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch (error) {
      console.error('Clipboard failed:', error);
    }
  };

  // -------- early returns ------------------------------------------------

  if (roomError) {
    return (
      <div className="cce-app min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="cce-bg-grid" />
        <div style={{
          fontSize: 44, width: 72, height: 72, borderRadius: 18, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)',
          color: 'var(--text-3)', border: '1px solid var(--border-strong)',
        }}>
          ?
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Room not found</h1>
        <p style={{ color: 'var(--text-2)', maxWidth: 460, textAlign: 'center', lineHeight: 1.6 }}>
          This room code doesn't exist or was deleted. Double-check the link,
          or create a fresh room to get started.
        </p>
        <button
          className="cce-btn cce-btn-primary"
          onClick={() => (window.location.href = '/')}
        >
          ← Back to home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cce-app min-h-screen flex items-center justify-center">
        <span className="cce-spinner" style={{ width: 26, height: 26, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="cce-app flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        roomId={roomId}
        language={language}
        setLanguage={setLanguage}
        users={users}
        activeFileId={activeFileId}
        onRun={runCode}
        running={running}
        connected={connected}
        onCopyRoom={copyRoomLink}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          onFileSelect={handleFileSwitch}
          roomId={roomId}
          setFiles={setFiles}
          onAddFile={handleAddFile}
        />

        <main className="flex flex-col flex-1 min-w-0">
          {activeFileId ? (
            <Editor
              key={activeFileId}
              fileId={activeFileId}
              language={language}
              onCodeChange={setCode}
            />
          ) : (
            <div className="cce-empty" style={{ flex: 1, justifyContent: 'center', background: '#0e141c' }}>
              <div style={{ fontSize: 34 }}>📄</div>
              Create a file from the explorer to start coding.
            </div>
          )}
          <OutputPanel output={output} loading={running} language={language} onClear={() => setOutput('')} />
        </main>

        {activeFileId && <Chat fileId={activeFileId} users={users} />}
      </div>
    </div>
  );
}

export default RoomPage;