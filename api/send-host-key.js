module.exports = async ({creatorSlackID, hostKey}) => {
  const slackDM = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: creatorSlackID,
      text: `The host key for your newly created call is ${hostKey}.`
    })
  }).then(r => r.json())
  console.log({slackDM})
}