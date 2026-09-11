import Prisma from "../../prisma.js";
import userIsRestricted from "../../user-is-restricted.js";
import channelIsForbidden from "../../channel-is-forbidden.js";
import transcript from '../../transcript.js';
import fetch from 'node-fetch';
import ensureSlackAuthenticated from '../../ensure-slack-authenticated.js';

const sendEphemeralMessage = (url, text) => {
  return fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: text
    })
  });
};

// exported for the /api/endpoints/slack dispatcher, which verifies the
// request signature before dispatching here
export const hostCode = async (req, res) => {
  const { user_id, response_url, channel_id, text } = req.body;

  if (await userIsRestricted(user_id)) {
    return sendEphemeralMessage(response_url, transcript('errors.userIsRestricted'));
  }

  if (channelIsForbidden(channel_id)) {
    return sendEphemeralMessage(response_url, transcript('errors.channelIsForbidden'));
  }

  if (!text) {
    return sendEphemeralMessage(response_url, transcript('errors.emptyHostCode'));
  }

  const meeting = await Prisma.find('meeting', { where: { zoomID: text } });

  if (!meeting) {
    return sendEphemeralMessage(response_url, 'Unable to retrieve the host code. Please check the code and remove any Markdown formatting.');
  }

  if (meeting.endedAt) {
    return sendEphemeralMessage(response_url, 'Cannot retrieve the host code for a concluded meeting.');
  }

  if (meeting.creatorSlackID !== user_id) {
    return sendEphemeralMessage(response_url, '_You can only retrieve the host code for meetings you created._');
  }
  
  return sendEphemeralMessage(response_url, `_Your meeting code is: *${meeting.hostKey}*_`);

};

// this file is also mounted directly at /api/endpoints/slack/host-code by
// routes.js, so it must verify the Slack request signature itself
export default (req, res) => ensureSlackAuthenticated(req, res, () => hostCode(req, res));
