package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/schema"
	"github.com/hackclub/slash-z/db"
	"github.com/hackclub/slash-z/lib/zoom"
	"github.com/joho/godotenv"
)

var (
	dbc         db.DB
	zoomMachine ZoomMachine
	slack       SlackClient
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("error loading .env file:", err)
	}

	dbc, err = db.NewDB(os.Getenv("AIRTABLE_API_KEY"), os.Getenv("AIRTABLE_BASE"))
	if err != nil {
		fmt.Println("Failed to instantiate DB:", err)
		os.Exit(1)
	}

	hosts, err := dbc.GetHosts()
	if err != nil {
		fmt.Println("Failed to load Zoom host accounts from Airtable:", err)
		os.Exit(1)
	}

	// Load and set Zoom ID for any hosts that don't have one set
	for _, h := range hosts {
		if h.ZoomID != "" {
			continue
		}

		user, err := zoom.NewClient(h.APIKey, h.APISecret).GetUser(zoom.GetUserOpts{
			EmailOrID: h.Email,
		})
		if err != nil {
			fmt.Println("Failed to get user info from Zoom for "+h.Email+":", err)
			os.Exit(1)
		}

		h.ZoomID = user.ID

		if err := dbc.UpdateHost(&h); err != nil {
			fmt.Println("Failed to set Zoom ID for host "+h.Email+":", err)
			os.Exit(1)
		}
	}

	zoomMachine = NewZoomMachine(dbc, slack)

	slack = SlackClient{Token: os.Getenv("SLACK_BOT_USER_OAUTH_ACCESS_TOKEN")}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	go func() {
		if err := zoomMachine.RunIdleTimer(); err != nil {
			dbc.LogError(err)
			os.Exit(1)
		}
	}()

	http.HandleFunc("/slack/slash-z", slashZHandler)
	http.HandleFunc("/zoom/webhook", zoomWebhookHandler)

	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// Available params are token, team_id, team_domain, channel_id, channel_name,
// user_id, user_name, command, response_url, and trigger_id
//
// I am only including fields I'm using in this object.
type slashZReq struct {
	UserID string `schema:"user_id"`
}

// Called when someone runs `/z` in the Slack.
//
// We want to use this method to create a new Slack call, per
// https://api.slack.com/apis/calls.
//
// TODO: Verify /command token before executing
func slashZHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		fmt.Fprintln(w, "Error parsing request:", err)
		return
	}

	var req slashZReq

	decoder := schema.NewDecoder()
	decoder.IgnoreUnknownKeys(true)

	if err := decoder.Decode(&req, r.PostForm); err != nil {
		fmt.Fprintln(w, "Error unmarshaling request body:", err)
		return
	}

	meeting, host, err := zoomMachine.CreateJoinableMeeting()
	if err != nil {
		if _, ok := err.(*NoAvailableHostsError); ok {
			resp := map[string]interface{}{
				"response_type": "ephemeral",
				"text":          "_You wander around the house, but are unable to find an available room. Error: All Zoom hosts are in use. Try again in a minute?_",
			}
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(resp); err != nil {
				fmt.Fprintln(w, "Error encoding JSON response to Slack:", err)
				return
			}
		}

		fmt.Fprintln(w, "Error creating meeting:", err)
		return
	}

	call, err := slack.ZoomMeetingToCall(req.UserID, meeting)
	if err != nil {
		fmt.Fprintln(w, "Error turning Zoom meeting into Slack call:", err)
		return
	}

	meeting.SlackCallID = call.ID
	meeting.LinkedHostIDs = []string{host.AirtableID}

	if err := dbc.CreateMeeting(&meeting); err != nil {
		fmt.Fprintln(w, "Error saving meeting to internal DB:", err)
	}

	// Follows format of https://api.slack.com/apis/calls#3._post_the_call_to_channel
	resp := map[string]interface{}{
		"response_type": "in_channel",
		"text":          "A new Zoom Pro meeting was started with /z",
		"blocks": []map[string]interface{}{
			map[string]interface{}{
				"type": "section",
				"text": map[string]interface{}{
					"type": "mrkdwn",
					"text": "After running `/z`, you wander the creaky hallways and stumble upon the *" + host.RoomName + "*. You try it and the door is unlocked.",
				},
			},
			map[string]interface{}{
				"type":    "call",
				"call_id": call.ID,
			},
			map[string]interface{}{
				"type": "section",
				"text": map[string]interface{}{
					"type": "mrkdwn",
					"text": "_Psst " + meeting.JoinURL + " is the call link._",
				},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		fmt.Fprintln(w, "Error encoding JSON response to Slack:", err)
		return
	}
}

// TODO verify webhook with Authorization token
func zoomWebhookHandler(w http.ResponseWriter, r *http.Request) {
	var buf bytes.Buffer

	io.Copy(&buf, r.Body)

	if err := zoomMachine.ProcessWebhook(buf.Bytes()); err != nil {
		dbc.LogError(errors.New("error processing Zoom webhook: " + err.Error()))
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}
