const geminiProvider = require("./providers/geminiProvider");

// To swap AI provider later, only change this line
const activeProvider = geminiProvider;

async function classifyEmail(body, senderName) {
  return await activeProvider.classify(body, senderName);
}

module.exports = { classifyEmail };