import airbridge from './airbridge.js'

export default async function (user) {
  const scheduleLinkFilter = `
  AND(
    {Creator Slack ID}='${user}',
    {Open Meetings}>0
  )
  `
  const links = await airbridge.get('Scheduling Links', {
    filterByFormula: scheduleLinkFilter
  })

  const meetings = await Promise.all(
    links.map(async link => {
      const meetingFilter = `
    AND(
      {Status}='OPEN',
      NOT({Host Key}=BLANK()),
      {Scheduling Link}='${link.fields['Name']}'
    )
    `
      const meeting = await airbridge.find('Meetings', {
        filterByFormula: meetingFilter
      })
      return { meeting, link }
    })
  )

  return meetings
}
