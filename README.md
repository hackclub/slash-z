# `/z` (Slash Z)

[<img src="https://cloud-mii3ocl31-hack-club-bot.vercel.app/3untitled_artwork.jpg" width="400" align="right" alt="dinosaur chilling on a Zoom call with friends">](https://cloud-av0cos2o5-hack-club-bot.vercel.app/1untitled_artwork_2.mp4)


_maintained by [@grahamdarcey](https://github.com/grymmy), built by [@maxwofford](https://github.com/maxwofford) (initial version by [@zachlatta](https://github.com/zachlatta))_

#### Features

- Zoom Pro meeting access
- Scheduled meetings
- Use anywhere in Slack
- Free (for Hack Clubbers)
- Fast

#### Limitations

- This is only intended for [Hack Clubbers](https://hack.af) in [the slack](https://hackclub.com/slack)

### Usage

Go to any channel (or DM) in the Hack Club Slack & run `/z`.

<img src="https://cloud-grl3n7i0e-hack-club-bot.vercel.app/0z-demo.gif" alt="type '/z' into slack for a call!" max-width="400px">

## FAQ

#### Can I schedule meetings?

Yep! Scheduled meetings are done through the [Google Calendar
addon](https://hack.af/z-addon). Install it for your account, then create a
meeting by choosing the `/z` conference option on an event's settings page.

#### Will my meeting have a 45 minute limit?

No, Zoom meetings created on the Zoom Pro license stay as Pro accounts even
if host is transferred to a Zoom Basic account. This also means you can
transfer host to another participant who joins (like a co-leader) and the
call will retain it's Zoom Pro status.

#### How many people can join my call?

Zoom Pro calls have a limit of 300 participants. Unfortunately this is a
limit on Zoom's side, so we don't have much we can do to control it.

#### How do I become the host of my meeting?

If you create a meeting in Slack with `/z`, a public join link will be posted
in the channel that anyone can click. Just underneath there will be a hidden
message only shown to you with the *host key*, a 6 digit code you can use to
promote yourself to host.

If you create a meeting in Google Calendar, you'll find your *host key* on
the app homepage of the @slash-z Slack bot. Your host key will only show up
while a participant is in the meeting, so make sure to join it before looking
for your host key.

_Related: [Zoom's help page on using host keys](https://support.zoom.us/hc/en-us/articles/115001315866-Host-Key-Control-For-Zoom-Rooms)_
#### Can I give host access to my co-leads?

Yes, once you are host of a meeting you can promote another participant to
host by opening the "Participants" tab and clicking "Make host" next to
their name.

Additionally we've enabled Zoom's _co-hosting_ feature, that enables you to
give host permissions to multiple participants in your call. To promote a
participant to co-host, open the "Participants" tab and click "Make co-host"
next to their name.

_Related: [Zoom's help page on promoting a co-host](https://support.zoom.us/hc/en-us/articles/206330935-Enabling-and-adding-a-co-host#h_9c3ee7f2-b70c-4061-8dcf-00dd836b2075)_

#### Do I need a Hack Club Zoom account?

No, you can start calls as well as claim host in calls from any Zoom account.
You can even do it without signing into a Zoom account.
#### Do I need to use a Hack Club email address?

No, `/z` as well as the [Google Calendar addon](https://hack.af) work with
any Gmail account that has permission to install addons.

#### Can I use this on my personal Gmail account?

That's fine to do! Please don't go crazy with multiple accounts, but the
Google Calendar addon was built for people to install to their personal &
work/school accounts.

#### Does this work with a school Zoom account?

It should, but every school puts different restrictions on their student accounts.

If you run into issues creating or joining meetings while signed into a Zoom
account provided by your school try signing out of Zoom and create/join your
meetings from a logged out Zoom client.

#### Does this work with a school Gmail account?

It depends on the settings your school put on your Gmail account.

Some schools will put restrictions on their student accounts to prevent
installing new addons. You'll need to install our [addon for creating
scheduled meetings](https://hack.af/z-addon).

Your school-issued Gmail account shouldn't interfere with any meetings created in Slack with `/z`.

#### Do you have a Gource?

[Yes](https://www.youtube.com/watch?v=mJb_DeK6g1M)

## How it works

Zoom has some really cool built-in features for taking over host status of a
scheduled call. We have a list of paid Zoom Pro accounts that will host a new
meeting when called upon. The join link is given to the meeting participant,
as well as a host key that lets the user become host of the call.

## Local development / setup

Following environment variables must be set:

```
DATABASE_URL

SLACK_BOT_USER_OAUTH_ACCESS_TOKEN
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET

ZOOM_VERIFICATION_TOKEN
```

You can either set these in the environment or create a file called `.env` and set them, one per line with `=` separating the values. `slash-z` will automatically load the contents of `.env`.
