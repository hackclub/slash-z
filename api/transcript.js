const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const sample = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

const loadTranscript = () => {
  try {
    const doc = yaml.load(
      fs.readFileSync(path.resolve(__dirname, '../lib/transcript.yml'), 'utf8')
    )
    return doc
  } catch (e) {
    console.error(e)
  }
}
const recurseTranscript = (searchArr, transcriptObj) => {
  const searchCursor = searchArr.shift()
  const targetObj = transcriptObj[searchCursor]

  if (!targetObj) {
    return new Error(transcript('errors.transcript'))
  }
  if (searchArr.length > 0) {
    return recurseTranscript(searchArr, targetObj)
  } else {
    if (Array.isArray(targetObj)) {
      return sample(targetObj)
    } else {
      return targetObj
    }
  }
}
const replaceErrors = (key, value) => {
  // from https://stackoverflow.com/a/18391400
  if (value instanceof Error) {
    const error = {}
    Object.getOwnPropertyNames(value).forEach(key => {
      error[key] = value[key]
    })
    return error
  }
  return value
}

const transcript = (search, vars) => {
  if (vars) {
    console.log(
      `I'm searching for words in my yaml file under "${search}". These variables are set: ${JSON.stringify(
        vars,
        replaceErrors
      )}`
    )
  } else {
    console.log(`I'm searching for words in my yaml file under "${search}"`)
  }
  const searchArr = search.split('.')
  const transcriptObj = loadTranscript()
  const dehydratedTarget = recurseTranscript(searchArr, transcriptObj)
  return hydrateObj(dehydratedTarget, vars)
}
const hydrateObj = (obj, vars = {}) => {
  if (obj == null) {
    return null
  }
  if (typeof obj === 'string') {
    return evalTranscript(obj, vars)
  }
  if (Array.isArray(obj)) {
    return obj.map(o => hydrateObj(o, vars))
  }
  if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      obj[key] = hydrateObj(obj[key], vars)
    })
    return obj
  }
}
const evalTranscript = (target, vars = {}) => (
  function () {
    return eval('`' + target + '`')
  }.call({
    ...vars,
    t: transcript,
  })
)

module.exports = transcript