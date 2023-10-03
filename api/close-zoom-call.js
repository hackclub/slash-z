import ZoomClient from "./zoom-client.js";
import Prisma from "./prisma.js";
import metrics from "../metrics.js";
import fetch from "node-fetch";

/**
* Closes a zoom call
* @function
* @param {string} zoomID - The zoom call id
* @param {boolean} forceClose - force close the zoom call. Defaults to false
* @returns {Promise<Object>}
*/
export default async (zoomID, forceClose = false) => {

  const meeting = await Prisma.find("meeting", {
    where: { zoomID },
    include: { host: true }
  })
  const host = meeting.host

  const zoom = new ZoomClient({
    zoomSecret: host.apiSecret,
    zoomKey: host.apiKey, 
  });

  /**
  * Invalidates a zoom call id
  * @function
  */
  const deleteMeeting = async () => {
    const response = await zoom.delete({ path: `meetings/${meeting.zoomID}` });
    if (response.http_code == 400) {
      return metrics.increment("delete_meeting.warning", 1);
    } else if (response.http_code == 404) {
      // Report this also as a general error...
      metrics.increment("error.delete_meeting");

      return metrics.increment("delete_meeting.error", 1);
    }
    return metrics.increment("delete_meeting.success", 1);
  };

  // check if zoom meeting still has participants...
  const zoomMetrics = await zoom.get({
    path: `metrics/meetings/${meeting.zoomID}/participants`,
  });

  if(!zoomMetrics) {
    metrics.increment("error.metrics_not_defined", 1);
    await Prisma.create('customLogs', { text: `metrics_not_defined`, zoomCallId: meeting.zoomID })
    return null;
  }
  
  // 400/404's denote meetings that do not exist.  We need to clean them up on our side.
  // they also denote meetings where all participants have left
  if (!forceClose && (zoomMetrics.http_code == 400 || zoomMetrics.http_code == 404)) {
    
    await Prisma.create('customLogs', { text: `metrics_meeting_doesnt_exist`, zoomCallId: meeting.zoomID })
    await Prisma.patch("meeting", meeting.id, { endedAt: new Date(Date.now()) })

    // we need to delete the meeting if not already deleted
    await deleteMeeting();

    return null;    
  }
  
  if (!forceClose && zoomMetrics && zoomMetrics.total_records > 0) {
    console.log(
      `Meeting ${meeting.zoomID} has ${zoomMetrics?.total_records || "unknown"} participant(s). Not closing meeting. Run with forceClose=true to force close the meeting even with participants.`
    );
    return null;
  }

  if (zoomMetrics.http_code == 200 || forceClose) {

  // 1) if was posted in slack, end slack call
  if (meeting.slackCallID) {
    const startTime = Date.parse(meeting.startedAt);
    const durationMs = Date.now() - startTime;
    const duration = Math.floor(durationMs / 1000);

    console.log(`updating call ${meeting.zoomID} which had code ${zoomMetrics.http_code} and slack call ID ${meeting.slackCallID}`);
    const _slackPost = await fetch("https://slack.com/api/calls.end", {
      method: "post",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: meeting.slackCallID, duration }), // hard coding duration while debugging
      }).then((r) => r.json())
        .catch(err => {
          console.log("Failed to updated slack call ID with reason", err);
        });
    }

    // 2) set the meeting end time 
    await Prisma.patch("meeting", meeting.id, { endedAt: new Date(Date.now()) })

    // delete the meeting from zoom to invalidate the url 
    // this will happen iff there are no participants left in a call
    await deleteMeeting();

    return meeting.id;
  }
  console.log("Not sure about the state of zoom call metrics, not closing the call");
};
