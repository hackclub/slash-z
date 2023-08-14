import airbridge from "./airbridge.js"
import fetch from 'node-fetch'

/**
* Returns true if the channelID is a public slack channel
* @function
* @param {string} channelID - The ID of the slack channel
* @returns {Promise<boolean>}
*/
export default async function(channelID) {
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
      isPublic = isPublic && (
        channelInfo.ok &&
        !channelInfo.channel['is_private'] &&
        !channelInfo.channel['is_im'] &&
        !channelInfo.channel['is_mpim'] &&
        !channelInfo.channel['is_group']
      )
    }),
    // check Operations airtable to see if this channel isn't a club channel
    airbridge.find('Clubs', {base: 'Operations', filterByFormula: `{Slack Channel ID}='${channelID}'`}).then(c => {
      isPublic = isPublic && !Boolean(c)
    })
  ])

  return isPublic
}