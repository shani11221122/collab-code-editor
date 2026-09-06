function Toolbar({ language, setLanguage, users = [] }) {
  const languages = ['javascript', 'python', 'cpp', 'java'];

  return (
    <div className="flex items-center gap-3 bg-gray-800 text-white p-3">
      <span className="font-semibold">Collab Editor</span>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-gray-700 px-2 py-1 rounded"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        {users.map((u, i) => (
          <span
            key={i}
            style={{ backgroundColor: u.color }}
            className="px-2 py-1 rounded-full text-xs text-black font-medium"
          >
            {u.username}
          </span>
        ))}
        <button className="bg-green-600 px-3 py-1 rounded">
          Run Code {/* Day 8 mein functional banayenge */}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;