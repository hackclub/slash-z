import crypto from "crypto";
import metrics from "../metrics.js";
// this is a helper method to make sure the zoom request we get is authentic
export default async (req, res, callback) => {
  if (isZoomAuthenticRequest(req)) {
    await callback();
  } else {
    metrics.increment("errors.zoom_webhook_auth_failed", 1);
    res.status(403).send('Unauthorized sender');
  }
}

function isZoomAuthenticRequest(req) {
  const message = `v0:${req.headers['x-zm-request-timestamp']}:${JSON.stringify(req.body)}`;
  const hashForVerify = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex');
  const signature = `v0=${hashForVerify}`;

  if (req.headers['x-zm-signature'] === signature) {
    return true;
  }
  return false;
}
