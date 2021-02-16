const AirBridge = require("../airbridge")

module.exports = async (req, res) => {
  const { query } = req

  // No scheduling link ID? Let's redirect the user to get a new one
  if (!query || !query.id) {
    res.redirect('new-schedule-link')
    return
  }

  // Find or create a scheduling link record with the ID we've been given
  let link = await AirBridge.find('Scheduling Links', {filterByFormula: `{Name}='${query.id}'` })
  if (!link) {
    link = await AirBridge.create('Scheduling Links', {Name: query.id})
  }
}