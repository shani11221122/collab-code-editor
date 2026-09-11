const axios = require('axios');

// Har language ka ek unique "language_id" hota hai Judge0 mein
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

// User-friendly aliases → canonical language key
const LANGUAGE_ALIASES = {
  js: 'javascript',
  node: 'javascript',
  py: 'python',
  'c++': 'cpp',
  c: 'cpp',
};

exports.executeCode = async (req, res) => {
  try {
    const rawCode = req.body?.code?.toString?.() || '';
    const code = rawCode.trim();
    const requested = (req.body?.language || '').toString().toLowerCase();
    const language = LANGUAGE_ALIASES[requested] || requested;
    const languageId = LANGUAGE_IDS[language];

    // 1. Validation — friendly errors instead of letting Judge0 reject us
    if (!languageId) {
      return res.status(400).json({ error: `Unsupported language: "${requested}"` });
    }
    if (!code) {
      return res.status(400).json({ error: 'Nothing to run — write some code first.' });
    }

    // 2. Judge0 ko submission bhejo — "wait=true" matlab result turant wapas milega
    const response = await axios.post(
      `https://${process.env.JUDGE0_API_HOST}/submissions?base64_encoded=false&wait=true`,
      { source_code: rawCode, language_id: languageId },
      {
        headers: {
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
          'X-RapidAPI-Host': process.env.JUDGE0_API_HOST,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    // 3. Result mein output, error, ya compile-error ho sakta hai
    const data = response.data || {};
    const stdout = data.stdout?.trimEnd?.() || '';
    const stderr = data.stderr?.trimEnd?.() || '';
    const compile = data.compile_output?.trimEnd?.() || '';

    res.json({
      output: stdout || compile || stderr || 'No output',
      status: data.status?.description || 'Unknown',
    });
  } catch (error) {
    // 4. Real reason user ko do — raw axios string nahi
    const detail = error.response?.data;
    let message = 'Execution failed';

    if (error.request && !error.response) {
      message = 'Could not reach the Judge0 sandbox — check your network and JUDGE0_API_KEY.';
    } else if (typeof detail === 'object' && detail !== null) {
      const parts = Object.entries(detail)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      if (parts.length) {
        message = `Judge0 rejected the request — ${parts.join('; ')}`;
      } else if (detail.message) {
        message = String(detail.message);
      }
    } else if (detail) {
      message = `Judge0 rejected the request: ${String(detail)}`;
    } else {
      message += `: ${error.message}`;
    }

    res.status(500).json({ error: message });
  }
};