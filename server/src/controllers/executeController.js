const axios = require('axios');

// 1. Har language ka ek unique "language_id" hota hai Judge0 mein
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

exports.executeCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    const languageId = LANGUAGE_IDS[language];

    if (!languageId) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    // 2. Judge0 ko submission bhejo — "wait=true" matlab result turant wapas milega
    const response = await axios.post(
      `https://${process.env.JUDGE0_API_HOST}/submissions?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id: languageId,
      },
      {
        headers: {
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
          'X-RapidAPI-Host': process.env.JUDGE0_API_HOST,
          'Content-Type': 'application/json',
        },
      }
    );

    // 3. Result mein output, error, ya compile-error ho sakta hai
    const { stdout, stderr, compile_output, status } = response.data;

    res.json({
      output: stdout || stderr || compile_output || 'No output',
      status: status?.description || 'Unknown',
    });
  } catch (error) {
    res.status(500).json({ error: 'Execution failed: ' + error.message });
  }
};