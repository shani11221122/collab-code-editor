function Toolbar({ language, setLanguage }) {
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

      <button className="ml-auto bg-green-600 px-3 py-1 rounded">
        Run Code {/* Day 8 mein functional banayenge */}
      </button>
    </div>
  );
}

export default Toolbar;