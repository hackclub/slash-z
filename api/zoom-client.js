import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import metrics from '../metrics.js'
export default class ZoomClient {
  constructor(props) {
    this.zoomKey = props.zoomKey
    this.zoomSecret = props.zoomSecret
  }

  async get(opts) {
    return this.request({...opts, method: 'get'})
  }

  async post(opts) {
    return this.request({...opts,
      method: 'post',
      headers: {...opts.headers, 'content-type': 'application/json'},
    })
  }

  async patch(opts) {
    return this.request({
      ...opts,
      method: 'patch',
      headers: {...opts.headers, 'content-type': 'application/json'},
    })
  }

  async put(opts) {
    return this.request({
      ...opts,
      method: 'put',
      headers: {...opts.headers, 'content-type': 'application/json'},
    })
  }

  async request(opts) {
    const pathPrefix = opts.path.split("/")[0]
    console.log(opts)
    let startTimeMs = Date.now()
    return fetch(`https://api.zoom.us/v2/${opts.path}`, {
      method: opts.method,
      headers: {
        authorization: `Bearer ${this.token()}`,
        ...opts.headers
      },
      body: JSON.stringify(opts.body)
    }).then(async r => {
      const httpCodeMetricName = `zoom.http.code.${pathPrefix}.${r.status}`
      const httpLatencyMetricName = `zoom.http.latency.${pathPrefix}.${r.status}`
      let elapsedTimeMs = startTimeMs - Date.now();

      metrics.timing(httpLatencyMetricName, elapsedTimeMs)
      metrics.increment(httpCodeMetricName, 1)

      // Zoom sometimes responds with 204 for no content.
      // We don't want to try parsing JSON for this, because there is no JSON to parse
      console.log({response: r.ok})

      if (r.ok && r.status != 204) {
        let payload = r.json()
        payload.http_code = r.status
        return payload
      } else if (r.status == 204) {
        return {http_code:r.status}
      } else {
        return {http_code:r.status}
      }
    }).catch(err => {
      metrics.increment("error.zoom_request_exception", 1)
      console.error(err)
    })
  }

  token() {
    const payload = {
      iss: this.zoomKey,
      exp: new Date().getTime() + 5000,
    }
    const token = jwt.sign(payload, this.zoomSecret)
    return token
  }
}