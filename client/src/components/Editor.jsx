import { useEffect, useState, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import socket from '../Socket';

function Editor({ roomId }) {
  const [code, setCode] = useState('// Start typing...');
  
  // 1. useRef taake hum "apna bheja hua change" dobara apply na karein
  const isRemoteChange = useRef(false);

  // 2. Component mount hote hi room join karo, aur listener lagao
  useEffect(() => {
    socket.emit('join-room', roomId);

    // 3. Jab server se doosre user ka change aaye
    socket.on('receive-code-change', (newCode) => {
      isRemoteChange.current = true; // flag lagao: ye humne khud nahi likha
      setCode(newCode);
    });

    // 4. Cleanup: component unmount hote hi listener hatao
    return () => {
      socket.off('receive-code-change');
    };
  }, [roomId]);

  const handleEditorChange = (value) => {
    setCode(value);

    // 5. Agar ye change remote se nahi aaya (yani user ne khud type kiya)
    //    tabhi server ko bhejo
    if (!isRemoteChange.current) {
      socket.emit('code-change', { roomId, code: value });
    }
    isRemoteChange.current = false; // reset
  };

  return (
    <MonacoEditor
      height="90vh"
      language="javascript"
      theme="vs-dark"
      value={code}
      onChange={handleEditorChange}
    />
  );
}

export default Editor;