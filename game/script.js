/*** navigation ***/
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

/*** submit ***/
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
						savedNotes = data.notes
						notes.value = data.notes
						displayError("notes saved")
					}
				})
			}
		}

	/* submitChat */
		document.getElementById("chats-button").addEventListener("click", submitChat)
		document.getElementById("chats-input").addEventListener("keyup", function (event) { if (event.which == 13) { submitChat() } })
		
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

				sendPost({action: "submitChat", text: text}, function(data) {
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

	/* submitEvent */
		var buttons = Array.prototype.slice.call(document.getElementsByClassName("event-button"))
		for (var b in buttons) { buttons[b].addEventListener("click", submitEvent) }
		var inputs = Array.prototype.slice.call(document.getElementsByClassName("event-input"))
		for (var i in inputs)  {  inputs[i].addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } }) }
		
		function submitEvent(event) {
			var container = event.target.closest(".event")
			var id = container.id

			// inputs
				if (event.target.className == "event-input") {
					var input = event.target
					var button = Array.prototype.slice.call(container.querySelectorAll("button"))[0]

					if (!input.value || input.value.length == 0) {
						displayError("enter a response")
					}
					else if (sanitizeString(input.value).length !== input.value.length) {
						displayError("use regular characters only")
					}
					else {
						var value = sanitizeString(input.value)
					}
				}
				else if (event.target.className == "event-button" && event.target.value == "submit-text") {
					var input = Array.prototype.slice.call(container.querySelectorAll("input[type='text']"))[0]
					var button = event.target
					
					if (!input.value || input.value.length == 0) {
						displayError("enter a response")
					}
					else if (sanitizeString(input.value).length !== input.value.length) {
						displayError("use regular characters only")
					}
					else {
						var value = sanitizeString(input.value)
					}
				}
				else if (event.target.className == "event-button" && event.target.value == "submit-select") {
					var button = event.target
					var select = Array.prototype.slice.call(container.querySelectorAll("select"))[0]

					var value = select.value
				}
				else if (event.target.className == "event-button" && (event.target.value == "okay" || event.target.value === true || event.target.value === false)) {
					var buttons = Array.prototype.slice.call(container.querySelectorAll("button"))

					var value = event.target.value
				}	

			// send
				if (typeof value !== "undefined" && value !== null) {
					disableEvent(id)

					sendPost({action: "submitEvent", value: value, id: id}, function(data) {
						if (!data.success) {
							displayError(data.message || "unable to post event response")
							enableEvent(id)
						}
						else {
							for (var e in data.events) {
								buildEvent(data.events[e])
							}
						}
					})
				}
		}

/*** build ***/
	/* buildChat */
		function buildChat(chat) {
			// data
				var id      = chat.id      || 0
				var author  = chat.name    || null
				var text    = chat.text    || ""
				var created = chat.created ? new Date(chat.created) : new Date()
					created = created.toLocaleString().split(",")[1]

			// content
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

			// structure
				var chatBlock = document.createElement("div")
					chatBlock.id = id
					chatBlock.className = "chat"
					chatBlock.appendChild(infoBlock)
					chatBlock.appendChild(textBlock)

			// append
				var chats = document.getElementById("chats-list")
					chats.appendChild(chatBlock)
					chats.scrollBy(0, 1000000)
		}
		
	/* buildEvent */
		function buildEvent(event) {
			// data
				var id   = event.id    || 0
				var type = event.type  || "story"
				var text = event.text  || "..."
				var time = event.time ? new Date(event.time) : new Date()
					time = time.toLocaleString().split(",")[1]

			// content
				var typeBlock = document.createElement("div")
					typeBlock.className = "event-type"
					typeBlock.appendChild(document.createTextNode(type))

				var timeBlock = document.createElement("div")
					timeBlock.className = "event-time"
					timeBlock.appendChild(document.createTextNode(time))

				var textBlock = document.createElement("div")
					textBlock.className = "event-text"
					textBlock.appendChild(document.createTextNode(text))

			// inputs
				var inputBlocks = []
				if (event.input == "text") {
					var inputBlock = document.createElement("input")
						inputBlock.className = "event-input"
						inputBlock.type = "text"
						inputBlock.placeholder = "your response"
						inputBlock.setAttribute("validation", event.options)
						inputBlock.addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } })

					var submitBlock = document.createElement("button")
						submitBlock.className = "event-button"
						submitBlock.value = "submit-text"
						submitBlock.innerHTML = "&#8682;"
						submitBlock.addEventListener("click", submitEvent)

					inputBlocks = [inputBlock, submitBlock]
				}
				else if (event.input == "select") {
					var labelBlock = document.createElement("optgroup")
						labelBlock.setAttribute("label", "select...")

					var selectBlock = document.createElement("select")
						selectBlock.className = "event-select"
						selectBlock.appendChild(labelBlock)

					for (var o in event.options) {
						var optionBlock = document.createElement("option")
							optionBlock.value = event.options[o]
							optionBlock.appendChild(document.createTextNode(event.options[o]))

						selectBlock.appendChild(optionBlock)
					}

					var submitBlock = document.createElement("button")
						submitBlock.className = "event-button"
						submitBlock.value = "submit-select"
						submitBlock.innerHTML = "&#8682;"
						submitBlock.addEventListener("click", submitEvent)

					inputBlocks = [selectBlock, submitBlock]
				}
				else if (event.input == "okay") {
					var okayBlock = document.createElement("button")
						okayBlock.className = "event-button"
						okayBlock.value = "okay"
						okayBlock.innerHTML = event.options
						okayBlock.addEventListener("click", submitEvent)

					inputBlocks = [okayBlock]
				}
				else if (event.input == "buttons") {
					var falseBlock = document.createElement("button")
						falseBlock.className = "event-button"
						falseBlock.value = false
						falseBlock.appendChild(document.createTextNode(event.options[0]))
						falseBlock.addEventListener("click", submitEvent)

					var trueBlock = document.createElement("button")
						trueBlock.className = "event-button"
						trueBlock.value = true
						trueBlock.appendChild(document.createTextNode(event.options[1]))
						trueBlock.addEventListener("click", submitEvent)

					inputBlocks = [falseBlock, trueBlock]
				}
				else if (event.input == "link") {
					var linkBlock = document.createElement("a")
						linkBlock.className = "event-link"
						linkBlock.href = event.options[0]
						linkBlock.appendChild(document.createTextNode(event.options[1]))

					inputBlocks = [linkBlock]
				}

			// structure
				var eventBlock = document.createElement("div")
					eventBlock.id = event.id
					eventBlock.className = "event " + event.type
					eventBlock.setAttribute("day", event.day)
					eventBlock.setAttribute("night", event.night)
					eventBlock.appendChild(typeBlock)
					eventBlock.appendChild(timeBlock)
					eventBlock.appendChild(textBlock)
					for (var i in inputBlocks) {
						eventBlock.appendChild(inputBlocks[i])
					}

			// append
				var events = document.getElementById("events-list")
					events.appendChild(eventBlock)
					events.scrollBy(0, 1000000)
		}

