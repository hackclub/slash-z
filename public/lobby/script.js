const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const urlParams = new URLSearchParams(window.location.search);
const meetingID = urlParams.get('meetingID');

$`div#enter-hostkey`.style.display = 'none'
$`button#hostkey-button`.onclick = () => {
    $`div#enter-hostkey`.style.display = 'block'
    $`button#hostkey-button`.style.display = 'none'
}
$`button#cancel-hostkey`.onclick = () => {
    $`div#enter-hostkey`.style.display = 'none'
    $`button#hostkey-button`.style.display = 'block'
}
$`button#enter-meeting`.onclick = async () => {
    fetch('/api/endpoints/hostkey', {
        method: "POST",
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            hostkey: $`div#enter-hostkey > input`.value,
            meetingID: meetingID
        })
    }).then(response => response.json()).then(json => {
        if (json.success) window.location.href = json.callLink;
        else {
            $`div#enter-hostkey > input`.value = 'Invalid Host Key';
        }
    }).catch(() => {
        $`div#enter-hostkey > input`.value = 'Error';
    });
}

const validate = () => {
    const input = $`div#enter-hostkey > input`;
    input.value = input.value.split('').filter(char => parseInt(char) == char).join('');
    if (input.value.length > 6) input.value = input.value.substring(0, 6);
}
