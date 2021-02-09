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
