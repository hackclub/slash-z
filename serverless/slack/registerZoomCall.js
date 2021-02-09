// import createFetch from '@vercel/fetch'
// const fetch = createFetch()
// const axios = require('axios').default

export const registerZoomCall = async ({zoomMeeting, slackUser}) => {
  // https://api.slack.com/methods/calls.add
  const fields = {
    token: process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN,
    external_unique_id: zoomMeeting.zoomID,
    join_url: zoomMeeting.joinURL,
    created_by: slackUser.id,
    date_start: Date.now(),
    desktop_app_join_url: `zoommtg://zoom.us/join?confno=${zoomMeeting.zoomID}&zc=0`,
    external_display_id: zoomMeeting.zoomID,
    title: `Zoom Pro meeting started by ${slackUser.username}`
  }
  console.log({fields})

  // fetch('https://api.hackclub.com/v1/ping')
  // .then( r => r.json() )
  // .then( data => {
  //   console.log(data);
  // }).catch(err => {
  //   console.error(err)
  // });

  const fetch = require('node-fetch')
  await fetch('https://api.hackclub.com/v1/ping').then(r => r.json()).then(data => console.log(data))
  // await axios.get('https://api.hackclub.com/v1/ping')
  // .then(function (response) {
  //   // handle success
  //   console.log(response);
  // })
  // .catch(function (error) {
  //   // handle error
  //   console.log(error);
  // })
  console.log("i will nnot reach here")
  await fetch('https://api2.hackclub.com/v0/Operations/Badges').then(r => console.log(r))
  await fetch('https://slack.com/api/calls.add').then(r => console.log(r))
  // const result = await fetch('https://slack.com/api/calls.add', {
  //   method: 'post',
  //   body: JSON.stringify(fields),
  //   mode: 'cors',
  //   headers: {
  //     'Content-Type': 'application/json'
  //   }
  // }).then(r => r.json()).catch(err => console.log(err))
  console.log(result)
  await result
  console.log(result)
  console.log(result.json())

  return result
}