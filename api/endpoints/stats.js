import {getTotalHosts, getOpenHosts} from "../state.js";

export default async (req, res) => {
  const data = {
    hosts: {
      total: await getTotalHosts(),
      open: await getOpenHosts()
    }
  }
  return res.send(data)
}