/* scrollToNewest */
	scrollToNewest()
	function scrollToNewest() {
		var events = document.getElementById("events-list")
			events.scrollBy(0, 1000000)

		var chats = document.getElementById("chats-list")
			chats.scrollBy(0, 1000000)
	}

/* slideContainer */
	var buttons = Array.prototype.slice.call(document.getElementsByClassName("slideContainer"))
	for (var b in buttons) { buttons[b].addEventListener("click", slideContainer) }
	function slideContainer(event) {
		var button = event.target
		var container = document.getElementById("container")

		if (button.value == "right") {
			var target = (button.parentNode.id == "chats") ? 0 : window.innerWidth

			slideLoop = setInterval(function() {
				var position = Number(container.style.left.replace("px", ""))
				
				if (position + 20 < target) {
					container.style.left = position + 20 + "px"
				}
				else {
					container.style.left = target + "px"
					clearInterval(slideLoop)
				}
			}, 10)

		}
		else if (button.value == "left") {
			var target = (button.parentNode.id == "notes") ? 0 : window.innerWidth * -1
			if (button.parentNode.id == "notes") { submitNotes() }

			slideLoop = setInterval(function() {
				var position = Number(container.style.left.replace("px", ""))
				
				if (position - 20 > target) {
					container.style.left = position - 20 + "px"
				}
				else {
					container.style.left = target + "px"
					clearInterval(slideLoop)
				}
			}, 10)

		}
	}

/* submitNotes */
	var savedNotes = sanitizeString(document.getElementById("notes-input").value)
	function submitNotes() {
		var input = document.getElementById("notes-input")
		var notes  = sanitizeString(input.value)

		if (notes == savedNotes) {
			//do nothing
		}
		else {
			sendPost({action: "submitNotes", notes: notes}, function(data) {
				if (!data.success) {
					displayError(data.message || "unable to submit notes")
				}
				else {
					notes.value = data.notes
					displayError("notes saved")
				}
			})
		}
	}

/* submitChat */
	document.getElementById("chats-button").addEventListener("click", submitChat)
	document.getElementById("chats-input").addEventListener("keyup", function (event) {
		if (event.which == 13) { submitChat() }
	})
	function submitChat() {
		var input = document.getElementById("chats-input")

		if (!input.value || input.value.length == 0) {
			displayError("enter a chat message")
		}
		else if (sanitizeString(input.value).length !== input.value.length) {
			displayError("use regular characters only")
		}
		else {
			var text  = sanitizeString(input.value)

			sendPost({action: "submitChat", text: text, gameid: game.id}, function(data) {
				if (!data.success) {
					displayError(data.message || "unable to post message")
				}
				else {
					input.value = ""
					buildChat(data.chat)
				}
			})
		}
	}

/* buildChat */
	function buildChat(chat) {
		var author  = chat.author || null
			author  = window.game.players[author].name || "???"
		var text    = chat.text   || ""
		var created = chat.created ? new Date(chat.created) : new Date()
			created = created.toLocaleString().split(",")[1]

		var authorBlock = document.createElement("div")
			authorBlock.className = "chat-author"
			authorBlock.appendChild(document.createTextNode(author))

		var timeBlock = document.createElement("div")
			timeBlock.className = "chat-time"
			timeBlock.appendChild(document.createTextNode(created))

		var infoBlock = document.createElement("div")
			infoBlock.className = "chat-info"
			infoBlock.appendChild(authorBlock)
			infoBlock.appendChild(timeBlock)

		var textBlock = document.createElement("div")
			textBlock.className = "chat-text"
			textBlock.appendChild(document.createTextNode(text))

		var chatBlock = document.createElement("div")
			chatBlock.className = "chat"
			chatBlock.appendChild(infoBlock)
			chatBlock.appendChild(textBlock)

		var chats = document.getElementById("chats-list")
			chats.appendChild(chatBlock)
			chats.scrollBy(0, 1000000)
	}

/* submitEvent */
	var buttons = Array.prototype.slice.call(document.getElementsByClassName("slideContainer"))
	for (var b in buttons) { buttons[b].addEventListener("click", submitEvent) }
	function submitEvent(event) {
		var button = event.target
		console.log(button)
	}
	
/* buildEvent */
	function buildEvent(event) {
		var type  = event.type  || "story"
		var text  = event.text  || "..."
		var input = event.input || false
		var time  = event.time ? new Date(event.time) : new Date()
			time  = time.toLocaleString().split(",")[1]

		var typeBlock = document.createElement("div")
			typeBlock.className = "event-type"
			typeBlock.appendChild(document.createTextNode(type))

		var timeBlock = document.createElement("div")
			timeBlock.className = "event-time"
			timeBlock.appendChild(document.createTextNode(time))

		var textBlock = document.createElement("div")
			textBlock.className = "event-text"
			textBlock.appendChild(document.createTextNode(text))

		var inputBlocks = []
		if (input) {
			if (input.type == "text") {
				var inputBlock = document.createElement("input")
					inputBlock.className = "event-input"
					inputBlock.type = "text"
					inputBlock.placeholder = "type your response here"

				var buttonBlock = document.createElement("button")
					buttonBlock.className = "event-button"
					buttonBlock.value = "submit"
					buttonBlock.appendChild(document.createTextNode(`&#x21ea;`))

				inputBlocks = [inputBlock, buttonBlock]
			}
			else if (input.type == "select") {
				var labelBlock = document.createElement("optgroup")
					labelBlock.setAttribute("label", "select...")

				var selectBlock = document.createElement("select")
					selectBlock.className = "event-select"
					selectBlock.appendChild(labelBlock)

				for (var o in input.options) {
					var optionBlock = document.createElement("option")
						optionBlock.value = input.options[o]
						optionBlock.appendChild(document.createTextNode(input.options[o]))

					selectBlock.appendChild(optionBlock)
				}

				var buttonBlock = document.createElement("button")
					buttonBlock.className = "event-button"
					buttonBlock.value = "submit"
					buttonBlock.innerHTML = "&#x21ea;"

				inputBlocks = [selectBlock, buttonBlock]
			}
			else if (input.type == "buttons") {
				var buttonBlock1 = document.createElement("button")
					buttonBlock1.className = "event-button"
					buttonBlock1.value = true
					buttonBlock1.appendChild(document.createTextNode(input.options[0]))

				var buttonBlock2 = document.createElement("button")
					buttonBlock2.className = "event-button"
					buttonBlock2.value = false
					buttonBlock2.appendChild(document.createTextNode(input.options[1]))

				inputBlocks = [buttonBlock1, buttonBlock2]
			}
		}

		var eventBlock = document.createElement("div")
			eventBlock.className = "event"
			eventBlock.appendChild(typeBlock)
			eventBlock.appendChild(timeBlock)
			eventBlock.appendChild(textBlock)
			for (var i in inputBlocks) {
				eventBlock.appendChild(inputBlocks[i])
			}

		var events = document.getElementById("events-list")
			events.appendChild(eventBlock)
			events.scrollBy(0, 1000000)
	}

