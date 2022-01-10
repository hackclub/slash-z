import ZoomClient from "./zoom-client.js"
import AirBridge from './airbridge.js'

export default async (zoomCallID) => {
  const meeting = await AirBridge.find('Meetings', { filterByFormula: `{Zoom ID}='${zoomCallID}'`})
  const host = await AirBridge.find('Hosts', { filterByFormula: `RECORD_ID()='${meeting.fields['Host'][0]}'` })

  const zoom = new ZoomClient({zoomSecret: host.fields['API Secret'], zoomKey: host.fields['API Key']})

  const password = zoomCallID.toString().substring(0, 8)
  const results = {}
  await Promise.all([
    zoom.get({path: `/meetings/${zoomCallID}/recordings`}).then(r => results.recording = r),
    zoom.patch({path: `/meetings/${zoomCallID}/recordings/settings`, body: {
      password
    }})
  ])
  // const recording = await zoom.get({ path: `/meetings/${zoomCallID}/recordings`})
  // const settings = await zoom.get({ path: `/meetings/${zoomCallID}/recordings/settings`})
  // console.log({settings})
  // if ()
  if (!results.recording) {
    throw new Error('Recording not found!')
  }
  return { ...results.recording, settings: { password } }
}