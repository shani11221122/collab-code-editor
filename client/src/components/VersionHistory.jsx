import { useState } from 'react';
import { API_URL } from '../config';

/**
 * Version history + restore.
 *
 * The server snapshots file content into `versions[]` (see File model) and the
 * restore route resets the in-memory OT state before broadcasting a
 * `file-restored` event so every connected editor re-syncs.
 */
function VersionHistory({ fileId }) {
  const [versions, setVersions] = useState([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadVersions = async () => {
    setOpen(!open);
    if (open || versions.length > 0) return;
    try {
      const res = await fetch(`${API_URL}/api/files/${fileId}/versions`);
      if (!res.ok) throw new Error('Failed to load versions');
      const data = await res.json();
      setVersions(data.reverse());
    } catch (error) {
      console.error(error);
    }
  };

  const saveVersion = async () => {
    setSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/files/${fileId}/versions`, { method: 'POST' });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const restoreVersion = async (versionId) => {
    if (!window.confirm('Restore this version? Your current changes will be replaced.')) return;
    await fetch(`${API_URL}/api/files/${fileId}/versions/${versionId}/restore`, { method: 'POST' });
    setOpen(false);
  };

  const fmt = (iso) => new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex items-center gap-2">
        <button
          className="cce-btn cce-btn-ghost-2"
          onClick={saveVersion}
          title="Save a manual checkpoint"
          style={{ height: 32, fontSize: 12.5, padding: '0 12px' }}
        >
          {saved ? 'Saved ✓' : 'Checkpoint'}
        </button>
        <button
          className="cce-btn cce-btn-ghost-2"
          onClick={loadVersions}
          title="View version history"
          style={{ height: 32, fontSize: 12.5, padding: '0 12px' }}
        >
          History
        </button>
      </div>

      {open && (
        <div className="cce-dropdown" style={{ right: 0, top: 40 }}>
          <div className="head">
            <span>Version history</span>
          </div>
          <div className="cce-msg-list" style={{ maxHeight: 320 }}>
            {versions.length === 0 && <div className="empty">No checkpoints saved yet</div>}
            {versions.map((v) => (
              <div key={v._id} className="row">
                <span>{fmt(v.savedAt)}</span>
                <button className="restore" onClick={() => restoreVersion(v._id)}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistory;