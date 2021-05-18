const { default: fetch } = require("node-fetch")

module.exports = async function(userID) {
  const userInfo = await fetch(`https://slack.com/api/users.info?token=${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}&user=${userID}`).then(r => r.json())
  return userInfo.user.is_restricted
}