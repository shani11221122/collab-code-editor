import { useEffect, useState, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import socket from '../socket';

function Editor({ fileId }) {
  const [code, setCode] = useState('');
  const [remoteCursors, setRemoteCursors] = useState({});
  const revisionRef = useRef(0);
  const isApplyingRemote = useRef(false);
  const editorRef = useRef(null);

  function applyOperationToEditor(op) {
    isApplyingRemote.current = true;
    setCode((prevCode) => {
      if (op.type === 'insert') {
        return prevCode.slice(0, op.pos) + op.char + prevCode.slice(op.pos);
      } else if (op.type === 'delete') {
        return prevCode.slice(0, op.pos) + prevCode.slice(op.pos + op.length);
      }
      return prevCode;
    });
  }

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const username = storedUser?.username || 'Guest';

    socket.emit('join-file', fileId, username);

    socket.on('init-file', ({ content, revision }) => {
      setCode(content);
      revisionRef.current = revision;
    });

    socket.on('remote-operation', ({ op, revision }) => {
      applyOperationToEditor(op);
      revisionRef.current = revision;
    });

    socket.on('operation-ack', ({ revision }) => {
      revisionRef.current = revision;
    });

    socket.on('remote-cursor', ({ socketId, position, username, color }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: { position, username, color },
      }));
    });

    return () => {
      socket.off('init-file');
      socket.off('remote-operation');
      socket.off('operation-ack');
      socket.off('remote-cursor');
      socket.emit('leave-file', fileId);
    };
  }, [fileId]);

  function handleEditorChange(newValue, event) {
    if (isApplyingRemote.current) {
      isApplyingRemote.current = false;
      setCode(newValue);
      return;
    }

    event.changes.forEach((change) => {
      let op;
      if (change.text.length > 0 && change.rangeLength === 0) {
        op = { type: 'insert', pos: change.rangeOffset, char: change.text };
      } else if (change.text.length === 0 && change.rangeLength > 0) {
        op = { type: 'delete', pos: change.rangeOffset, length: change.rangeLength };
      } else {
        return;
      }
      socket.emit('operation', { fileId, op, revision: revisionRef.current });
    });

    setCode(newValue);
  }

  function handleCursorPosition(editor) {
    editor.onDidChangeCursorPosition((e) => {
      socket.emit('cursor-move', {
        fileId,
        position: { lineNumber: e.position.lineNumber, column: e.position.column },
      });
    });
  }

  return (
    <div className="relative h-full">
      <MonacoEditor
        height="90vh"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        onMount={(editor) => {
          editorRef.current = editor;
          handleCursorPosition(editor);
        }}
        options={{
          fontSize: 16,
          minimap: { enabled: true },
          automaticLayout: true,
        }}
      />

      {/* Remote cursors ki chhoti list — kaun kis line pe hai */}
      <div className="absolute top-2 right-4 flex flex-col gap-1 pointer-events-none">
        {Object.values(remoteCursors).map((cursor, i) => (
          <div
            key={i}
            style={{ color: cursor.color }}
            className="text-xs bg-gray-800/80 px-2 py-0.5 rounded"
          >
            {cursor.username} — Line {cursor.position.lineNumber}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Editor;