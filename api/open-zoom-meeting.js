import ZoomClient from "./zoom-client.js";
import Prisma from "./prisma.js";
// import sendHostKey from "./send-host-key.js";
import closeStaleCalls from "./close-stale-calls.js";

const hackNightSettings = {
  who_can_share_screen_when_someone_is_sharing: 'all',
  participants_share_simultaneously: 'multiple'
}

/**
* Pick a random host not used in a call
* @function
* @returns {Promise<Object>}
*/
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

/**
* Opens a new zoom meeting 
* @function  
* @param {Object} prop 
* @param {string} prop.creatorSlackID - The ID of the slack creator
* @param {boolean} prop.isHackNight - Should the zoom meeting be a hack night
* @returns {Object}
*/
export default async ({ creatorSlackID, isHackNight } = {}) => {
  // find an open host w/ less then 2 open meetings. why 2? Zoom lets us host up to 2 concurrent meetings
  // https://support.zoom.us/hc/en-us/articles/206122046-Can-I-Host-Concurrent-Meetings-
  // ¯\_(ツ)_/¯
  let host = await availableHost();

  // no free hosts? let's try closing some stale zoom calls
  if (!host) {
    console.log("No free hosts! I'm going to try closing stale calls");
    const closedCalls = await closeStaleCalls({ creatorSlackID });
    await Prisma.create('customLogs', { text: `${closedCalls.length}_stale_calls_closed_due_to_no_free_hosts`, zoomCallId: closedCalls.toString() })
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
      zoomID: hostZoom.id
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
          closed_caption: true,
          ...(
            (() => (isHackNight ? hackNightSettings : {}))()
          )
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

  let hostKey = Math.random().toString().substr(2, 6).padEnd(6, 0);

  // sendHostKey({creatorSlackID, hostKey})

  // attempt to set the host key
  const keyResponse = await zoom.patch({
    path: `users/${host.zoomID}`,
    body: { host_key: hostKey },
  });

  // update the host record with the new key
  if (keyResponse.http_code !== 400) {
    await Prisma.patch("host", host.id, {
      hostKey: hostKey
    });
  } else {
    const hosts = await Prisma.get("host", {
      where: {
        email: host.email
      }
    });
    // we know there are just two hosts with the same email
    // so we grab what's left
    const otherHost = hosts.filter(h => h.id != host.id)[0];

    // re-assign the host key to the existing one
    hostKey = otherHost.hostKey;
  }

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
