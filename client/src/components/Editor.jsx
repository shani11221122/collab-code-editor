import { useEffect, useState, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import socket from '../socket';
import { languageInfo } from '../lib/languages';

/**
 * Collaborative editor.
 *
 * Concurrency model (Day 4 OT):
 *   every keystroke produces an op {type, pos, char|length} sent with the last
 *   known revision. The server transforms each op against everything that
 *   happened after that revision and rebroadcasts it to the room.
 *
 * Key subtlety: the Monaco wrapper re-applies the `value` prop programmatically
 * (change.source === ''). Those must never be treated as user edits, otherwise
 * remote updates would be echoed back as new operations.
 */
function Editor({ fileId, language = 'javascript', onCodeChange }) {
  const [code, setCode] = useState('');
  const [remoteCursors, setRemoteCursors] = useState({});
  const [ready, setReady] = useState(false);
  const revisionRef = useRef(0);
  const editorRef = useRef(null);
  const lastValueRef = useRef('');
  const localUserRef = useRef('Guest');

  // -------- helpers -----------------------------------------------------

  function applyOpToContent(content, op) {
    if (op.type === 'insert') {
      return content.slice(0, op.pos) + op.char + content.slice(op.pos);
    }
    if (op.type === 'delete') {
      return content.slice(0, op.pos) + content.slice(op.pos + op.length);
    }
    return content;
  }

  function replaceContent(content) {
    lastValueRef.current = content;
    setCode(content);
    onCodeChange?.(content);
  }

  function applyRemoteOp(op) {
    replaceContent(applyOpToContent(lastValueRef.current, op));
  }

  // -------- room lifecycle ----------------------------------------------

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const username = storedUser?.username || 'Guest';
    localUserRef.current = username;
    lastValueRef.current = '';

    socket.emit('join-file', fileId, username);

    // Fires on first connect AND every reconnect. Re-joining makes the server
    // hand us the latest content + revision, discarding whatever we missed.
    socket.on('connect', () => {
      socket.emit('join-file', fileId, localUserRef.current);
    });

    socket.on('init-file', ({ content, revision }) => {
      revisionRef.current = revision;
      replaceContent(content || '');
    });

    socket.on('remote-operation', ({ op, revision }) => {
      revisionRef.current = revision;
      applyRemoteOp(op);
    });

    socket.on('operation-ack', ({ revision }) => {
      revisionRef.current = revision;
    });

    socket.on('remote-cursor', ({ socketId, position, username, color }) => {
      setRemoteCursors((prev) => ({ ...prev, [socketId]: { position, username, color } }));
    });

    socket.on('file-restored', ({ content, revision }) => {
      revisionRef.current = revision;
      replaceContent(content);
    });

    return () => {
      socket.off('connect');
      socket.off('init-file');
      socket.off('remote-operation');
      socket.off('operation-ack');
      socket.off('remote-cursor');
      socket.off('file-restored');
      socket.emit('leave-file', fileId);
    };
  }, [fileId]);

  // -------- editor change handling --------------------------------------

  function handleEditorChange(newValue, event) {
    // 1) Changes caused by our own `value` sync (the wrapper re-applies it
    //    with an empty source). Mirror the state, never broadcast.
    if (!event?.source || event.source === 'api') {
      lastValueRef.current = newValue;
      setCode(newValue);
      onCodeChange?.(newValue);
      return;
    }

    // 2) Real user edits (typing, paste, IME, undo/redo).
    const ops = [];
    (event.changes || []).forEach((change) => {
      if (change.text.length > 0 && change.rangeLength > 0) {
        // Replacement (select + type): delete first, then insert. Both ops are
        // relative to the pre-edit document — exactly what the OT transform
        // expects when it reconciles the insert against the delete.
        ops.push(
          { type: 'delete', pos: change.rangeOffset, length: change.rangeLength },
          { type: 'insert', pos: change.rangeOffset, char: change.text }
        );
      } else if (change.text.length > 0 && change.rangeLength === 0) {
        ops.push({ type: 'insert', pos: change.rangeOffset, char: change.text });
      } else if (change.text.length === 0 && change.rangeLength > 0) {
        ops.push({ type: 'delete', pos: change.rangeOffset, length: change.rangeLength });
      }
    });

    for (const op of ops) {
      socket.emit('operation', { fileId, op, revision: revisionRef.current });
    }

    lastValueRef.current = newValue;
    setCode(newValue);
    onCodeChange?.(newValue);
  }

  function handleCursorPosition(editor) {
    editor.onDidChangeCursorPosition((e) => {
      socket.emit('cursor-move', {
        fileId,
        position: { lineNumber: e.position.lineNumber, column: e.position.column },
      });
    });
  }

  function beforeMount(monaco) {
    monaco.editor.defineTheme('cce-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '818ff8' },
        { token: 'keyword.control', foreground: '818ff8' },
        { token: 'string', foreground: '7ee7a5' },
        { token: 'number', foreground: 'f5a524' },
        { token: 'comment', foreground: '5f6b7d', fontStyle: 'italic' },
        { token: 'type', foreground: '4fa8ff' },
        { token: 'type.identifier', foreground: '4fa8ff' },
        { token: 'identifier', foreground: 'e6eaf2' },
        { token: 'function', foreground: '7dd3fc' },
        { token: 'keyword.operator', foreground: 'c9d4e3' },
        { token: 'operator', foreground: 'c9d4e3' },
        { token: 'delimiter', foreground: '6b7686' },
        { token: 'delimiter.bracket', foreground: '8a97ad' },
        { token: 'string.escape', foreground: 'f5a524' },
        { token: 'regexp', foreground: 'c586c0' },
      ],
      colors: {
        'editor.background': '#0e141c',
        'editor.foreground': '#c9d4e3',
        'editorCursor.foreground': '#10b981',
        'editor.selectionBackground': '#2b3a56',
        'editor.inactiveSelectionBackground': '#232f45',
        'editor.lineHighlightBackground': '#131a25',
        'editorLineNumber.foreground': '#4b5873',
        'editorLineNumber.activeForeground': '#8a97ad',
        'editorIndentGuide.background': '#1a2230',
        'editorIndentGuide.activeBackground': '#3a4a63',
        'editorGutter.background': '#0e141c',
        'editorWidget.background': '#161c28',
        'editorSuggestWidget.background': '#1c2434',
        'editorSuggestWidget.selectedBackground': '#2a3448',
        'editorSuggestWidget.foreground': '#c9d4e3',
        'scrollbarSlider.background': '#374258',
        'scrollbarSlider.hoverBackground': '#47556e',
        'scrollbarSlider.activeBackground': '#55668a',
        'minimap.background': '#0e141c',
        'minimapSlider.background': '#374258',
        'breadcrumbs.background': '#0e141c',
      },
    });
  }

  // -------- render ------------------------------------------------------

  return (
    <div className="cce-editor-wrap">
      <MonacoEditor
        height="100%"
        language={languageInfo(language).monaco}
        theme="cce-dark"
        beforeMount={beforeMount}
        value={code}
        onChange={handleEditorChange}
        onMount={(editor) => {
          editorRef.current = editor;
          setReady(true);
          handleCursorPosition(editor);
        }}
        options={{
          fontSize: 13.5,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
          fontLigatures: true,
          lineHeight: 22,
          minimap: { enabled: true, renderCharacters: false, size: 'proportional' },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          cursorBlinking: 'smooth',
          automaticLayout: true,
          padding: { top: 10, bottom: 10 },
          renderLineHighlight: 'all',
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: 'active', indentation: true },
          wordWrap: 'off',
        }}
      />

      <div className="cce-remote-chip">
        {Object.values(remoteCursors).map((cursor, i) => (
          <span key={i} className="tag" style={{ color: cursor.color }}>
            <span className="dot" />
            {cursor.username} · L{cursor.position.lineNumber}
          </span>
        ))}
      </div>

      {!ready && (
        <div className="cce-empty" style={{ position: 'absolute', inset: 0, background: '#0e141c' }}>
          <span className="cce-spinner-sm" />
          Loading editor…
        </div>
      )}
    </div>
  );
}

export default Editor;