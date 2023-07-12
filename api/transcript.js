import yaml from 'js-yaml'
import { readFileSync } from 'fs'
import path from 'path'
import os from "os"

const pluralize = (word, count) => {
  // want to use this method? make sure to add your word to transcript.yml under 'plurals'
  if (count == 1) {
    // singular
    return `${count} ${word}`
  } else {
    // plural or zero
    return `${count} ${transcript('plurals.' + word)}`
  }
}

const sample = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

const loadTranscript = () => {
  const moduleURL = new URL(import.meta.url);
  
  let __dirname = decodeURIComponent(path.dirname(moduleURL.pathname));
  __dirname = os.platform() == "win32" ? __dirname.slice(1) : __dirname
  
  console.log("Dirname = ", __dirname);
  
  try {
    const doc = yaml.load(
      readFileSync(path.join(__dirname, '..', 'lib', 'transcript.yml'), 'utf8')
    )
    return doc
  } catch (e) {
    console.error(e)
  }
}
const recurseTranscript = (searchArr, transcriptObj, fallback) => {
  const searchCursor = searchArr.shift()
  const targetObj = transcriptObj[searchCursor]

  if (!targetObj) {
    if (typeof fallback == 'undefined') {
      return new Error('errors.transcript')
      // return new Error(transcript('errors.transcript'))
    } else {
      return fallback
    }
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

const transcript = (search, vars, fallback) => {
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
  const dehydratedTarget = recurseTranscript(searchArr, transcriptObj, fallback)
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
    pluralize
  })
)

export default transcript;