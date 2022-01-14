import ZoomClient from "./zoom-client.js"
import Prisma from './prisma.js'

export default async (zoomCallID) => {
  const meeting = await Prisma.find('meetings', { where: {zoomID: zoomCallID }})
  const host = await Prisma.find('hosts', meeting.hostZoomID )

  const zoom = new ZoomClient({zoomSecret: host.apiSecret, zoomKey: host.apiKey})

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