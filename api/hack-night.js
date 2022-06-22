import fetch from "node-fetch";

export async function fetchParticipantNumber () {
  const response = await fetch('https://slack.com/api/bookmarks.list?channel_id=C0JDWKJVA', {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`
    }
  });
  const json = await response.json();
  // console.log(json);
  const { title } = json.bookmarks.filter(bookmark => bookmark.id === "Bk027L39LR9A")[0];
  const number = +(title.split('').filter(char => !isNaN(char)).join('') || '0');
  return number;
}

export async function setParticipantNumber (number) {
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
      link: 'https://hack.af/night',
      title: 'Join Hack Night! 👤 ' + number
    })
  });
  const json = await response.json();
  // console.log(json);
  return json;
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

export async function testJoin () {
  const participants = await fetchParticipantNumber();
  await setParticipantNumber(participants + 1);
}

export async function testLeave () {
  const participants = await fetchParticipantNumber();
  await setParticipantNumber(participants - 1 < 0 ? 0 : participants - 1);
}

export async function testEnd () {
  await setParticipantNumber(0);
}
