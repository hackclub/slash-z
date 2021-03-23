const airbridge = require("./airbridge")

module.exports = async function(user) {
  const scheduleLinkFilter = `
  AND(
    {Creator Slack ID}='${user}',
    {Open Meetings}>0
  )
  `
  const links = await airbridge.get('Scheduling Links', {filterByFormula: scheduleLinkFilter})

  const meetings = links.map(async link => {
    const meetingFilter = `
    AND(
      {Status}='OPEN',
      {Scheduling Link}
    )
    `
    const meeting = await airbridge.find('Meetings', {filterByFormula: meetingFilter})
    return { meeting, link }
  })
  
  await Promise.all(meetings)

  return meetings
}