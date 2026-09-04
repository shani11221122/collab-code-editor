import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

function Editor() {
  // 1. Editor ke andar ka code state mein rakhte hain
  const [code, setCode] = useState('// Start typing your code here...');
  const [language, setLanguage] = useState('javascript');

  // 2. Ye function tab chalega jab user editor mein kuch type kare
  const handleEditorChange = (value) => {
    setCode(value); // naya code state mein save karo
    // Day 3 mein: yahan se hum socket.emit() bhi call karenge
  };

  return (
    <MonacoEditor
      height="90vh"
      language={language}
      theme="vs-dark"
      value={code}
      onChange={handleEditorChange}
      options={{
        fontSize: 16,
        minimap: { enabled: true },
        automaticLayout: true, // window resize hone pe editor bhi resize ho
      }}
    />
  );
}

export default Editor;