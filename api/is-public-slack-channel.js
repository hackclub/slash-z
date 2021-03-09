const { default: fetch } = require("node-fetch")

module.exports = async function(channelID) {
  if (channelID[0].toLowerCase() != 'c') {
    // slack channels start with 'c'
    // this is probably a group 'g', dm 'd' or something else
    return false
  }

  const channelInfo = await fetch(`https://slack.com/api/conversations.info?channel=${channelID}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`
    }
  }).then(r => r.json())

  return channelInfo.ok && !channelInfo.channel['is_private']
}