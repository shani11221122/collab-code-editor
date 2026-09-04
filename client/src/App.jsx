import { useState } from 'react';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';

function App() {
  const [language, setLanguage] = useState('javascript');

  return (
    <div className="flex flex-col h-screen">
      <Toolbar language={language} setLanguage={setLanguage} />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1">
          <Editor language={language} />
        </div>
      </div>
    </div>
  );
}

export default App;