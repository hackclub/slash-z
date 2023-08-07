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

  const deleteMeeting = async () => {
    const response = await zoom.delete({ path: `meetings/${meeting.zoomID}` });
    if (response.http_code == 400) {
      return metrics.increment("delete_meeting.warning");
    } else if (response.http_code == 404) {
      return metrics.increment("delete_meeting.error");
    }
    return metrics.increment("delete_meeting.success");
  };

  // check if zoom meeting still has participants...
  const metrics = await zoom.get({
    path: `metrics/meetings/${meeting.zoomID}/participants`,
  });

  if(!metrics){
    await Prisma.create('customLogs', { text: `metrics_not_defined`, zoomCallId: meeting.zoomID })
    return null;
  }
  
  // 400/404's denote meetings that do not exist.  We need to clean them up on our side.
  // they also denote meetings where all participants have left
  if (metrics.http_code == 400 || metrics.http_code == 404) {
    
    await Prisma.create('customLogs', { text: `metrics_meeting_doesnt_exist`, zoomCallId: meeting.zoomID })
    await Prisma.patch("meeting", meeting.id, { endedAt: new Date(Date.now()) })

    // we need to delete the meeting if not already deleted
    deleteMeeting();

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

  // delete the meeting from zoom to invalidate the url
  deleteMeeting();

  return meeting.id;
};
