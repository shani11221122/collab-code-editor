import { useState } from 'react';
import { API_URL } from '../config';
import { languageInfo } from '../lib/languages';

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const byExt = {
    js: 'JS', jsx: 'JS', ts: 'TS', tsx: 'TS', py: 'PY',
    cpp: 'CPP', cc: 'CPP', java: 'JA', json: '{}', html: 'HT',
  };
  for (const [k, v] of Object.entries(byExt)) {
    if (ext === k) return v;
  }
  return ext.slice(0, 2).toUpperCase() || '{}';
}

function Sidebar({ files = [], activeFileId, onFileSelect, roomId, setFiles, onAddFile }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const addFile = async () => {
    const name = (draft || '').trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const newFile = await res.json();
      setFiles((prev) => [...prev, newFile]);
      setDraft('');
      setAdding(false);
      onAddFile?.(newFile);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const beginAdd = () => {
    setDraft('');
    setAdding(true);
  };

  return (
    <aside className="cce-sidebar">
      <div className="cce-pane-head">
        <span>Explorer</span>
        <button
          className="cce-ico-btn ml-auto"
          onClick={beginAdd}
          title="New file"
          aria-label="New file"
          style={{ width: 24, height: 24 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </div>

      {adding && (
        <div className="cce-file-add-form">
          <input
            className="cce-input-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFile();
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="index.js"
            autoFocus
          />
          <button className="cce-ico-btn" onClick={addFile} title="Create" style={{ height: 32, width: 32 }}>
            ✓
          </button>
        </div>
      )}

      {files.length === 0 && !adding && (
        <div className="cce-empty">No files yet.<br />Press + to create one.</div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-1.5 pb-4">
        {files.map((file) => {
          const info = languageInfo(file.language || 'javascript');
          return (
            <button
              key={file._id}
              className={`cce-file-item ${file._id === activeFileId ? 'is-active' : ''}`}
              onClick={() => onFileSelect(file._id)}
              title={file.name}
            >
              <span className="cce-file-icon" style={{ color: info.accent }}>
                {fileIcon(file.name)}
              </span>
              <span className="truncate">{file.name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;