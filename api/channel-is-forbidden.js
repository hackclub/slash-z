const { default: fetch } = require("node-fetch")

module.exports = async function(channelID) {
  const forbiddenChannels = ['C74HZS5A5', 'C75M7C0SY', 'C01504DCLVD', 'C0M8PUPU6'] // lobby, welcome scrapbook, ship
  return !forbiddenChannels.includes(channelID)
}