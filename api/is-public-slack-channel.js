const { default: fetch } = require("node-fetch")
const airbridge = require("./airbridge")

module.exports = async function(channelID) {
  if (channelID[0].toLowerCase() != 'c') {
    // slack channels start with 'c'
    // this is probably a group 'g', dm 'd' or something else
    return false
  }

  let isPublic = true
  await Promise.all([
    // check Slack to see if this channel is public
    fetch(`https://slack.com/api/conversations.info?channel=${channelID}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`
      }
    }).then(r => r.json()).then(channelInfo => {
      isPublic *= (channelInfo.ok && !channelInfo.channel['is_private'])
    }),
    // check Operations airtable to see if this channel isn't a club channel
    airbridge.find('Clubs', {base: 'Operations', filterByFormula: `{Slack Channel ID}='${channelID}'`}).then(c => {
      isPublic *= !Boolean(c)
    })
  ])

  return isPublic
}