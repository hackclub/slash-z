const { default: fetch } = require("node-fetch")

module.exports = class SlackCall {
  constructor(props) {
    Object.keys(props).forEach(k => {
      this[k] = props[k]
    })
  }

  async register() {
    const fields = {
      external_unique_id: this.meeting.zoomID,
      join_url: this.meeting.joinURL,
      created_by: this.user.slackID,
      date_start: Date.now(),
      desktop_app_join_url: `zoommtg://zoom.us/join?confno=${this.meeting.zoomID}&zc=0`,
      external_display_id: this.meeting.zoomID,
      title: `Zoom Pro meeting started by ${this.user.username}`
    }

    const result = await fetch('https://slack.com/api/calls.add', {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify(fields)
    }).then(r => r.json())

    this.callID = result.call.id
  }

  async post(callbackUrl) {
    const fields = {
      response_type: 'in_channel',
      text: 'A new Zoom Pro call was started using /Z',
      blocks: [{
        type: 'call',
        call_id: this.callID
      }]
    }
    const result = await fetch(callbackUrl, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fields)
    })
    console.log(result)
  }
}