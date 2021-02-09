const { default: fetch } = require("node-fetch")

module.exports = class ZoomMeeting {
  constructor() {
  }

  async start () {
    const options = {
      maxRecords: 1,
      // eventually have a filter-by-formula for accounts that don't already have a hosted meeting
    }
    const airRequest = await fetch(`https://api2.hackclub.com/v0.2/Slash-z-msw-dev/Hosts?authKey=${process.env.AIRBRIDGE_API_KEY}&select=${JSON.stringify(options)}`)
    const result = await airRequest.json()
    // TODO: actually create a meeting
    this.zoomID = '6607256097' ,
    this.joinURL = 'https://zoom.us/j/6607256097'
  }
}