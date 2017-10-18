/*** animations ***/
	/* animateGhosts */
		var ghostWait = 0
		window.ghostLoop = setInterval(animateGhosts, 50)
		function animateGhosts() {
			//get ghosts
				var ghosts = Array.prototype.slice.call( document.getElementsByClassName("ghost") )
				var background = document.getElementById("background")
				var ghostCount = ghosts.length

			//reduce ghostWait
				if (ghostWait) {
					ghostWait--
				}
				else {
					ghostWait = 5
				}

			//create ghosts
				if (!ghostWait && ghostCount < 20) {
					var ghost = document.createElement("div")
						ghost.className = "ghost"
						ghost.style.left = Math.round(Math.random() * (window.innerWidth - 100)) + "px"
						ghost.style.top = window.innerHeight + 10 + "px"
						ghost.setAttribute("speed", Math.round(Math.random() * 5) + 5)

					background.appendChild(ghost)
				}

			//move ghosts
				for (var g in ghosts) {
					var speed = Number(ghosts[g].getAttribute("speed"))
					var top   = Number(ghosts[g].style.top.replace("px", ""))

					if (top - speed < -100) {
						background.removeChild(ghosts[g])
					}
					else {
						ghosts[g].style.top = top - speed + "px"
					}
				}
		}

/*** actions ***/
	/* createGame */
		document.getElementById("createGame").addEventListener("click", createGame)
		function createGame() {
			var post = {
				action: "createGame"
			}

			sendPost(post, function(data) {
				if (!data.success) {
					displayError(data.message || "unable to create game")
				}
				else {
					window.location = data.location
				}
			})
		}

	/* joinGame */
		document.getElementById("joinGame").addEventListener("click", joinGame)
		function joinGame() {
			var gameCode = document.getElementById("gameCode").value.replace(" ","").trim().toLowerCase() || false

			if (gameCode.length !== 4) {
				displayError("game code must be 4 characters")
			}
			else if (!isNumLet(gameCode)) {
				displayError("game code must be letters and numbers only")
			}
			else {
				var post = {
					action: "joinGame",
					gameCode: gameCode
				}

				sendPost(post, function(data) {
					if (!data.success) {
						displayError(data.message || "unable to join game")
					}
					else {
						window.location = data.location
					}
				})
			}
		}
