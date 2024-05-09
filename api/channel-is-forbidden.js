/**
* check if the slack channel is forbidden
* @function 
* @param {string} channelID - The ID of the slack channel
* @returns {boolean}
*/
export default (channelID) => {
  const forbiddenChannels = [
    'C74HZS5A5', // #lobby
    'C75M7C0SY', // # welcome
    'C01504DCLVD', // #scrapbook
    'C0M8PUPU6', // #ship
    'C0EA9S0A0', // #code
    'C0C78SG9L', // #hq
    'C039PAG1AV7', // #cave-entrance-start
  ]
  return forbiddenChannels.includes(channelID)
}
