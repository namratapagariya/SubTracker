const geminiProvider = require("./providers/geminiProvider");

// To swap AI provider later, only change this line
const activeProvider = geminiProvider;

async function classifyEmail(body) {
  return await activeProvider.classify(body);
}

module.exports = { classifyEmail };