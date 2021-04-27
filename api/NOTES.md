This is a notes doc where I can work through the Cloud Recording feature.

I think I can get recordings once the meeting finishes. From there I can make a post in Slack(?).

Maybe I should list it in the app homepage?

First thing's first, let's make a list of all the meeting recordings in Airtable

---

Ok, just tested out the API, I've got new thoughts on this. First, what I found:

- Recording comes from Zoom Meeting ID
- Recording returns 'nonexistant' while transcoding, so I don't know if a recording was never made, was made & deleted, or was made but is still transcoding
- Most transcoding I tested took about 50-80% of the duration of the call (ie. hour long call took about 40 min to transcode)
- Transcoding takes a minute minimum (ie. 10 second zoom call takes a minute before recording shows up on API)

