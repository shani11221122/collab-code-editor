import { languageInfo } from '../lib/languages';

/**
 * Terminal-styled output console. Purely visual — execution happens through
 * the Judge0-backed execute service (server/src/controllers/executeController).
 */
function OutputPanel({ output = '', loading = false, language = 'javascript', onClear }) {
  const info = languageInfo(language);

  return (
    <div className="cce-terminal">
      <div className="cce-term-head">
        <span className="cce-term-dots"><i /><i /><i /></span>
        <span style={{ width: 10 }} />
        <span>output — {info.label}</span>
        <button
          className="cce-ico-btn"
          onClick={onClear}
          title="Clear output"
          aria-label="Clear output"
          style={{ width: 22, height: 22, marginLeft: 'auto' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6l12 0M6 6l0 12" />
          </svg>
        </button>
      </div>

      <div className="cce-term-body">
        {loading && (
          <span style={{ color: '#f5a524' }}>
            <span className="cce-spinner-sm" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Running…
          </span>
        )}
        {!loading && !output && (
          <span style={{ color: '#5f6b7d' }}>
            {`$ echo "press Run to execute"`}
            <span className="cce-caret" />
          </span>
        )}
        {!loading && output && (
          <span>{output}</span>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;