# `/z` - Create a Zoom Pro meeting in seconds on the Hack Club Slack

built by @msw (initial version by @zrl)

[![dinosaur hanging out with friends on zoom call](https://cloud-mii3ocl31-hack-club-bot.vercel.app/3untitled_artwork.jpg)](https://cloud-mii3ocl31-hack-club-bot.vercel.app/1untitled_artwork.mp4)

## Usage

It's free to use for any Hack Club community members, even without a Zoom Pro account. All you have to do is run "/z" in a Slack message.

![type '/z' into slack for a call!](https://cloud-grl3n7i0e-hack-club-bot.vercel.app/0z-demo.gif)

## How it works

Zoom has some really cool built-in features for taking over host status of a
scheduled call. We have a list of paid Zoom Pro accounts that will host a new
meeting when called upon. The join link is given to the meeting participant,
as well as a host key that lets the user become host of the call.

## Local development / setup

Following environment variables must be set:

```
AIRBRIDGE_API_KEY

SLACK_BOT_USER_OAUTH_ACCESS_TOKEN
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET

ZOOM_VERIFICATION_TOKEN
```

You can either set these in the environment or create a file called `.env` and set them, one per line with `=` separating the values. `slash-z` will automatically load the contents of `.env`.