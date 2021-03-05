const { default: fetch } = require("node-fetch")
const md5 = require("md5")
const stringToColor = require("./string-to-color")

async function userToAvatar({name, email}) {
  const gravatarUrl = `https://gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=404`
  return await fetch(gravatarUrl).then(r => {
    if (r.ok) {
      return gravatarUrl
    } else {
      const fallbackAvatar = `https://ui-avatars.com/api/?name=${name}&background=${stringToColor(name)}`
      return fallbackAvatar
    }
  })
}

module.exports = async (addOrRemove, callID, zoomParticipant) => {
  const { user_name: name, email, user_id: zoomID } = zoomParticipant
  const user = { external_id: zoomID }
  // if (addOrRemove=='add') {
    user.avatar_url = await userToAvatar({name, email})
    user.display_name = name
  // }
  const result = await fetch(`https://slack.com/api/calls.participants.${addOrRemove}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: callID,
      users: [user]
    })
  }).then(r => r.json())

  return result
}
