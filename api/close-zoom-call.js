import ZoomClient from "./zoom-client.js";
import Prisma from "./prisma.js";
import fetch from "node-fetch";

export default async (zoomID, forceClose = false) => {
  const meeting = await Prisma.find("Meeting", {
    where: { zoomID },
    include: { host: true }
  })

  const zoom = new ZoomClient({
    zoomSecret: host.apiSecret,
    zoomKey: host.apiKey,
  });

  // check if zoom meeting still has participants...
  const metrics = await zoom.get({
    path: `metrics/meetings/${meeting.zoomId}/participants`,
  });

  if (!forceClose && metrics && metrics.total_records > 0) {
    console.log(
      `Meeting ${meeting.zoomId} has ${metrics.total_records} participant(s). Not closing meeting. Run with forceClose=true to force close the meeting even with participants.`
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
  await zoom.put({
    path: `meetings/${meeting.zoomId}/status`,
    body: { action: "end" },
  });
  await zoom.patch({
    path: `meetings/${meeting.zoomId}`,
    body: { settings: { join_before_host: false } },
  });

  // 3) end airtable call
  await Prisma.patch("Meeting", meeting.id, { endedAt: Date.now() })

  return meeting.id;
};
