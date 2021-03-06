const ZoomClient = require('./zoom-client')
const AirBridge = require("./airbridge")
const sendHostKey = require('./send-host-key')
const closeStaleCalls = require('./close-stale-calls')

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
    console.log("No free hosts! I'm going to try closing stale calls")
    const closedCalls = await closeStaleCalls({creatorSlackID})
    if (closedCalls.length > 0) {
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
      in_meeting: {
        breakout_room: true
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

  return {
    ...meeting,
    host: host,
    hostKey: hostKey
  }
}