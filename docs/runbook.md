# Slash-Z Runbook

Generally, if you encounter an issue with slash-z — a malfunctioning or you find it misbehaving — create a related issue outlining the problem.

## References
- Grafana Dashboard: http://telemetry.hackclub.com/
- Stale call: A Slack call with created two minutes ago relative to now with no participants in.

## Users end up in separate calls when using the same scheduled call link
1. Make sure the garbage collected is working properly by checking certify.md
2. If not, you will have to re-enable this.

## Slash-Z stops reporting to grafana

1. Check the logs of the slash-z Heroku dyno
2. If the app crashed, restart it
3. If the app occurs again, read the surrounding logs for relevant reasons for the crash .

## Slash-Z does not update the participants on the Slack call card

1. Confirm whether slash-z actually receives webhook events from zoom by running.
  - `python3 scripts/zstory.py dissect <meeting_id> -z` in your terminal
2. If zstory.py shows webhook events for that meeting, check the slack app dashboard to make sure slash-z is properly configured
  - Confirm the App manifest in the slack dashboard matches [this](https://github.com/hackclub/slash-z/blob/master/manifest.yml)
3. Otherwise, check the zoom dashboard and make sure the app is validated by zoom to receive webhook events

## Grafana dashboard reports high zoom utilization

1. If the Grafana dashboard reports high zoom utilization
  - [Confirm the garbage collector works properly](#slash-z-calls-are-not-garbage-collected)
2. If the garbage collector is not enabled
  - Run /z many times in Slack till you get an "out of open hosts!" error
  - Run /z one more time to force slash-z to garbage collect stale calls
3. If this doesn't work, create and add new zoom licenses

## Slash-z calls are not garbage collected

1. Confirm the garbage collector service is enabled [here](https://github.com/hackclub/slash-z/blob/ebf4b49d3043c9b418d998fc2786a1cf7ab88238/jobs/index.js#L12C1-L24C2)
2. If its not, re-enable it and refer to [certify.md](./certify.md) to test if it works properly

## Slash-Z scheduled call links don't resolve

This is most likely not a slash issue but rather an issue related to [hack.af](https://github.com/hackclub/hack.af). In case this is related to slash-z, it's best to check the slash-z logs to understand what actually happened.

