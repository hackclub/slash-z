# Slash-Z Runbook

Generally, if you encounter an issue with slash-z — a malfunctioning or you find it misbehaving — create a related issue outlining the problem.

## References
- Grafana Dashboard: http://telemetry.hackclub.com/
- Stale call: A Slack call with created two minutes ago relative to now with no participants in.

## Potential issue we can encounter in slash-z

- Slash-z stops reporting to grafana
- Slash-z does not update the participants on the slack call card
- Grafana dashboard reports high zoom license utilization
- slash-z call links don't resolve
- slash-z calls are not garbage collected

## Slash-Z stops reporting to grafana

1. Run `ssh root@telemetry.hackclub.com`
2. Run `htop` and look if grafana, graphite, statsd and the docker container is running
3. If not, restart the service with <insert-command-to-start-docker-container>

## Slash-Z does not update the participants on the Slack call card

1. Confirm whether slash-z actually receives webhook events from zoom by running.
  - `python3 scripts/zstory.py dissect <meeting_id> -z` in your terminal
2. If zstory.py confirms events received, check the slack app dashboard to make sure slash-z is properly configured
  - [TODO] instructions
3. Otherwise, check the zoom dashboard and make sure the app is validated by zoom to receive webhook events

## Grafana dashboard reports high zoom utilization

1. If the Grafana dashboard reports high zoom utilization
  - [Confirm the garbage collector works properly](#slash-z-calls-are-not-garbage-collected)
2. If the garbage collector does not work properly
  - Run /z many times in Slack till you get an "out of open hosts!" error
  - Run /z one more time to force slash-z to garbage collect stale calls
3. If this doesn't work, create and aad new zoom licenses

## Slash-Z scheduled call links don't resolve

This is most likely not a slash issue but rather an issue related to [hack.af](https://github.com/hackclub/hack.af). In case this is related to slash-z, it's best to check the slash-z logs to understand what actually happened.

## Slash-z calls are not garbage collected

1. Confirm the garbage collector service is enabled [here](https://github.com/hackclub/slash-z/blob/ebf4b49d3043c9b418d998fc2786a1cf7ab88238/jobs/index.js#L12C1-L24C2)
2. If its not, re-enable it and refer to [certify.md] to test if it works properly