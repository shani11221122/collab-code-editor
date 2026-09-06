import { useEffect, useState, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import socket from '../socket';

function Editor({ fileId }) {
  const [code, setCode] = useState('');
  const revisionRef = useRef(0);
  const isApplyingRemote = useRef(false);
  const editorRef = useRef(null);

  // Operation ko actual editor text pe apply karna
  // (Ye function upar rakha hai taake pehli nazar mein hi dikh jaye — 
  //  warna hoisting ki wajah se neeche bhi kaam karta)
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
    socket.emit('join-room',  fileId );

    socket.on('init-state', ({ revision }) => {
      revisionRef.current = revision;
    });

    socket.on('remote-operation', ({ op, revision }) => {
      applyOperationToEditor(op);
      revisionRef.current = revision;
    });

    socket.on('operation-ack', ({ revision }) => {
      revisionRef.current = revision;
    });

    return () => {
      socket.off('remote-operation');
      socket.off('operation-ack');
      socket.off('init-state');
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

  return (
    <MonacoEditor
      height="90vh"
      language="javascript"
      theme="vs-dark"
      value={code}
      onChange={handleEditorChange}
      onMount={(editor) => (editorRef.current = editor)}
    />
  );
}

export default Editor;