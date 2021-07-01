const ZoomClient = require("../zoom-client");
const AirBridge = require("../airbridge");

module.exports = async (req, res) => {
  const meeting = await AirBridge.find("Meetings", {
    filterByFormula: `{Zoom ID}='${req.query.id}'`,
  });
  const host = await AirBridge.find("Hosts", {
    filterByFormula: `RECORD_ID()='${meeting.fields["Host"][0]}'`,
  });

  const zoom = new ZoomClient({
    zoomSecret: host.fields["API Secret"],
    zoomKey: host.fields["API Key"],
  });
  const liveStreaming = await zoom.patch({
    path: `meetings/${req.query.id}/livestream`,
    body: {
      stream_url: `rtmp://sin.contribute.live-video.net/app/${process.env.STREAM_KEY}`,
      stream_key: process.env.STREAM_KEY,
      page_url: "https://www.twitch.tv/sampoder",
    },
  });

  const liveStreamingStatus = await zoom.patch({
    path: `meetings/${req.query.id}/livestream/status`,
    body: {
      action: "start",
      settings: {
        active_speaker_name: true,
        display_name: "Hack Club Radio",
      },
    },
  });

  res.status(200).json({ liveStreaming, liveStreamingStatus });
};
