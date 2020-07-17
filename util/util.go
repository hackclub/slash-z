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

// From https://stackoverflow.com/a/10030772
func Reverse(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// Modified from https://stackoverflow.com/questions/33633168/how-to-insert-a-character-every-x-characters-in-a-string-in-golang
//
// Usage: InsertNth("3333333333", "-", 3, true) -> "333-333-333"
//        InsertNth("3333333333", "-", 4, false) -> "3-3333-3333"
//        InsertNth("33333333333", "-", 4, false) -> "333-3333-3333"
func InsertNth(s string, r rune, n int, leftToRight bool) string {
	if !leftToRight {
		s = Reverse(s)
	}

	var buffer bytes.Buffer
	var n_1 = n - 1
	var l_1 = len(s) - 1
	for i, rune := range s {
		buffer.WriteRune(rune)
		if i%n == n_1 && i != l_1 {
			buffer.WriteRune(r)
		}
	}

	if leftToRight {
		return buffer.String()
	} else {
		return Reverse(buffer.String())
	}
}
