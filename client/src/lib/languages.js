/**
 * Language metadata shared by Toolbar / Sidebar / Editor / OutputPanel.
 * `monaco` is the id Monaco understands; `judge0` maps to the Judge0 API ids
 * used by the execute service.
 */
export const LANGUAGES = {
  javascript: { label: 'JavaScript', monaco: 'javascript', judge0: 'javascript', icon: 'JS', accent: '#f7df1e' },
  python: { label: 'Python', monaco: 'python', judge0: 'python', icon: 'PY', accent: '#4ba5f0' },
  cpp: { label: 'C++', monaco: 'cpp', judge0: 'cpp', icon: 'CPP', accent: '#d97757' },
  java: { label: 'Java', monaco: 'java', judge0: 'java', icon: 'JA', accent: '#e8724d' },
};

export const DEFAULT_LANGUAGE = 'javascript';

export function languageInfo(key) {
  return LANGUAGES[key] || {
    label: key,
    monaco: 'javascript',
    judge0: 'javascript',
    icon: '{}',
    accent: '#94a3b8',
  };
}