import Prisma from "./prisma.js"
import isProd from "../isprod.js"

export default (err) => {
  const errorFields = {
    timestamp: new Date(Date.now()),
    text: `${err.name} ${err.message}`,
    stackTrace: err.stack,
    production: isProd 
  }
  if (err.zoomHostID) {
    errorFields.hostZoomID = err.zoomHostID
  }
  if (err.zoomMeetingID) {
    errorFields.meetingId = err.zoomMeetingID
  }

  Prisma.create('errorLog', errorFields)
}