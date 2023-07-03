import fetch from "node-fetch"
import md5 from "md5"
import stringToColor from "./string-to-color.js"

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

export default async (addOrRemove, callID, zoomParticipant) => {
  const { user_name: name, email, user_id: zoomID } = zoomParticipant
  const user = { }
  // Why uniquify by name instead of zoomID? the ID zoom gives us changes per join for users under a non-hackclub account.
  // ex. someone@gmail.com (without a hack club zoom license) joins, leaves, & rejoins the call
  // their first participant_join event has user ID 16778240, & their second participant_join event has user ID 16790528
  user['external_id'] = name || email || zoomID
  user['avatar_url'] = await userToAvatar({name, email})
  user['display_name'] = name

  const result = await fetch(`https://slack.com/api/calls.participants.${addOrRemove}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      id: callID,
      users: [user]
    })
  }).then(r => r.json())
  console.log(result)
  return result
}
