import Prisma from "../../prisma.js";
import userIsRestricted from "../../user-is-restricted.js";
import channelIsForbidden from "../../channel-is-forbidden.js";
import transcript from '../../transcript.js';
import fetch from 'node-fetch';

const sendEphemeralMessage = (url, text) => {
  return fetch(url, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response_type: 'ephemeral',
      text: text
    })
  });
};

export default async (req, res) => {
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
