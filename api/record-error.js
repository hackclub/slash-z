import AirBridge from "./airbridge.js"

export default (err) => {
  const errorFields = {
    'Time': Date.now(),
    'Text': `${err.name} ${err.message}`,
    'Stack Trace': err.stack,
    'Production?': process.env.NODE_ENV === 'production'
  }
  if (err.zoomHostID) {
    errorFields['Host'] = [err.zoomHostID]
  }
  if (err.zoomMeetingID) {
    errorFields['Meeting'] = [err.zoomMeetingID]
  }

  AirBridge.create('Errors', errorFields)
}