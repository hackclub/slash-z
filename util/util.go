package util

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

func PostJSON(url string, headers map[string]string, body interface{}) (*http.Response, error) {
	client := &http.Client{}

	b := new(bytes.Buffer)
	json.NewEncoder(b).Encode(body)

	req, err := http.NewRequest("POST", url, b)
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		req.Header.Add(k, v)
	}

	req.Header.Add("Content-Type", "application/json; charset=utf-8")

	return client.Do(req)
}

func DecodeJSON(r io.Reader, body interface{}) error {
	return json.NewDecoder(r).Decode(&body)
}
