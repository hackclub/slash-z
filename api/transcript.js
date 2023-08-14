import yaml from 'js-yaml'
import { readFileSync } from 'fs'
import path from 'path'
import os from "os"

/**
* Returns the plural of {word}
* @function
* @param {string} word
* @param {number} count
* @returns {string}
*/
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

/**
* Loads the transcipt.yml file into an object
* @function
* @returns {string}
*/
const loadTranscript = () => {
  const moduleURL = new URL(import.meta.url);
  let __dirname = decodeURIComponent(path.dirname(moduleURL.pathname));
  __dirname = os.platform() == "win32" ? __dirname.slice(1) : __dirname
  
  try {
    const doc = yaml.load(
      readFileSync(path.join(__dirname, '..', 'lib', 'transcript.yml'), 'utf8')
    )
    return doc
  } catch (e) {
    console.error(e)
  }
}

/**
 * Recursively searches deep into the {transcriptObj}.
 * searchArr is a list such as ['plurals', 'participants']
 * constructed from a string such as 'plurals.participants'
 * representing object access of the form { plurals: { participants: {}}}
 * @param {string[]} searchArr - A list of subsequent levels through which to search
 * @param {Object} transcriptObj - An object representation of  transcript.yml
 * @param {any} fallback 
 * @returns {Object|string} 
 */
const recurseTranscript = (searchArr, transcriptObj, fallback) => {
  // start searching from the first item of the search array
  const searchCursor = searchArr.shift()
  const targetObj = transcriptObj[searchCursor]

  // if the item wasn't found in the array
  // return an new error
  // or return the fallback if a fallback was passed
  if (!targetObj) {
    if (typeof fallback == 'undefined') {
      return new Error('errors.transcript')
      // return new Error(transcript('errors.transcript'))
    } else {
      return fallback
    }
  }

  // if we haven't reached the deepest key, 
  // keep going!
  if (searchArr.length > 0) {
    return recurseTranscript(searchArr, targetObj)
  } else {
    // if our target object is an array -- like a list item
    if (Array.isArray(targetObj)) {
      // pick one of the items and return it
      return sample(targetObj)
    } else {
      // otherwise return the target object
      return targetObj
    }
  }
}

/**
 * Returns a plain object from an error 
 * @param {string} key 
 * @param {any} value 
 * @returns {Object}
 */
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

/**
* Returns a value corresponding to {search} 
* from transcript.yml, replacing any placeholder with a variable
* from {vars}
* @function
* @param {string} search - the word to transcribe
* @param {Object} vars
* @param {Object} fallback
* @returns {string} 
*/
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

/**
 * Hydrates a javascript object 
 * @param {Object|string|any[]} obj 
 * @param {Object} vars 
 * @returns {null|Object|any[]|string} 
 */
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


/**
 * Replaces a variable in the yaml string with a value from var 
 * @example var = {port: 3000}; target = "Hello ${this.port}", result = "Hello 3000"
 * @param {strng} target 
 * @param {Object} vars 
 * @returns {string} 
 */
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