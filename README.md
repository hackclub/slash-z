# (WIP) `/z` - Create a pro Zoom meeting in seconds on the Hack Club Slack

## Setup

Following environment variables must be set:

```
AIRTABLE_API_KEY
AIRTABLE_BASE

SLACK_BOT_USER_OAUTH_ACCESS_TOKEN
```

You can either set these in the environment or create a file called `.env` and set them, one per line with `=` separating the values. `slash-z` will automatically load the contents of `.env`.

### Airtable Setup

(these steps will only work for members of HQ right now, TODO - change this to something anyone can do)

Make a duplicate of https://airtable.com/tblvGSPOot8HJrYbf and name it `/z (slash-z) - [username] dev`. For me, I named it `/z (slash-z) - zrl dev`.

Set `AIRTABLE_API_KEY` and `AIRTABLE_BASE`.

## Slack Setup

Create a new Slack app called `/z - [username] dev`. In my case, I'm calling it `/z - zrl dev`.

In **OAuth & Permissions**, add the following scopes:

- `calls:read`
- `calls:write`
- `commands`
- `users:read`
- `users:read.email` - This is needed to set the person who runs `/z` as the host of the Zoom meeting

In **Slash Commands**, create a new command called `/dev-[username]-slash-z`. In my case, I'm calling it `/dev-zrl-slash-z`.

Follow the following format (note the path of **Request URL**):

![Creating a new slash command](https://hack.af/cdn-46)

Install the app into your Slack workspace by going to **Install App** > **Install App to Workspace**. Set `SLACK_BOT_USER_OAUTH_ACCESS_TOKEN` to the token Slack gives you.

Fill out **Display Information** under **Basic Information**. I'm using https://hack.af/cdn-51 as my app logo for my development environment.

## Zoom Setup

In the **Hosts** table in your duplicated Airtable, create an entry for your Zoom account. **Email**, **Named Displayed to Users**, **API Key**, and **API Secret**. Are all required. The rest will be set automatically.

You can get **API Key** and **API Secret** from **https://marketplace.zoom.us/develop/create** > **JWT (View here)**.

![Screenshot of a host added to Airtable](https://hack.af/cdn-47)

In **https://marketplace.zoom.us/develop/create**, create a new Webhook Only app called `/z - dev [username]`. Fill out all the fields on the 1st page with something similar to the following:

![Screenshot of filling out Information page when creating new Zoom Webhook app](https://hack.af/cdn-48).

Enable **Event Subscriptions** and set them up as follows:

![Screenshot of step 1 of enabling and configuring Event Subscriptions](https://hack.af/cdn-49)

![Screenshot of step 2 of enabling and configuring Event Subscriptions](https://hack.af/cdn-50)

## Body

built by @zrl

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
