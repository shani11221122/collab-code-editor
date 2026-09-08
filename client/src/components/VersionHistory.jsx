import { useState } from 'react';

function VersionHistory({ fileId }) {
  const [versions, setVersions] = useState([]);
  const [open, setOpen] = useState(false);

  const loadVersions = async () => {
    const res = await fetch(`http://localhost:5000/api/files/${fileId}/versions`);
    const data = await res.json();
    setVersions(data.reverse());
    setOpen(true);
  };

  const saveVersion = async () => {
    await fetch(`http://localhost:5000/api/files/${fileId}/versions`, { method: 'POST' });
    alert('Checkpoint saved!');
  };

  const restoreVersion = async (versionId) => {
    if (!confirm('Restore this version?')) return;
    await fetch(`http://localhost:5000/api/files/${fileId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={saveVersion} className="text-xs bg-purple-600 px-2 py-1 rounded mr-2">
        Save Checkpoint
      </button>
      <button onClick={loadVersions} className="text-xs bg-gray-700 px-2 py-1 rounded">
        History
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded shadow-lg z-10 p-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold">Versions</span>
            <button onClick={() => setOpen(false)} className="text-xs">✕</button>
          </div>
          {versions.length === 0 && <p className="text-xs text-gray-400">No checkpoints yet</p>}
          {versions.map((v) => (
            <div key={v._id} className="flex justify-between items-center text-xs py-1 border-b border-gray-700">
              <span>{new Date(v.savedAt).toLocaleString()}</span>
              <button onClick={() => restoreVersion(v._id)} className="text-blue-400 hover:underline">
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VersionHistory;