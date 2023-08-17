import { config } from "dotenv";

config();

async function getToken() {
  const key = process.env.ZOOM_KEY;
  const account_id = process.env.ZOOM_ACCOUNT_ID;

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${key}`,
      "Host": "zoom.us"
    },
    body: `grant_type=account_credentials&account_id=${account_id}`
  });
  const result = await response.json();

  console.log(result);
}

getToken();
