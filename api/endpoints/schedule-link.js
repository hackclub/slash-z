import findOrCreateMeeting from "../find-or-create-meeting.js"

export default async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!req.query || !req.query.id) {
    res.redirect('new-schedule-link')
    return
  }
  
  if (process.env.TEMP_REDIRECT && process.env.TEMP_ID_FOR_REDIRECT && req.query.id == process.env.TEMP_ID_FOR_REDIRECT) {
    res.redirect(process.env.TEMP_REDIRECT)
    return
  }

  /*
    Working on VirtualLobby
   */
  const virtualLobbyEnabled = false; // Somehow fetch this value from AirTable
  if (virtualLobbyEnabled) {
    return res.redirect('/lobby/index.html?meetingID='+airtableMeeting.fields['Zoom ID']);
  }
  
  try {
    const airtableMeeting = await findOrCreateMeeting(query.id)
    if (query.phone) {
      res.redirect('/phone.html?meetingID='+airtableMeeting.fields['Zoom ID'])
    } else {
      res.redirect(airtableMeeting.fields['Join URL'])
    }
  } catch (err) {
    res.status(err.statusCode || 500).send(err.message)
  }
}
