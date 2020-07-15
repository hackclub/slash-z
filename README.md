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

- `/` creates new meeting in Zoom
- Meeting goes to ZoomMachine which regularly checks whether participants join. Updates Slack as participants join. After certain amount of inactivity, close the call.
