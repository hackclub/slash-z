I'm just going to start writing what comes to my mind & organize the notes later

- Type /z, server gets a request from slack, starts a zoom call, posts call to slack
- Every 30s, we check Zoom to see if a call is closable
  - Noone else is in the call & the call has been inactive for 30s or more
  - If so, close it
- Closing a call updates the Slack status

Why are we building it this way? Why not track state by logging webhook events like participant join/leave? Zoom's webhooks are notoriously buggy. The golang version of /z was built this way & ended up with a bunch of invalid states.

ex: https://devforum.zoom.us/t/did-not-received-participant-joined-event-sometimes-do-not-receive-participant-left-event/25697/23
(there are a bunch of threads like this^)

Do we still want webhooks coming in? Yes. That'll let us log the number of participants in a meeting etc. That said, webhooks are a nice to have. The system should work without them by default.

Scheduling, how do we do it?

- Go to hack.af/z
  - auth with slack
  - already authed with slack
- you'll get a link like hack.af/z#CuriousPanda

- UUUUUUUUUUUUGH https://developers.google.com/gsuite/add-ons/calendar/conferencing/build-conference-addons
- Clicking will generate a link for the call (hack.af/z#RichNoodles)
- When participants go to the link...
  - If the call doesn't exist, generate a zoom call & redirect to it
  - If the call does exist, and isn't open, generate a new zoom call & redirect to it
  - If the call does exist, and is open, redirect to it

What does this mean for records/models/db tables?

- Meetings
- Schedule Link
  - Has many meetings
- Participant events
  - Belong to meetings

Breakdown, or _the babysteps i will take to prevent me from fighting goliath_

First step is just regular old `/z`. The slack server should probably be rewritten. This time, I'll create an endpoint for generating zoom links that the slack app will call.

Once I have that working, I'll make scheduling link generation & call routing through scheduling links.

### 2020-02-15

Ok, making progress. I've got a /z command (actually /dev-msw-slash-z b/c i'm dumb) that will start a meeting & auto-end it when all participants leave.

Next step is to build a way to update the "0 people joined" message on slack & add/remove participants on slack. not sure how to do that b/c the zoom webhooks i'm getting just give me user email & zoom id

---

It's weird just how out of order the events from Zoom come in. I'm thinking about adding a couple checks to the zoom webhook handler to prevent the worst cases of delayed/duplicate events:
- event indempotency using the 'event_ts' zoom is giving us
  - doing this through airtable could suck (we'd have a bunch of airtable lookups on every zoom endpoint hit)
    - create webhook event on hit
    - lookup the meeting record
    - lookup existing webhook events w/ same timestamp
  - we could do this just through working memory on the server. I don't care too much about getting an event a day late, more like getting a burst of activity in 5 min after a call of 30 people ends (& I get a bunch of participant leave events out of order or duplicated)
- ignore webhook events to calls that have already closed
  - this ignores all the delayed participant activity after a call has ended

On top of that stuff, we could handle the airtable record limit (~50k) by removing all webhook events for meetings that have ended. this doesn't have to happen right after the call ends, but could be a nightly job, or something triggered manually if it's rare enough (idk how long it'll take to reach 50k)

---

Ok, call participant list is done & working. Would be nice to have it show slack profile info instead, but MVP!

I'm worried about how much we're going to hammer airtable but I'll add a queueing system later if it's needed. From the experience working on hackclub/orpheus, queueing will take longer then I think it will.

Next step is to add a scheduling link.

---

Just got a basic schedule link route setup, think a better use of my time right now is to make host transferrable & login to zoom with a personal account so I can dogfood for the rest of my meetings this week.

---

Admin joining is done through the 'start_url', which logs the user in as the host. It's super janky, but i'm happy with it as a way to get admin access for the time being. Will def need to improve the experience in the future.

I think this is the next step: https://developers.google.com/workspace/add-ons/calendar/conferencing/conferencing-sample#add-on-manifest