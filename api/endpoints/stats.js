import { getTotalHosts, getOpenHosts, getCurrentlyActiveUsers } from "../state.js";

export default async (req, res) => {
  const data = {
    hosts: {
      total: await getTotalHosts(),
      open: await getOpenHosts(),
      active_users: await getCurrentlyActiveUsers()
    }
  }
  return res.send(data)
}
