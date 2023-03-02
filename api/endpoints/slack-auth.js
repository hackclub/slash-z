import Prisma from '../prisma.js'
import fetch from 'node-fetch'
import findOrCreateMeeting from "../find-or-create-meeting.js"

export default async (req, res) => {
  const {code, state: recordIDData} = req.query

  console.log({code, recordIDData})
  
  const {userID, meetingID} = JSON.parse(Buffer.from(decodeURIComponent(recordIDData), "base64").toString())

  console.log({code, recordIDData, userID, meetingID})

  // Generate the token request
  const tokenUrl = 'https://slack.com/api/oauth.v2.access' +
                      `?code=${code}` +
                      `&client_id=${process.env.SLACK_CLIENT_ID}` +
                      `&client_secret=${process.env.SLACK_CLIENT_SECRET}` +
                      `&redirect_uri=${encodeURIComponent('https://hack.af/z/slack-auth')}`

  console.log({code, recordIDData, userID, meetingID, tokenUrl})
  
  if (meetingID === "1vu13b") { // Hack Night!
    const slackData = await fetch(tokenUrl, {method: 'post'}).then(r => r.json())
    console.log(slackData)
    
    // Check if the authed user actually exists
    if (!slackData?.authed_user?.id) { // Instead of checking null, check any falsy value, such as undefined
      res.redirect('/auth-error.html')
      return
    }
    
    // Dynamically generate the meeting ID for future flexibility
    let meeting = await findOrCreateMeeting(meetingID)
    res.redirect(meeting.joinURL)
    return
  }
  
  const user = await Prisma.find('authedAccount', userID)

  if (user) {
    const slackData = await fetch(tokenUrl, {method: 'post'}).then(r => r.json())
    await Prisma.patch('authedAccount', userID, { slackID: slackData['authed_user']['id'] })
    // res.status(200).send('It worked! You can close this tab now')
    res.redirect('/auth-success.html')
  } else {
    // oh, we're far off the yellow brick road now...
    // res.status(422).send('Uh oh...')
    res.redirect('/auth-error.html')
  }
}