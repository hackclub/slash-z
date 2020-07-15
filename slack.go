package main

import (
	"net/http"
	"strconv"

	"github.com/hackclub/slash-z/util"
)

const slackBaseURL = "https://slack.com/api"

type SlackCall struct {
	ID string
}

type SlackClient struct {
	Token string
}

func (c SlackClient) req(method string, body interface{}) (*http.Response, error) {
	return util.PostJSON(slackBaseURL+"/calls.add", map[string]string{
		"Authorization": "Bearer " + c.Token,
	}, body)
}

// From https://api.slack.com/methods/calls.add
type callsAddReq struct {
	ExternalUniqueID string `json:"external_unique_id"`
	JoinURL          string `json:"join_url"`
}

type callsAddResp struct {
	OK   bool `json:"ok"`
	Call struct {
		ID               string `json:"id"`
		DateStart        int    `json:"date_start"`
		ExternalUniqueID string `json:"external_unique_id"`
		JoinURL          string `json:"join_url"`
	} `json:"call"`
}

func (c SlackClient) ZoomMeetingToCall(meeting ZoomMeeting) (SlackCall, error) {
	req := callsAddReq{
		ExternalUniqueID: strconv.Itoa(meeting.ID),
		JoinURL:          meeting.URL,
	}

	res, err := c.req("calls.add", req)
	if err != nil {
		return SlackCall{}, err
	}

	var resp callsAddResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return SlackCall{}, err
	}

	return SlackCall{ID: resp.Call.ID}, nil
}
