import { getTotalHosts, getOpenHosts, getCurrentlyActiveUsers } from "../state.js";

export default async (req, res) => {
  const data = {
    hosts: {
      total: await getTotalHosts(),
      open: await getOpenHosts(),
      cau: await getCurrentlyActiveUsers()
    }
  }
  return res.send(data)
}