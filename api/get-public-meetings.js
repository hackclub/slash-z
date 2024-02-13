import Prisma from "./prisma.js"
import transcript from "./transcript.js"
import fetch from 'node-fetch'

/**
* Get the number of participants in a slack call
* @function
* @param {string} slackCallID - The ID of the slack call
* @returns {Promise<number>}
*/
async function getParticipantCount(slackCallID) {
  const callInfo = await fetch('https://slack.com/api/calls.info', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: slackCallID
    })
  }).then(r => r.json())
  if (!callInfo.call.users) {
    return 0
  }
  return callInfo.call.users.length
}

/**
* Get a list of meetings having one or more participants
* @function
* @returns {Promise<Object[]>}
*/
export default async function() {
  const meetings = await Prisma.get('meeting', {where: {NOT: {startedAt: {equals: null}}, endedAt: {equals: null}, public: true}})
  const meetingsWithParticipants = await Promise.all(
    meetings.map(async m => ({
      channel: m.slackChannelId,
      channelFlavor: transcript(`channelFlavor.${m.slackChannelID}`, {}, null),
      joinURL: m.joinURL,
      participantCount: await getParticipantCount(m.slackCallID)
    }))
  )
  return meetingsWithParticipants.filter(m => m.participantCount > 0)
}