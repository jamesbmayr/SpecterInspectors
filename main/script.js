/*** tools ***/
	/* isNumLet */
		function isNumLet(string) {
			return (/^[a-z0-9A-Z_\s]+$/).test(string)
		}

	/* isEmail */
		function isEmail(string) {
			return (/[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).test(string)
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

/*** displays ***/
	/* displayError */
		function displayError(message) {
			var error = document.getElementById("error")
				error.textContent = message || "unknown error"
				error.className = ""
				error.style.opacity = 0
			
			var errorFadein = setInterval(function() { // fade in
				error.className = ""
				var opacity = Number(error.style.opacity) * 100

				if (opacity < 100) {
					error.style.opacity = Math.ceil( opacity + ((100 - opacity) / 10) ) / 100
				}
				else {
					clearInterval(errorFadein)
					
					var errorFadeout = setInterval(function() { // fade out
						var opacity = Number(error.style.opacity) * 100

						if (opacity > 0) {
							error.style.opacity = Math.floor(opacity - ((101 - opacity) / 10) ) / 100
						}
						else {
							clearInterval(errorFadeout)
							error.className = "hidden"
							error.style.opacity = 0
						}
					}, 100)
				}
			}, 100)
		}

	/* buildGhosts */
		function buildGhosts(count, infinite) {
			ghostWait     = 0
			ghostMax      = count || 20
			ghostContinue = infinite ? 1 : (-1 * count)
			ghostLoop  = setInterval(animateGhosts, 50)
		}

	/* animateGhosts */
		function animateGhosts() {
			window.requestAnimationFrame(function() {
				// get ghosts
					var ghosts = Array.prototype.slice.call( document.getElementsByClassName("ghost") )
					var graveyard = document.getElementById("graveyard")
					var ghostCount = ghosts.length

				// reduce ghostWait
					if (ghostWait) {
						ghostWait--
					}
					else {
						ghostWait = 5
					}

				// create ghosts
					if (!ghostWait && (ghostCount < ghostMax) && ghostContinue) {
						ghostCount++
						ghostContinue++

						var ghost = document.createElement("div")
							ghost.className = "ghost"
							ghost.style.left = Math.round(Math.random() * (window.innerWidth - 100)) + "px"
							ghost.style.top = window.innerHeight + 10 + "px"
							ghost.setAttribute("speed", Math.round(Math.random() * 5) + 10)

						graveyard.appendChild(ghost)
					}

				// end ?
					if (!ghostContinue && !ghostCount) {
						clearInterval(ghostLoop)
					}

				// move ghosts
					else {
						for (var g in ghosts) {
							var speed = Number(ghosts[g].getAttribute("speed"))
							var top   = Number(ghosts[g].style.top.replace("px", ""))

							if (top - speed < -100) {
								graveyard.removeChild(ghosts[g])
							}
							else {
								ghosts[g].style.top = top - speed + "px"

								// safari hack
									ghosts[g].style.display = "none"
									ghosts[g].offsetHeight
									ghosts[g].style.display = "block"
							}
						}
					}


			})
		}

/*** connections ***/
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
		