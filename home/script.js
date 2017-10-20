/*** onload ***/
	buildGhosts(20, true)

/*** actions ***/
	/* createGame */
		document.getElementById("createGame").addEventListener("click", createGame)
		function createGame() {
			var post = {
				action: "createGame"
			}

			sendPost(post, function(data) {
				if (!data.success) {
					displayError(data.message || "Unable to create a game...")
				}
				else {
					window.location = data.location
				}
			})
		}

	/* joinGame */
		document.getElementById("joinGame").addEventListener("click", joinGame)
		document.getElementById("gameCode").addEventListener("keyup", function (event) { if (event.which == 13) { joinGame() } })
		function joinGame() {
			var gameCode = document.getElementById("gameCode").value.replace(" ","").trim().toLowerCase() || false

			if (gameCode.length !== 4) {
				displayError("The game code must be 4 characters.")
			}
			else if (!isNumLet(gameCode)) {
				displayError("The game code can be letters and numbers only.")
			}
			else {
				var post = {
					action: "joinGame",
					gameCode: gameCode
				}

				sendPost(post, function(data) {
					if (!data.success) {
						displayError(data.message || "Unable to join this game...")
					}
					else {
						window.location = data.location
					}
				})
			}
		}
