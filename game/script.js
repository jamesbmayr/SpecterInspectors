/*** navigation ***/
	/* scrollToNewest */
		scrollToNewest("chats")
		scrollToNewest("events")
		function scrollToNewest(index) {
			if (index == "chats") {
				try {
					document.getElementById("chats-list").scrollBy(0, 1000000)
				}
				catch (error) {
					document.getElementById("chats-list").scrollTop = 1000000
				}
			}
			else if (index == "events") {
				try {
					document.getElementById("events-list").scrollBy(0, 1000000)
				}
				catch (error) {
					document.getElementById("events-list").scrollTop = 1000000
				}
			}
		}

	/* swipe */
		var touchX = null
		var touchY = null
		document.addEventListener("touchstart", startTouch, false);        
		document.addEventListener("touchmove", moveTouch, false);
		function startTouch(event) {
			touchX = Number(event.touches[0].clientX)
			touchY = Number(event.touches[0].clientY)
		}

		function moveTouch(event) {
			var notes = event.target.closest("#notes") || false
			var story = event.target.closest("#story") || false
			var chats = event.target.closest("#chats") || false
			var parent = notes ? notes : story ? story : chats ? chats : false

			if (touchX !== null && touchY !== null && parent) {
				var liftX = Number(event.touches[0].clientX)
				var liftY = Number(event.touches[0].clientY)

				var deltaX = touchX - liftX
				var deltaY = touchY - liftY

				if (Math.abs(deltaX) > Math.abs(deltaY)) { // left right
					if (deltaX < 0) { // swipe left-to-right
						if (parent.id == "story" || parent.id == "notes") {
							var button = Array.prototype.slice.call(document.querySelectorAll("#notes:not(.invisible) .slideContainer[value='right']"))[0]
							if (button) { button.click() }
						}
						else if (parent.id == "chats") {
							var button = Array.prototype.slice.call(document.querySelectorAll("#chats:not(.hidden) .slideContainer[value='right']"))[0]
							if (button) { button.click() }
						}
					}
					else if (deltaX > 0) { // swipe right-to-left
						if (parent.id == "story" || parent.id == "chats") {
							var button = Array.prototype.slice.call(document.querySelectorAll("#chats:not(.hidden) .slideContainer[value='left']"))[0]
							if (button) { button.click() }
						}
						else if (parent.id == "notes") {
							var button = Array.prototype.slice.call(document.querySelectorAll("#notes:not(.invisible) .slideContainer[value='left']"))[0]
							if (button) { button.click() }
						}
					}
				}
			
				touchX = touchY = null
			}
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
						displayError(data.message || "Unable to submit notes...")
					}
					else {
						savedNotes = data.notes
						notes.value = data.notes
						displayError("Notes saved!")
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
				displayError("Enter a chat message to send.")
			}
			else if (sanitizeString(input.value).length !== input.value.length) {
				displayError("Use regular characters only.")
			}
			else {
				var text  = sanitizeString(input.value)

				sendPost({action: "submitChat", text: text}, function(data) {
					if (!data.success) {
						displayError(data.message || "Unable to post message...")
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
		var inputs  = Array.prototype.slice.call(document.getElementsByClassName("event-input"))
		for (var i in inputs)  {  inputs[i].addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } }) }
		var selects = Array.prototype.slice.call(document.getElementsByClassName("event-select"))
		for (var s in selects) { selects[s].addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } }) }
		
		function submitEvent(event) {
			var container = event.target.closest(".event")
			var id = container.id

			// inputs
				if (event.target.className.indexOf("event-input") !== -1) {
					var input = event.target
					var button = Array.prototype.slice.call(container.querySelectorAll("button"))[0]

					if (!input.value || input.value.length == 0) {
						displayError("Enter a response first!")
					}
					else if (sanitizeString(input.value).length !== input.value.length) {
						displayError("Use regular characters only.")
					}
					else {
						var value = sanitizeString(input.value)
						button.setAttribute("selected",true)
						input.setAttribute("selected",true)
					}
				}
				else if ((event.target.className.indexOf("event-button") !== -1) && (event.target.value == "submit-text")) {
					var input = Array.prototype.slice.call(container.querySelectorAll("input[type='text']"))[0]
					var button = event.target
					
					if (!input.value || input.value.length == 0) {
						displayError("Enter a response first!")
					}
					else if (sanitizeString(input.value).length !== input.value.length) {
						displayError("Use regular characters only.")
					}
					else {
						var value = sanitizeString(input.value)
						button.setAttribute("selected",true)
						input.setAttribute("selected",true)
					}
				}
				else if (event.target.className.indexOf("event-select") !== -1) {
					var select = event.target
					var button = Array.prototype.slice.call(container.querySelectorAll("button"))[0]

					var value = select.value
					button.setAttribute("selected",true)
					select.setAttribute("selected",true)
				}
				else if ((event.target.className.indexOf("event-button") !== -1) && (event.target.value == "submit-select")) {
					var button = event.target
					var select = Array.prototype.slice.call(container.querySelectorAll("select"))[0]

					var value = select.value
					button.setAttribute("selected",true)
					select.setAttribute("selected",true)
				}
				else if ((event.target.className.indexOf("event-button") !== -1) && (event.target.value == "okay" || Number(event.target.value) == 1 || Number(event.target.value) == 0)) {
					var buttons = Array.prototype.slice.call(container.querySelectorAll("button"))

					var value = event.target.value

					for (var b in buttons) {
						if ((buttons[b].value == value) || (Number(buttons[b].value) == Number(value))) {
							buttons[b].setAttribute("selected",true)
						}
					}
				}	

			// send
				if (typeof value !== "undefined" && value !== null) {
					disableEvent(id)

					sendPost({action: "submitEvent", value: value, id: id}, function(data) {
						if (!data.success) {
							displayError(data.message || "Unable to submit event response...")
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
			var existing = document.getElementById(chat.id)
			if (!existing) {
				
				// data
					var author = chat.name    || null
					var text   = chat.text    || ""
					var time = new Date(chat.created).toLocaleString()
						time = (time.split(" at ")[1] ? time.split(" at ")[1].split(" ")[0] : time.split(" ")[1])

				// content
					var authorBlock = document.createElement("div")
						authorBlock.className = "chat-author"
						authorBlock.appendChild(document.createTextNode(author))

					var timeBlock = document.createElement("div")
						timeBlock.className = "chat-time"
						timeBlock.appendChild(document.createTextNode(time))

					var infoBlock = document.createElement("div")
						infoBlock.className = "chat-info"
						infoBlock.appendChild(authorBlock)
						infoBlock.appendChild(timeBlock)

					var textBlock = document.createElement("div")
						textBlock.className = "chat-text"
						textBlock.appendChild(document.createTextNode(text))

				// structure
					var chatBlock = document.createElement("div")
						chatBlock.id = chat.id
						chatBlock.className = "chat"
						chatBlock.style.opacity = 0
						chatBlock.appendChild(infoBlock)
						chatBlock.appendChild(textBlock)

				// append
					var chats = document.getElementById("chats-list")
						chats.appendChild(chatBlock)
						scrollToNewest("chats")

				// fade in
					var chatFadein = setInterval(function() { // fade in
						var opacity = Number(chatBlock.style.opacity)

						if (opacity < 1) {
							chatBlock.style.opacity = ((opacity * 100) + 5) / 100
						}
						else {
							clearInterval(chatFadein)
						}
					}, 100)
			}
		}
		
	/* buildEvent */
		function buildEvent(event) {
			var existing = document.getElementById(event.id)
			if (!existing) {

				// data
					var type = event.type  || "story"
					var text = event.text  || ""
					var time = new Date(event.created).toLocaleString()
						time = (time.split(" at ")[1] ? time.split(" at ")[1].split(" ")[0] : time.split(" ")[1])

				// content
					var typeBlock = document.createElement("div")
						typeBlock.className = "event-type"
						typeBlock.appendChild(document.createTextNode(type))

					var timeBlock = document.createElement("div")
						timeBlock.className = "event-time"
						timeBlock.appendChild(document.createTextNode(time))

					var textBlock = document.createElement("div")
						textBlock.className = "event-text"
						textBlock.innerHTML = text

				// inputs
					var inputBlocks = []
					if (event.input == "text") {
						var inputBlock = document.createElement("input")
							inputBlock.className = "event-input"
							inputBlock.type = "text"
							inputBlock.placeholder = "your response"
							inputBlock.setAttribute("autocomplete", "off")
							inputBlock.setAttribute("autocorrect", "off")
							inputBlock.setAttribute("autocapitalize", "off")
							inputBlock.setAttribute("spellcheck", "false")
							inputBlock.addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } })

						var submitBlock = document.createElement("button")
							submitBlock.className = "event-button"
							submitBlock.value = "submit-text"
							submitBlock.innerHTML = "&#8595;"
							submitBlock.addEventListener("click", submitEvent)

						inputBlocks = [inputBlock, submitBlock]
					}
					else if (event.input == "select") {
						var labelBlock = document.createElement("optgroup")
							labelBlock.setAttribute("label", "select...")

						var selectBlock = document.createElement("select")
							selectBlock.className = "event-select"
							selectBlock.appendChild(labelBlock)
							selectBlock.addEventListener("keyup", function (event) { if (event.which == 13) { submitEvent(event) } })

						for (var o = 0; o < event.options.length; o++) {
							var optionBlock = document.createElement("option")
								optionBlock.value = event.options[o]
								optionBlock.appendChild(document.createTextNode(event.names ? event.names[o] : event.options[o]))

							selectBlock.appendChild(optionBlock)
						}

						var submitBlock = document.createElement("button")
							submitBlock.className = "event-button"
							submitBlock.value = "submit-select"
							submitBlock.innerHTML = "&#8595;"
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
							falseBlock.value = 0
							falseBlock.appendChild(document.createTextNode(event.options[0]))
							falseBlock.addEventListener("click", submitEvent)

						var trueBlock = document.createElement("button")
							trueBlock.className = "event-button"
							trueBlock.value = 1
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
						eventBlock.className = "event " + type
						eventBlock.style.opacity = 0
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
					if (["start-role", "start-players", "start-notes"].indexOf(type) == -1) {
						scrollToNewest("events")
					}

				// fade in
					var eventFadein = setInterval(function() { // fade in
						var opacity = Number(eventBlock.style.opacity)

						if (opacity < 1) {
							eventBlock.style.opacity = ((opacity * 100) + 5) / 100
						}
						else {
							clearInterval(eventFadein)
						}
					}, 100)

				// special events
					// animate on setup, start, execution & murder, end
						if (["setup-name", "start-story", "story-execution", "story-murder", "end-good", "end-evil"].indexOf(type) !== -1) {
							buildGhosts(5, false)
						}
						
					// switch chats on ghost
						if (type == "story-ghost") {
							document.getElementById("chats-list").innerHTML = ""
							document.getElementById("chats").className = ""
						}

					// disable launch on launch
						if (type == "start-story") {
							var launch = Array.prototype.slice.call(document.getElementsByClassName("start-launch"))[0]
							if (launch) { disableEvent(launch.id) }
						}

					// disable nominations on execution
						if (type == "story-execution") {
							var nominations = Array.prototype.slice.call(document.getElementsByClassName("execution-nomination"))
							var polls = Array.prototype.slice.call(document.getElementsByClassName("execution-poll"))
							var array = nominations.concat(polls)
							for (var a in array) {
								disableEvent(array[a].id)
							}
						}

					// disable nominations on murder
						if (type == "murder-complete") {
							var nominations = Array.prototype.slice.call(document.getElementsByClassName("murder-nomination"))
							var polls = Array.prototype.slice.call(document.getElementsByClassName("murder-poll"))
							var array = nominations.concat(polls)
							for (var a in array) {
								disableEvent(array[a].id)
							}
						}

					// move triggers on decision-complete, execution-complete, murder-complete, and dream-complete
						if (["decision-complete", "execution-complete", "murder-complete", "dream-complete"].indexOf(type) !== -1) {
							var triggers = Array.prototype.slice.call(document.getElementsByClassName("trigger-sleep:last-child, trigger-wake:last-child"))
							var trigger = triggers[triggers.length - 1]
							console.log(trigger)
						}
			}
		}

/*** dis/enable ***/
	/* disableEvent */
		function disableEvent(id) {
			var event = document.getElementById(id)

			if (event) {
				event.setAttribute("disabled",true)
				
				var inputs  = Array.prototype.slice.call(event.querySelectorAll("input[type='text']"))
				var selects = Array.prototype.slice.call(event.querySelectorAll("select"))
				var buttons = Array.prototype.slice.call(event.querySelectorAll("button"))

				var array = []
				if (inputs)  { array = array.concat(inputs)  }
				if (selects) { array = array.concat(selects) }
				if (buttons) { array = array.concat(buttons) }

				for (var a in array) {
					array[a].setAttribute("disabled",true)
				}
			}
		}

	/* enableEvent */
		function enableEvent(id) {
			var event   = document.getElementById(id)

			if (event) {
				event.setAttribute("disabled",false)
				event.disabled = false
				
				var inputs  = Array.prototype.slice.call(event.querySelectorAll("input[type='text']"))
				var selects = Array.prototype.slice.call(event.querySelectorAll("select"))
				var buttons = Array.prototype.slice.call(event.querySelectorAll("button"))

				var array = []
				if (inputs)  { array = array.concat(inputs)  }
				if (selects) { array = array.concat(selects) }
				if (buttons) { array = array.concat(buttons) }

				for (var a in array) {
					array[a].setAttribute("disabled",false)
					array[a].setAttribute("selected",false)
					array[a].disabled = false
					array[a].selected = false
				}
			}
		}

/*** fetch ***/
	/* onload */
		localizeTimes()
		function localizeTimes() {
			var timestamps = Array.prototype.slice.call(document.querySelectorAll(".event-time, .chat-time"))
			for (var t in timestamps) {
				var time = new Date(Number(timestamps[t].textContent)).toLocaleString()
					time = (time.split(" at ")[1] ? time.split(" at ")[1].split(" ")[0] : time.split(" ")[1])
				timestamps[t].textContent = time
			}
		}

	/* fetchData */
		fetchLoop = setInterval(fetchData, 5000)
		if (typeof window.clearLoop !== "undefined" && window.clearLoop !== null && window.clearLoop) { clearInterval(fetchLoop) }
		function fetchData() {
			// chats
				var chats = Array.prototype.slice.call(document.getElementsByClassName("chat"))
				if (chats.length) {
					var chat = chats[chats.length - 1].id || null
				}
				else {
					var chat = null
				}

			// events
				var events = Array.prototype.slice.call(document.querySelectorAll(".event:not(.decision-waiting)"))
				if (events.length) {
					var event = events[events.length - 1].id || null
				}
				else {
					var event = null
				}

			sendPost({action: "fetchData", event: event, chat: chat}, function(data) {
				if (!data.success) {
					displayError(data.message || "Unable to fetch data...")
				}
				else {
					// new events
						for (var e in data.events) {
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

					// new chats
						for (var c in data.chats) {
							buildChat(data.chats[c])
						}

					// check for game end
						if (data.end) {
							clearInterval(fetchLoop)
							
							var pastEvents  = Array.prototype.slice.call(document.querySelectorAll(".event[day='" + (data.day - 1) + "']"))
							var todayEvents = Array.prototype.slice.call(document.querySelectorAll(".event[day='" +  data.day      + "']"))
							var oldEvents = pastEvents.concat(todayEvents)
							for (var o in oldEvents) {
								disableEvent(oldEvents[o].id)
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
								disableEvent(oldEvents[o].id)
							}
						}
				}
			})
		}
