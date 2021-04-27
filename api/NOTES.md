This is a notes doc where I can work through the Cloud Recording feature.

I think I can get recordings once the meeting finishes. From there I can make a post in Slack(?).

Maybe I should list it in the app homepage?

First thing's first, let's make a list of all the meeting recordings in Airtable

---

Ok, just tested out the API, I've got new thoughts on this. First, what I found:

- Recording comes from Zoom Meeting ID
- Recording returns 'nonexistant' while transcoding, so I don't know if a recording was never made, was made & deleted, or was made but is still transcoding
- Most transcoding I tested took about 50-80% of the duration of the call (ie. hour long call took about 40 min to transcode)
- Transcoding takes a minute minimum (ie. 10 second zoom call takes a minute before recording shows up on API)

---

Before I start playing with extra DB tables & columns etc. I'm going to just link files from the app home screen. I'll check how the performance is & build out actual db changes when rate-limits/lag is becoming a problem.

---

![AYYYYYYY](https://cloud-olc8bplu4-hack-club-bot.vercel.app/0screen_shot_2021-04-27_at_16.20.22.png)

https://marketplace.zoom.us/docs/api-reference/webhook-reference/recording-events/recording-started

---

Looks like there are recording events for webhooks. This will be _soooo_ much easier.

I'll add recording.started & recording.completed for now-- then I can have call states ('no recording', 'recording pending call end', 'recording pending transcoding', 'recording completed')
