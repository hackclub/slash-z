const ZoomClient = require('./zoom-client')
const AirBridge = require("./airbridge")
const closeZoomCall = require('./close-zoom-call')
const sendHostKey = require('./send-host-key')

async function availableHost() {
  const hosts = await AirBridge.get('Hosts', {filterByFormula: 'AND({Open Meetings}<1,{Enabled}=TRUE())'})
  return hosts[Math.floor(Math.random() * hosts.length)]
}

module.exports = async ({creatorSlackID}={}) => {
  // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
  // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
  // ¯\_(ツ)_/¯
  let host = await availableHost()

  // no free hosts? let's try closing some stale zoom calls
  if (!host) {
    const cutoff = 60*2 // 2 minutes
    // either the call is open & has been for the last 2 minutes,
    // OR the call was opened by the person who just initiated the 'new call'
    const formula = `
    AND(
      {status}='OPEN',
      OR(
        DATETIME_DIFF(NOW(),{Started At})>${cutoff},
        {Creator Slack ID}='${creatorSlackID}'
      )
    )
    `
    const staleCalls = await AirBridge.get('Meetings', {filterByFormula: formula})
    if (staleCalls.length > 0) {
      console.log(`No free hosts! I found ${staleCalls} meeting(s) that might be over, so I'll try closing them & trying again`)
      await Promise.all(staleCalls.map(async (call) => {
        await closeZoomCall(call.fields['Zoom ID'])
      }))
      console.log("Now let's see if there's another open host...")
      host = await availableHost()
    }
  }

  // still no free host? uh oh! let's reply back with an error
  if (!host) {
    throw new Error('out of open hosts!')
  }

  // make a zoom client for the open host
  const zoom = new ZoomClient({zoomSecret: host.fields['API Secret'], zoomKey: host.fields['API Key']})

  // no zoom id? no problem! let's figure it out and cache it for next time
  if (!host.fields['Zoom ID'] || host.fields['Zoom ID'] == '') {
    // get the user's zoom id
    const hostZoom = await zoom.get({ path: `users/${host.fields['Email']}` })
    host = await AirBridge.patch('Hosts', host.id, {'Zoom ID': hostZoom.id})

    // (max@maxwofford.com) This looks super redundant. Why are we also setting
    // these fields on meeting creation? Zoom's docs don't say it (at time of
    // writing), but zoom requires both the user's setting "host_video=true" for
    // the meeting "host_video=true" to work. ¯\_(ツ)_/¯
    zoomUser = await zoom.patch({path: `users/${host.fields['Zoom ID']}/settings`, body: {
      schedule_meeting: {
        host_video: true,
        participants_video: true,
        join_before_host: true,
        embeded_password_in_join_link: true,
      },
      meeting_security: {
        embed_password_in_join_link: true
      },
    }})
  }

  const hostKey = Math.random().toString().substr(2,6).padEnd(6,0)
  await zoom.patch({ path: `users/${host.fields['Zoom ID']}`, body: { host_key: hostKey}})

  // start a meeting with the zoom client
  const meeting = await zoom.post({
    path: `users/${host.fields['Zoom ID']}/meetings`,
    body: {
      type: 2, // type 2 == scheduled meeting
      host_video: true,
      participant_video: true,
      join_before_host: true,
    }
  })

  // and let the host know
  sendHostKey({ hostKey, creatorSlackID, hostName: host.fields['Name Displayed to Users'] })

  return {
    ...meeting,
    host: host,
    hostKey: hostKey
  }
}