import ZoomClient from "./zoom-client.js";
import Prisma from "./prisma.js";
import fetch from "node-fetch";

export default async (zoomID, forceClose = false, fromWebhook = false) => {
  const meeting = await Prisma.find("meeting", {
    where: { zoomID },
    include: { host: true }
  })
  const host = meeting.host

  const zoom = new ZoomClient({
    zoomSecret: host.apiSecret,
    zoomKey: host.apiKey, 
  });

  // check if zoom meeting still has participants...
  const metrics = await zoom.get({
    path: `metrics/meetings/${meeting.zoomID}/participants`,
  });
  
  if(!metrics || !Object.keys(metrics).includes("total_records")){
    await Prisma.create('customLogs', { text: `metrics_not_definded`, zoomCallId: meeting.zoomID })
    return null;
  }

  if (!forceClose && metrics && metrics.total_records > 0) {
    console.log(
      `Meeting ${meeting.zoomID} has ${metrics?.total_records || "unknown"} participant(s). Not closing meeting. Run with forceClose=true to force close the meeting even with participants.`
    );
    return null;
  }

  // ending the meeting happens in X steps...

  // 1) if was posted in slack, end slack call
  if (meeting.slackCallID) {
    const startTime = Date.parse(meeting.startedAt);
    const durationMs = Date.now() - startTime;
    const duration = Math.floor(durationMs / 1000);
    const _slackPost = await fetch("https://slack.com/api/calls.end", {
      method: "post",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: meeting.slackCallID, duration }), // hard coding duration while debugging
    }).then((r) => r.json());
  }

  // 2) set meeting status in zoom to 'end'
  if(!fromWebhook){
    await zoom.put({
      path: `meetings/${meeting.zoomID}/status`,
      body: { action: "end" },
    });
    await Prisma.create('customLogs', { text: `slash_z_ended_call_${metrics?.total_records || "unknown"
  }_participants`, zoomCallId: meeting.zoomID })
  }
  await zoom.patch({
    path: `meetings/${meeting.zoomID}`,
    body: { settings: { join_before_host: false } },
  });

  // 3) end airtable call
  await Prisma.patch("meeting", meeting.id, { endedAt: new Date(Date.now()) })

  return meeting.id;
};
