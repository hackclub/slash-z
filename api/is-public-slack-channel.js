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
        !channelInfo.channel['is_im'] && // is_im: private conversation between two individuals or with a bot
        !channelInfo.channel['is_mpim'] && // is_mpim: unnamed private conversation between multiple users
        !channelInfo.channel['is_group'] // is_group: private channel created before 2021
      )
    }),
   
  ])

  return isPublic
}