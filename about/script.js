/*** feedback ***/
	/* submitFeedback */
		document.getElementById("feedback-submit").addEventListener("click", submitFeedback)
		document.getElementById("feedback-email").addEventListener("keyup", function(event) { if (event.which == 13) { submitFeedback() } })
		function submitFeedback() {
			var text  = document.getElementById("feedback-text").value  || false
			var email = document.getElementById("feedback-email").value || false

			if (!text || !text.length) {
				displayError("No text was entered.")
			}
			else if (!email || !isEmail(email)) {
				displayError("Please enter a valid email.")
			}
			else {
				displayError("Thanks! Feedback sent!")

				try {
					var time = new Date()
					var text = sanitizeString(text).replace(/\&/gi, "%26")

					var request = new XMLHttpRequest()
						request.open("GET", "https://script.google.com/macros/s/AKfycbzPtBRMXgT-I5RZH3WMOnqbU3XEr8mK33OGmxMRFI8KbF3lOjg/exec?time=" + time + "&email=" + email + "&text=" + text, true)
						request.onload = function() {
							if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
								displayError("Thanks! Feedback sent!")
							}
							else {
								displayError("Thanks! Feedback sent!")
							}
						}
					request.send("")
				} catch (error) {}

				document.getElementById("feedback-text").value  = ""
				document.getElementById("feedback-email").value = ""
			}
		}

	/* animations */
		buildGhosts(10, true)