import fetch from 'node-fetch'

const postMessage = async ({channel, text}) => {
  return await fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({channel, text})
  }).then(r => r.json())
}

export default async ({creatorSlackID, hostKey}) => {
  console.log('Posting the Slack DM', {creatorSlackID, hostKey})
  // while debugging, only run for tester
  const slackDMs = []
//   slackDMs.push(await postMessage({
//     channel: creatorSlackID,
//     text: `_*${hostKey}*_ is the host key for the call you just opened.`
//   }));

  return slackDMs;
}
