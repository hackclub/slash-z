export default channelID => {
  const forbiddenChannels = [
    'C74HZS5A5', // #lobby
    'C75M7C0SY', // # welcome
    'C01504DCLVD', // #scrapbook
    'C0M8PUPU6' // #ship
  ]
  return forbiddenChannels.includes(channelID)
}
