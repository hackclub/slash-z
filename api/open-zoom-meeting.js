import ZoomClient from "./zoom-client.js";
import Prisma from "./prisma.js";
// import sendHostKey from "./send-host-key.js";
import closeStaleCalls from "./close-stale-calls.js";

async function availableHost() {
  const hosts = await Prisma.get("host", {
    where: {
      enabled: true,
      meetings: {
        every: {
          NOT: {
            endedAt: {
              equals: null,
            },
          },
        },
      },
    },
  });
  return hosts[Math.floor(Math.random() * hosts.length)];
}

export default async ({ creatorSlackID } = {}) => {
  // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
  // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
  // ¯\_(ツ)_/¯
  let host = await availableHost();

  // no free hosts? let's try closing some stale zoom calls
  if (!host) {
    console.log("No free hosts! I'm going to try closing stale calls");
    const closedCalls = await closeStaleCalls({ creatorSlackID });
    if (closedCalls.length > 0) {
      host = await availableHost();
    }
  }

  // still no free host? uh oh! let's reply back with an error
  if (!host) {
    throw new Error("out of open hosts!");
  }

  // make a zoom client for the open host
  const zoom = new ZoomClient({
    zoomSecret: host.apiSecret,
    zoomKey: host.apiKey,
  });

  // no zoom id? no problem! let's figure it out and cache it for next time
  if (!host.zoomID || host.zoomID == "") {
    // get the user's zoom id
    const hostZoom = await zoom.get({ path: `users/${host.email}` });
    host = await Prisma.patch("host", host.id, {
      where: { zoomID: hostZoom.id },
    });

    // (max@maxwofford.com) This looks super redundant. Why are we also setting
    // these fields on meeting creation? Zoom's docs don't say it (at time of
    // writing), but zoom requires both the user's setting "host_video=true" for
    // the meeting "host_video=true" to work. ¯\_(ツ)_/¯
    zoomUser = await zoom.patch({
      path: `users/${host.zoomID}/settings`,
      body: {
        schedule_meeting: {
          host_video: true,
          participants_video: true,
          join_before_host: true,
          embeded_password_in_join_link: true,
        },
        in_meeting: {
          breakout_room: true,
          file_transfer: true,
          co_host: true,
          polling: true,
          closed_caption: true
        },
        recording: {
          local_recording: true,
          cloud_recording: true,
          record_gallery_view: true,
          record_speaker_view: true,
          save_chat_text: true,
          // auto-delete cloud recordings after 60 days (maximum value for this setting)
          auto_delete_cmr: true,
          auto_delete_cmr_days: 60, // in days
        },
        meeting_security: {
          embed_password_in_join_link: true,
          waiting_room: false,
        }
      },
    });
  }

  const hostKey = Math.random().toString().substr(2, 6).padEnd(6, 0);

  // sendHostKey({creatorSlackID, hostKey})

  await zoom.patch({
    path: `users/${host.zoomID}`,
    body: { host_key: hostKey },
  });

  // start a meeting with the zoom client
  const meeting = await zoom.post({
    path: `users/${host.zoomID}/meetings`,
    body: {
      type: 2, // type 2 == scheduled meeting
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        waiting_room: false,
      },
    },
  });

  return {
    ...meeting,
    displayName: host.displayName,
    host: host,
    hostKey: hostKey,
  };
};
