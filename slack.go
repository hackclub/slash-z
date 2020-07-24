package main

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gorilla/schema"

	"github.com/hackclub/slash-z/db"
	"github.com/hackclub/slash-z/util"
)

const slackBaseURL = "https://slack.com/api"

type SlackCall struct {
	ID string `json:"id"`
}

type SlackUser struct {
	ID      string `json:"id"`
	Profile struct {
		DisplayName string `json:"display_name"`
	} `json:"profile"`
}

type SlackClient struct {
	Token string
}

func (c SlackClient) req(method string, body interface{}) (*http.Response, error) {
	// Requests to send as a GET request (encoding body to URL params) instead of
	// sending as a POST request via JSON.
	//
	// Note that the fields in body must have `schema` annotations instead of the
	// normal `json` annotations to label the fields.
	sendAsGET := map[string]struct{}{
		"users.info": struct{}{},
	}

	// If method is a key in the sendAsGET map, convert body to URL params and
	// send a GET request.
	if _, present := sendAsGET[method]; present {
		form := url.Values{}
		form.Add("token", c.Token)

		if err := schema.NewEncoder().Encode(body, form); err != nil {
			return nil, err
		}

		client := http.Client{}
		return client.Get(slackBaseURL + "/" + method + "?" + form.Encode())
	}

	// Else do the normal POST request.
	return util.PostJSON(slackBaseURL+"/"+method, map[string]string{
		"Authorization": "Bearer " + c.Token,
	}, body)
}

type userInfoReq struct {
	UserID string `schema:"user"`
}

type userInfoResp struct {
	OK   bool      `json:"ok"`
	User SlackUser `json:"user"`
}

func (c SlackClient) UserInfo(userID string) (SlackUser, error) {
	req := userInfoReq{UserID: userID}
	res, err := c.req("users.info", req)
	if err != nil {
		return SlackUser{}, err
	}

	var resp userInfoResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return SlackUser{}, err
	}

	return resp.User, nil
}

// From https://api.slack.com/methods/calls.add
type callsAddReq struct {
	ExternalUniqueID string `json:"external_unique_id"`
	JoinURL          string `json:"join_url"`

	CreatedBy         string `json:"created_by"`
	DateStart         int64  `json:"date_start"`
	DesktopAppJoinURL string `json:"desktop_app_join_url"`
	ExternalDisplayID string `json:"external_display_id"`
	Title             string `json:"title"`
}

type callsAddResp struct {
	OK   bool      `json:"ok"`
	Call SlackCall `json:"call"`
}

func (c SlackClient) ZoomMeetingToCall(slackCreatorID string, meeting db.Meeting) (SlackCall, error) {
	creator, err := c.UserInfo(slackCreatorID)
	if err != nil {
		return SlackCall{}, err
	}

	req := callsAddReq{
		ExternalUniqueID: strconv.Itoa(meeting.ZoomID),
		JoinURL:          meeting.JoinURL,

		CreatedBy:         creator.ID,
		DateStart:         time.Now().Unix(),
		DesktopAppJoinURL: "zoommtg://zoom.us/join?confno=" + strconv.Itoa(meeting.ZoomID) + "&zc=0",
		ExternalDisplayID: meeting.PrettyZoomID(),
		Title:             "Zoom Pro meeting started by " + creator.Profile.DisplayName,
	}

	res, err := c.req("calls.add", req)
	if err != nil {
		return SlackCall{}, err
	}

	var resp callsAddResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return SlackCall{}, err
	}

	return resp.Call, nil
}

type externalCallParticipant struct {
	ExternalID  string `json:"external_id"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

func (c SlackClient) generateExternalUserID(slackCallID, perMeetingUserZoomID string) string {
	return slackCallID + "-" + perMeetingUserZoomID
}

// This is the request body for calls to both calls.participants.add and
// calls.participants.remove. See Slack API docs for details.
type participantsChangeReq struct {
	CallID string                    `json:"id"`
	Users  []externalCallParticipant `json:"users"`
}

// This is the response format for both calls.participants.add and
// calls.participants.remove. See Slack API docs for details.
type participantsChangeResp struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
}

func (c SlackClient) AddParticipantToCall(callID, perMeetingUserZoomID, userName string) error {
	req := participantsChangeReq{
		CallID: callID,
		Users: []externalCallParticipant{
			externalCallParticipant{
				ExternalID:  c.generateExternalUserID(callID, perMeetingUserZoomID),
				DisplayName: userName,
				AvatarURL:   "https://ui-avatars.com/api/?size=256&name=" + userName,
			},
		},
	}

	res, err := c.req("calls.participants.add", req)
	if err != nil {
		return err
	}

	var resp participantsChangeResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return err
	}

	if resp.OK {
		return nil
	} else {
		return errors.New("error from Slack API: " + resp.Error)
	}
}

func (c SlackClient) RemoveParticipantFromCall(callID, perMeetingUserZoomID, userName string) error {
	req := participantsChangeReq{
		CallID: callID,
		Users: []externalCallParticipant{
			externalCallParticipant{
				ExternalID:  c.generateExternalUserID(callID, perMeetingUserZoomID),
				DisplayName: userName,
				AvatarURL:   "https://ui-avatars.com/api/?size=256&name=" + userName,
			},
		},
	}

	res, err := c.req("calls.participants.remove", req)
	if err != nil {
		return err
	}

	var resp participantsChangeResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return err
	}

	if resp.OK {
		return nil
	} else {
		return errors.New("error from Slack API: " + resp.Error)
	}
}

// From https://api.slack.com/methods/calls.end
type callsEndReq struct {
	ID                string `json:"id"`
	DurationInSeconds int    `json:"duration,omitempty"`
}

type callsEndResp struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
}

func (c SlackClient) EndCall(slackCallID string, durationInSeconds int) error {
	req := callsEndReq{
		ID:                slackCallID,
		DurationInSeconds: durationInSeconds,
	}

	res, err := c.req("calls.end", req)
	if err != nil {
		return err
	}

	var resp callsEndResp
	if err := util.DecodeJSON(res.Body, &resp); err != nil {
		return err
	}

	if resp.OK {
		return nil
	} else {
		return errors.New("error from Slack API: " + resp.Error)
	}
}