/*** dis/enable ***/
	/* disableEvent */
		function disableEvent(id) {
			var event   = document.getElementById(id)
			var inputs  = Array.prototype.slice.call(event.querySelectorAll("input[type='text']"))
			var selects = Array.prototype.slice.call(event.querySelectorAll("select"))
			var buttons = Array.prototype.slice.call(event.querySelectorAll("button"))

			if (event) {
				var array = []
				if (inputs)  { array = array.concat(inputs)  }
				if (selects) { array = array.concat(selects) }
				if (buttons) { array = array.concat(buttons) }

				for (var a in array) {
					array[a].disabled = true
				}
			}
		}

	/* enableEvent */
		function enableEvent(id) {
			var event   = document.getElementById(id)
			var inputs  = Array.prototype.slice.call(event.querySelectorAll("input[type='text']"))
			var selects = Array.prototype.slice.call(event.querySelectorAll("select"))
			var buttons = Array.prototype.slice.call(event.querySelectorAll("button"))

			if (event) {
				var array = []
				if (inputs)  { array = array.concat(inputs)  }
				if (selects) { array = array.concat(selects) }
				if (buttons) { array = array.concat(buttons) }

				for (var a in array) {
					array[a].disabled = false
				}
			}
		}

/*** fetch ***/
	window.fetchLoop = setInterval(fetchData, 5000)
	function fetchData() {
		// chats
			var chats = Array.prototype.slice.call(document.getElementsByClassName("chat"))

		// events
			var events = Array.prototype.slice.call(document.querySelectorAll(".event:not(.decision-waiting)"))
			if (events.length) {
				var event = events[events.length - 1].id || null
			}
			else {
				var event = null
			}

		sendPost({action: "fetchData", event: event}, function(data) {
			if (!data.success) {
				displayError(data.message || "unable to fetch data")
			}
			else {
				console.log(data)

				// new chats
					for (var c in data.chats) {
						buildChat(data.chats[c])
					}

				// new events
					for (var e in data.events) {
						console.log("--- BUILDING EVENT ---")
						buildEvent(data.events[e])
					}

				// activate notes
					if (data.start) {
						document.getElementById("notes").className = ""
					}

				// activate chat
					if ((data.start) && (["killer", "ghost", "telepath"].indexOf(data.role) !== -1)) {
						document.getElementById("chats").className = ""
					}

				// check for game end
					if (data.end) {
						clearInterval(fetchLoop)
						
						var pastEvents  = Array.prototype.slice.call(document.querySelectorAll(".event[day='" + (data.day - 1) + "']"))
						var todayEvents = Array.prototype.slice.call(document.querySelectorAll(".event[day='" +  data.day      + "']"))
						var oldEvents = pastEvents.concat(todayEvents)
						for (var o in oldEvents) {
							disableEvent(oldEvents[o])
						}
					}

				// disables
					else {
						if (!data.night) { // it is day --> get last night's events
							var oldEvents = Array.prototype.slice.call(document.querySelectorAll(".event[day='" + (data.day - 1) + "'][night='true']" ))
						}
						else { // it is night --> get this day's events
							var oldEvents = Array.prototype.slice.call(document.querySelectorAll(".event[day='" +  data.day      + "'][night='false']"))
						}

						for (var o in oldEvents) {
							disableEvent(oldEvents[o])
						}
					}
			}
		})
	}