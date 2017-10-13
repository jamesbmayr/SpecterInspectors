/* sendPost */
	function sendPost(post, callback) {
		var request = new XMLHttpRequest()
			request.open("POST", location.pathname, true)
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

/* sanitizeString */
	function sanitizeString(string) {
		if (string.length > 0) {
			return string.replace(/[^a-zA-Z0-9_\s\!\@\#\$\%\^\&\*\(\)\+\=\-\[\]\\\{\}\|\;\'\:\"\,\.\/\<\>\?]/gi, "")
		}
		else {
			return ""
		}
	}

/* displayError */
	function displayError(message) {
		var error = document.getElementById("error")
			error.textContent = message || "unknown error"
			error.className = ""

		var errorTimeout = setTimeout(function() {
			var errorFadeout = setInterval(function() {
				var opacity = Number(error.style.opacity)

				if (opacity >= 0) {
					error.style.opacity = ((opacity * 100) - 5) / 100
				}
				else {
					clearInterval(errorFadeout)
					error.className = "hidden"
					error.style.opacity = 1
				}
			}, 100)
		}, 2000)
	}