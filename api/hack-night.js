import fetch from "node-fetch";
import { currentTimeHash } from "./time-hash.js";

export async function fetchBookmarkTitle () {
  const response = await fetch('https://slack.com/api/bookmarks.list?channel_id=C0JDWKJVA', {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`
    }
  });
  const json = await response.json();
  const { title } = json.bookmarks.filter(bookmark => bookmark.id === "Bk027L39LR9A")[0];
  return title;
}

export async function setBookmarkTitle (title) {
  const response = await fetch('https://slack.com/api/bookmarks.edit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      bookmark_id: 'Bk027L39LR9A',
      channel_id: 'C0JDWKJVA',
      emoji: ':zoom:',
      link: 'https://hack.af/night?key=' + currentTimeHash(),
      title
    })
  });
  const json = await response.json();
  return json;
}

export async function fetchParticipantNumber () {
  const title = await fetchBookmarkTitle();
  const number = +(title.split('').filter(char => !isNaN(char)).join('') || '0');
  return number;
}

export async function setParticipantNumber (number) {
  return await setBookmarkTitle('Join Hack Night! 👤 ' + number);
}

export default async function hackNightStats (event, meeting, payload) {
  switch (event) {
    case 'meeting.ended':
      await setParticipantNumber(0);
      break
    case 'meeting.participant_joined': {
      const participants = await fetchParticipantNumber();
      await setParticipantNumber(participants + 1);
      break
    }
    case 'meeting.participant_left': {
      const participants = await fetchParticipantNumber();
      await setParticipantNumber(participants - 1 < 0 ? 0 : participants - 1);
      break
    }
    default: {}
  }
}