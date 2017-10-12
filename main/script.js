/* sendPost */
	function sendPost(post, callback) {
		console.log(post)
		var request = new XMLHttpRequest()
			request.open("POST", "/", true)
			request.onload = function() {
				if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
					callback(JSON.parse(request.responseText) || {success: false, message: "unknown error"})
				}
				else {
					callback({success: false, readyState: request.readyState, message: request.status})
				}
			}
			request.send(JSON.stringify(post))
	}

/* isNumLet */
	function isNumLet(string) {
		return (/^[a-z0-9A-Z_\s]+$/).test(string)
	}
