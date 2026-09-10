import VersionHistory from './VersionHistory';
import { LANGUAGES } from '../lib/languages';

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
    .toUpperCase();
}

function Toolbar({ roomId, language, setLanguage, users = [], activeFileId, onRun, running, connected = true, onCopyRoom }) {
  const isReconnecting = connected === false;

  return (
    <header className="cce-toolbar flex items-center gap-2.5">
      {/* brand */}
      <div className="cce-brand">
        <span className="cce-brand-mark">{'</>'}</span>
        <span>Collab</span>
      </div>

      {/* room id */}
      <button
        className="cce-room-pill"
        onClick={onCopyRoom}
        title="Copy room link"
        aria-label="Copy room link"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="15" height="15" rx="2" />
          <path d="M5 15v2m0 0M9 19l7 0" />
        </svg>
        <span className="cce-mono">{roomId}</span>
      </button>

      <span className="cce-vdivider self-stretch w-px bg-[#a8b3c80f]" />

      {/* language */}
      <select
        className="cce-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        title="Language"
      >
        {Object.entries(LANGUAGES).map(([key, lang]) => (
          <option key={key} value={key}>{lang.label}</option>
        ))}
      </select>

      <span className="cce-vdivider self-stretch w-px bg-[#a8b3c80f]" />

      {/* presence */}
      <div className="ml-auto flex items-center gap-3">
        {activeFileId && <VersionHistory fileId={activeFileId} />}

        <div className="cce-avatar-stack">
          {users.slice(0, 6).map((u, i) => (
            <span
              key={i}
              className="cce-avatar"
              style={{ background: u.color, color: initialsOf(u.username) && '#fff' }}
              title={u.username}
            >
              {initialsOf(u.username)}
            </span>
          ))}
          {users.length > 6 && (
            <span className="cce-avatar" style={{ background: '#1c2434' }} title="More users">
              +{users.length - 6}
            </span>
          )}
        </div>

        {/* connection state */}
        <span className="cce-pill" title={isReconnecting ? 'Reconnecting…' : 'Connected'}>
          <span className={`cce-dot ${isReconnecting ? 'cce-dot-reconnect' : 'cce-dot-live'}`} />
          {isReconnecting ? 'Reconnecting' : 'Live'}
        </span>

        <button
          className="cce-btn cce-btn-primary"
          onClick={onRun}
          disabled={running}
          aria-label="Run code"
        >
          {running ? <span className="cce-spinner" /> : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6l1.5-5 5 3.5 6z" />
            </svg>
          )}
          {running ? 'Running…' : 'Run'}
        </button>
      </div>
    </header>
  );
}

export default Toolbar;