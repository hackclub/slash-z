package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/schema"
	"github.com/joho/godotenv"
)

var (
	zoomMachine ZoomMachine
	slack       SlackClient
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("error loading .env file:", err)
	}

	zoomMachine = ZoomMachine{
		Accounts: []ZoomAccount{
			ZoomAccount{
				APIKey:    os.Getenv("ZOOM_API_KEY"),
				APISecret: os.Getenv("ZOOM_API_SECRET"),
				Email:     os.Getenv("ZOOM_EMAIL"),
			},
		},
	}

	slack = SlackClient{
		Token: os.Getenv("SLACK_BOT_USER_OAUTH_ACCESS_TOKEN"),
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	http.HandleFunc("/slash-z", slashZHandler)
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

	meeting, err := zoomMachine.CreateJoinableMeeting()
	if err != nil {
		fmt.Fprintln(w, "Error creating meeting:", err)
		return
	}

	call, err := slack.ZoomMeetingToCall(req.UserID, meeting)
	if err != nil {
		fmt.Fprintln(w, "Error turning Zoom meeting into Slack call:", err)
		return
	}

	// Follows format of https://api.slack.com/apis/calls#3._post_the_call_to_channel
	resp := map[string]interface{}{
		"response_type": "in_channel",
		"text":          "A new Zoom Pro was started with /z",
		"blocks": []map[string]interface{}{
			map[string]interface{}{
				"type":    "call",
				"call_id": call.ID,
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		fmt.Fprintln(w, "Error encoding JSON response to Slack:", err)
		return
	}
}
