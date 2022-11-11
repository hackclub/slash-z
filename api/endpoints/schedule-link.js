import findOrCreateMeeting from "../find-or-create-meeting.js"

export default async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!req.query || !req.query.id) {
    res.redirect('new-schedule-link')
    return
  }

  try {
    
    if (query.id === "1vu13b") { // Special case for Hack Night
      const state = { meetingID: query.id }
      const stateString = encodeURIComponent(Buffer.from(JSON.stringify(state), "utf8").toString("base64"))
      
      const redirectUrl = 'https://hack.af/z/slack-auth'
      // Redirect to Slack Auth specifying that it's /z
      res.redirect(`https://slack.com/oauth/v2/authorize?response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&user_scope=identify&client_id=2210535565.1711449950551&state=${stateString}`)
    }
    
    if (query.id === "5s7xrr") { 
      // Special case for George Hotz AMA, redirect to another Zoom link
      res.redirect('https://hack.af/geohot-zoom')
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
