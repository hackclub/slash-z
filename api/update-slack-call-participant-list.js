const { default: fetch } = require("node-fetch")
const stringToColor = require("./string-to-color")

module.exports = async (addOrRemove, callID, zoomParticipant) => {
  const users = [{
    external_id: zoomParticipant.user_id,
    display_name: zoomParticipant.user_name,
    avatar_url: `https://ui-avatars.com/api/?name=${zoomParticipant.user_name}&background=${stringToColor(zoomParticipant.user_name)}`
  }]
  console.log({users, callID})
  const result = await fetch(`https://slack.com/api/calls.participants.${addOrRemove}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: callID,
      users
    })
  }).then(r => r.json())
  console.log({result})

  return result
}
