// Taken from https://jsfiddle.net/sUK45/
// https://stackoverflow.com/a/16348977

module.exports = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let colour = ''
  for (var i = 0; i < 3; i++) {
      var value = (hash >> (i * 8)) & 0xFF
      colour += ('00' + value.toString(16)).substr(-2)
  }
  return colour
}
