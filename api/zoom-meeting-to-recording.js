const ZoomClient = require("./zoom-client")
const AirBridge = require('./airbridge')

module.exports = async (zoomCallID) => {
  const meeting = await AirBridge.find('Meetings', { filterByFormula: `{Zoom ID}='${zoomCallID}'`})
  const host = await AirBridge.find('Hosts', { filterByFormula: `RECORD_ID()='${meeting.fields['Host'][0]}'` })

  const zoom = new ZoomClient({zoomSecret: host.fields['API Secret'], zoomKey: host.fields['API Key']})

  const recording = await zoom.get({ path: `/meetings/${zoomCallID}/recordings`})
  return recording
}