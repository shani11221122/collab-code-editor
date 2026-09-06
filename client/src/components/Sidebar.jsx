function Sidebar({ files, activeFileId, onFileSelect, roomId, setFiles }) {
  const addFile = async () => {
    const name = prompt('File name (e.g. utils.js):');
    if (!name) return;

    const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const newFile = await res.json();
    setFiles((prev) => [...prev, newFile]); // list mein add karo
  };

  return (
    <div className="w-48 bg-gray-900 text-gray-300 p-3 h-screen">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Files</h3>
        <button onClick={addFile} className="text-xs bg-gray-700 px-1 rounded">+</button>
      </div>
      {files.map((file) => (
        <div
          key={file._id}
          onClick={() => onFileSelect(file._id)}
          className={`py-1 px-2 rounded cursor-pointer text-sm ${
            file._id === activeFileId ? 'bg-blue-700' : 'hover:bg-gray-700'
          }`}
        >
          {file.name}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;