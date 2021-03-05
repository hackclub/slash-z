const ZoomClient = require("./zoom-client")
const AirBridge = require("./airbridge")
const { default: fetch } = require("node-fetch")

module.exports = async (zoomID, forceClose = false) => {
  const meeting = await AirBridge.find('Meetings', {filterByFormula: `{Zoom ID}='${zoomID}'`})
  const host = await AirBridge.find('Hosts', {filterByFormula: `RECORD_ID()='${meeting.fields['Host'][0]}'`})

  const zoom = new ZoomClient({zoomSecret: host.fields['API Secret'], zoomKey: host.fields['API Key']})

  // check if zoom meeting still has participants...
  const metrics = await zoom.get({path: `metrics/meetings/${meeting.fields['Zoom ID']}/participants`})
  if (!forceClose && metrics.total_records > 0) {
    console.log(`Meeting ${meeting.fields['Zoom ID']} has ${metrics.total_records} participant(s). Not closing meeting. Run with forceClose=true to force close the meeting even with participants.`)
    return null
  }

  // ending the meeting happens in X steps...

  // 1) if was posted in slack, end slack call
  if (meeting.fields['Slack Call ID']) {
    const startTime = meeting.fields['Started At']
    const duration = Date.now() - (new Date(0)).setUTCSeconds(startTime)
    console.log('Closing call', meeting.fields['Slack Call ID'] ,'in Slack, start time was', startTime, '& end time was', Date.now(), 'so duration is ', duration)
    const _slackPost = await fetch('https://slack.com/api/calls.end', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({id: meeting.fields['Slack Call ID'],duration: 1800}) // hard coding duration while debugging
    }).then(r => r.json())
  }

  // 2) set meeting status in zoom to 'end'
  await zoom.put({path: `meetings/${meeting.fields['Zoom ID']}/status`, body: {action: 'end'}})
  await zoom.patch({path : `meetings/${meeting.fields['Zoom ID']}`, body: { settings: { join_before_host: false }}})

  // 3) end airtable call
  await AirBridge.patch('Meetings', meeting.id, { 'Ended At': Date.now() })
}