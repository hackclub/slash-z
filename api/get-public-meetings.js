const airbridge = require("./airbridge")

module.exports = async function() {
  const filterByFormula = `AND({Status}='OPEN',{Public}=TRUE())`
  const meetings = await airbridge.get('Meetings', {filterByFormula})
  return meetings
}