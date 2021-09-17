import jwt from 'jsonwebtoken'

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
    console.log(opts)
    return fetch(`https://api.zoom.us/v2/${opts.path}`, {
      method: opts.method,
      headers: {
        authorization: `Bearer ${this.token()}`,
        ...opts.headers
      },
      body: JSON.stringify(opts.body)
    }).then(r => {
      // Zoom sometimes responds with 204 for no content.
      // We don't want to try parsing JSON for this, because there is no JSON to parse
      console.log({response: r.ok})
      if (r.ok && r.status != 204) {
        return r.json()
      } else if (r.status == 204) {
        return {}
      } else {
        return r.text().then(text => {throw Error(text)})
      }
    }).catch(err => {
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