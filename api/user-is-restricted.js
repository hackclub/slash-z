import fetch from 'node-fetch'

export default async (userID) => {
  const userInfo = await fetch(`https://slack.com/api/users.info?user=${userID}`, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`
    }
  }).then(r => r.json())
  const { is_restricted, is_ultra_restricted } = userInfo.user
  return is_restricted || is_ultra_restricted
}