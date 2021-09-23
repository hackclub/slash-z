const ZoomClient = require('../zoom-client')
const AirBridge = require('../airbridge')

module.exports = async (req, res) => {
  const meeting = await AirBridge.find('Meetings', {
    filterByFormula: `{Zoom ID}='${req.query.id}'`
  })
  const host = await AirBridge.find('Hosts', {
    filterByFormula: `RECORD_ID()='${meeting.fields['Host'][0]}'`
  })
  const theUser = await AirBridge.find('Live Streams', {
    filterByFormula: `{Slack ID}='${req.query.user_id}'`
  })
  if (theUser) {
    const zoom = new ZoomClient({
      zoomSecret: host.fields['API Secret'],
      zoomKey: host.fields['API Key']
    })
    const liveStreaming = await zoom.patch({
      path: `meetings/${req.query.id}/livestream`,
      body: {
        stream_url: theUser.fields['Stream URL'],
        stream_key: theUser.fields['Stream Key'],
        page_url: theUser.fields['Page URL']
      }
    })

    const liveStreamingStatus = await zoom.patch({
      path: `meetings/${req.query.id}/livestream/status`,
      body: {
        action: 'start',
        settings: {
          active_speaker_name: true,
          display_name: 'Streaming to the Interwebs'
        }
      }
    })

    res.status(200).json({ liveStreaming, liveStreamingStatus })
  } else {
    res.redirect('https://airtable.com/shrtV1uxDvPh48n7e')
  }
}
