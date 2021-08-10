// const Bottleneck = require('bottleneck')
const lockfile = require('proper-lockfile')

const AirBridge = require('./airbridge')
const openZoomMeeting = require("./open-zoom-meeting")

const main = async ({queryID}) => {
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Find the scheduling link record with the ID we've been given
  let link = await AirBridge.find('Scheduling Links', {filterByFormula: `{Name}='${queryID}'` })
  if (!link) {
    const err = Error('Scheduling meeting not found!')
    err.statusCode = 404
    throw err
  }

  let airtableMeeting
  // if no OPEN meeting for the schedule link, let's create one now!
  if (link.fields['Open Meetings'] == 0) {
    console.log(`No open meetings for scheduling link '${link.fields['Name']}', creating a new one`)
    // start a meeting
    let zoomMeeting
    try {
      zoomMeeting = await openZoomMeeting()
    } catch (err) {
      err.statusCode = 503
      throw err
    }
    // add it to the list of scheduled meetings
    const fields = {}
    fields['Zoom ID'] = zoomMeeting.id.toString()
    fields['Host'] = [zoomMeeting.host.id]
    fields['Started At'] = Date.now()
    fields['Join URL'] = zoomMeeting.join_url
    fields['Scheduling Link'] = [link.id]
    fields['Host Join URL'] = zoomMeeting.start_url
    fields['Public'] = false // hard coding this b/c scheduled meetings aren't shown on the public list atm
    fields['Host Key'] = zoomMeeting.hostKey
    if (link.fields['Creator Slack ID']) {
      fields['Creator Slack ID'] = link.fields['Creator Slack ID']
    }

    airtableMeeting = await AirBridge.create('Meetings', fields)
  } else {
    console.log(`There's already an open meeting for scheduling link '${link.fields['Name']}'`)
    airtableMeeting = await AirBridge.find('Meetings', {filterByFormula: `AND('${link.fields['Name']}'={Scheduling Link},{Status}='OPEN')`})
  }

  return airtableMeeting
}

 
module.exports = async ({queryID}) => {
  // await lockFile.lock(`.lock`, opts, function (er) {
  //   // if the er happens, then it failed to acquire a lock.
  //   // if there was not an error, then the file was created,
  //   // and won't be deleted until we unlock it.
  
  //   await main({queryID})
  //   // do my stuff, free of interruptions
  //   // then, some time later, do:
  //   lockFile.unlock('some-file.lock', function (er) {
  //     // er means that an error happened, and is probably bad.
  //   })
  // })
  new Promise(async (resolve, reject) => {
    lockfile.lock(`lock-${queryID}`).then(async release => {
      await main({queryID})
      release()
    }).catch(err => {
      lockfile.unlock(`lock-${queryID}`)
    })
  })
}