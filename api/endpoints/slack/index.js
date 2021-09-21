import ensureSlackAuthenticated from "../../ensure-slack-authenticated.js"
import slashZ from './slash-z.js'
import slashZRooms from './slash-z-rooms.js'

export default async (req, res) => {
  return await ensureSlackAuthenticated(req, res, async () => {
    // Acknowledge we got the message so Slack doesn't show an error to the user
    res.status(200).send();

    switch (req.body.command) {
      case "/z":
        await slashZ(req, res);
        break;
      case "/join-radio":
        await slashZ(req, res, true);
        break;
      case "/z-rooms":
        await slashZRooms(req, res);
        break;
      default:
        throw new Error(`Unsupported slash command: '${req.body.command}'`);
    }
  });
};
