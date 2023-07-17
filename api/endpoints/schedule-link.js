import findOrCreateMeeting from "../find-or-create-meeting.js"
import { currentTimeHash } from "../time-hash.js"

export default async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!req.query || !req.query.id) {
    res.redirect('new-schedule-link')
    return
  }

  try {

    if (query.id === "rx0fbo") {
      return res.redirect(`https://hackclub.zoom.us/j/84489216040?pwd=UXNNNTJxQjV5dEdqTVNzbkE0RlpTZz09`)
    }
    
    if (query.id === "1vu13b" && query.key !== currentTimeHash()) { // Special case for Hack Night
      const state = { meetingID: query.id }
      const stateString = encodeURIComponent(Buffer.from(JSON.stringify(state), "utf8").toString("base64"))
      
      const redirectUrl = process.env.NODE_ENV === "production" ? 'https://hack.af/z/slack-auth' : "https://slash-z-staging-1ae8b1c9e24a.herokuapp.com/api/endpoints/slack-auth"
      // Redirect to Slack Auth specifying that it's /z
      return res.redirect(`https://slack.com/oauth/v2/authorize?response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&user_scope=identify&client_id=${process.env.SLACK_CLIENT_ID}&state=${stateString}`)
      // Return to prevent creating a meeting if it's not necessary
    }
    
    if (query.id === "5s7xrr") { 
      // Special case for George Hotz AMA, redirect to another Zoom link
      return res.redirect('https://hack.af/geohot-zoom')
    }
    
    const airtableMeeting = await findOrCreateMeeting(query.id)
    if (query.phone) {
      res.redirect('/phone.html?meetingID='+airtableMeeting.zoomID)
    } else {
      res.redirect(airtableMeeting.joinURL)
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err.message)
  }
}
