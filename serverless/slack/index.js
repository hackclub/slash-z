import fetch from 'node-fetch'

module.exports = async (req, res) => {
  // we get a post from slack telling us someone just ran the /z command

  // queue up a job to handle the request from slack
  // but don't await, so we can get back to Slack within their 3000ms window
  await fetch('http://localhost:3000/api/slack/postCallLink', {
    method: 'post',
    body: JSON.stringify(req.body)
  })

  // Acknowledge we got the message so Slack doesn't show an error to the user
  res.status(200).send('Working on it!')
}