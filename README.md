# `/z` - Create a pro Zoom meeting in seconds on the Hack Club Slack

Goals of project:

- Make it dead simple to create pro Zoom meetings on the Hack Club Slack. Slack as a tool.
- Act as example for future Slack projects in Hack Club
  - Easy to get instance up and running locally (<5m)

Scratching down some notes:

- DB. Schema:
  - Meetings
    - Started time
    - Unique ID
    - Participant Events
  - Participant Events
    - Meeting
    - Time
    - Type: joined / left
    - Participant
  - Participants
    - ID
    - Username
    - Logged into Zoom?
    - User ID # assigned to everyone - per-meeting unique
    - ID # assigned to logged in users - globally unique if set
  - Hosts
    - Email
    - API Key
    - API Secret

Flow:

- Launch: load state of Airtable into ZoomMachine (only currently active calls?)
- `/` creates new meeting in Zoom
  - "The host has another meeting in progress". Cycles between accounts if active meetings in progress.
- Meeting goes to ZoomMachine which regularly checks whether participants join. Only applies to currently active calls:
  - First participant to join becomes host
  - Updates Slack as participants join
  - After certain amount of inactivity, close the call

Next steps:

- First participant to join becomes host
- Load and dump data to Airtable (assumption is that only one instance of `slash-z` is running at a time, I think)

Before launch:

- Zoom call passwords

Current UX of call (mobile):

![](https://hack.af/cdn-40)

Design doc: [click here](https://hack.af/cdn-41)
