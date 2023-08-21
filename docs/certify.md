## How to test if slash-z runs properly

## Testing slack calls 

1. Run `/z` command in your DM
2. A new call should be created and will look like this 
![slack-call](img/slack-call.png)
3. Join the call by clicking the **Join** button
4. After joining the call, the call card should updated with your gravatar ![slack-call-update](img/slack-call-update.png)
5. Next, leave the call and your gravatar should disappear from the call card

## Testing scheduled calls

1. Start a new call by sending a GET request to [https://js-slash-z.herokuapp.com/api/endpoints/new-schedule-link](https://js-slash-z.herokuapp.com/api/endpoints/new-schedule-link)
2. Get and copy the property value of `videoUri`
3. paste the link in a new tag and take note of the zoom call id
> given a call such as **https://hackclub.zoom.us/j/81651504037?pwd=YlE1ekFHckNhSm9GZDJtd2NZNnozQT09#success**, the zoom id is right after the /j path -- in this case **81651504037**
4. join the call 
5. you may allow an additional person to join your same call to prove that the call link works properly
6. wait for two minutes while in the call
7. leave the call with your testing partner if any
8. If anything wrong happens, refer to [runbook] to investigate what went wrong

## Testing the garbage collector 

1. First take a look at the Grafana dashboard and take note of the zoom license utilization
2. Create a new call via Slack by running /z
3. Checkout the Grafana dashboard again and the zoom license utilization should have risen.
4. After two minutes, the zoom license utilization should drop; meaning the call was garbage collected since it's stale.

