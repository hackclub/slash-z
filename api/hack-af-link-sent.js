import fetch from 'node-fetch'
import Prisma from './prisma.js'

export default async function hackAfLinkSent(event) {
    if (!event.links[0].url.includes('z-join?id=')) return;

    const where = {
        name: {
            equals: new URL(event.links[0].url).searchParams.get('id')
        }
    }

    const links = await Prisma.get('schedulingLink', {
        where,
        include: {
            meetings: true
        }
    })
    const meeting = links?.[0]?.meetings?.[links?.[0]?.meetings?.length - 1]

    if (!links.length) return;
    console.log(meeting);

    if (!meeting || !meeting.startedAt || meeting.endedAt) return await fetch('https://slack.com/api/chat.unfurl', {
        headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        method: 'post',
        body: JSON.stringify({
            channel: event.channel,
            ts: event.message_ts,
            unfurls: {
                [event.links[0].url]: {
                    "text": "This meeting was scheduled using /z for Google Calendar."
                }
            }
        })

    });

    if (!meeting.slackCallID) {
        const slackCallResult = await fetch('https://slack.com/api/calls.add', {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: 'post',
            body: JSON.stringify({
                external_unique_id: meeting.id,
                join_url: event.links[0].url,
                created_by: meeting.creatorSlackID,
                date_start: meeting.startedAt ? Math.floor(Number(new Date(meeting.startedAt)) / 1000) : Math.floor(Date.now() / 1000), // Slack works in seconds, Date.now gives ms
                desktop_app_join_url: event.links[0].url,
                external_display_id: meeting.zoomID,
                title: links[0].name == '1vu13b' ? 'Hack Night' : 'A meeting was scheduled using /z'

            })
        }).then(r => r.json());
        console.log(slackCallResult)
        meeting.slackCallID = slackCallResult.call.id;
        console.log(meeting.slackCallID)
        await Prisma.patch('meeting', meeting.id, { slackCallID: meeting.slackCallID })
    }

    console.log(await fetch('https://slack.com/api/chat.unfurl', {
        method: 'post',
        headers: {
            authorization: `Bearer ${process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            channel: event.channel,
            ts: event.message_ts,
            unfurls: {
                [event.links[0].url]: {
                    blocks: [
                        {
                            type: 'call',
                            call_id: meeting.slackCallID
                        }
                    ]
                }
            }

        })
    }).then(a => a.json()));
}