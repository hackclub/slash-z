import Prisma from "../prisma.js"
import isProd from "../../isprod.js"

export default async (req, res) => {
  console.log({name: req.query.id})
  let user = await Prisma.find('authedAccount', { where: {name: req.query.id} })
  if (!user) {
    user = await Prisma.create('authedAccount', {name: req.query.id})
  }
  if (!user.slackID) {
    // No slack ID for this user? they're unauthenticated! Let's return an auth challenge
    const redirectUrl = isProd ? 'https://hack.af/z/slack-auth' : "https://slash-z-staging-1ae8b1c9e24a.herokuapp.com/api/endpoints/slack-auth"
    
    const state = { userID: user.id }
    console.log({state})
    const stateString = encodeURIComponent(Buffer.from(JSON.stringify(state), "utf8").toString("base64"))
    
    const authUrl = `https://js-slash-z.hackclub.com/auth-start.html?response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&user_scope=identify&client_id=${process.env.SLACK_CLIENT_ID}&state=${stateString}`
    return res.json({
      error: 'AUTH',
      authUrl
    })
  }

  // should open a meeting using
  // <staging-app-url>/api/endpoints/schedule-link?id=9whz6

  // let's spice this name creation up in the future too
  const id = Math.random().toString(36).substring(7)
  res.json({id,
    videoUri: `https://hack.af/z-join?id=${id}`,
    moreUri: `https://hack.af/z-phone?id=${id}`,
    stagingVideoUri: !isProd ? `https://slash-z-staging-1ae8b1c9e24a.herokuapp.com/api/endpoints/schedule-link?id=${id}` : null 
  })

  Prisma.create('schedulingLink', {
    name: id,
    creatorSlackID: user.slackID,
    authedAccountID: user.id,
  })
}