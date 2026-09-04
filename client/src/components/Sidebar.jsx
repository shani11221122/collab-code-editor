function Sidebar() {
  // Abhi dummy files — Day 5 mein real multi-file logic add karenge
  const files = ['index.js', 'utils.js', 'app.py'];

  return (
    <div className="w-48 bg-gray-900 text-gray-300 p-3 h-screen">
      <h3 className="text-sm font-bold mb-2">Files</h3>
      {files.map((file) => (
        <div key={file} className="py-1 px-2 hover:bg-gray-700 rounded cursor-pointer text-sm">
          {file}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;