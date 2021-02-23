const AirBridge = require('../airbridge')
module.exports = async (req, res) => {
  console.log({req})
  let user = await AirBridge.find('Authed Accounts', {filterByFormula: `RECORD_ID()='${req.query.recordID}'`})
  res.status(200).send('it worked!')
}
