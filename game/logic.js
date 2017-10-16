/*** modules ***/
	var main = require("../main/logic")
	module.exports = {}

/*** submits ***/
	/* submitChat */
		module.exports.submitChat = submitChat
		function submitChat(request, callback) {
			if (!request.post || !request.post.text) {
				callback({success: false, message: "no message submitted"})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "game not found"})
					}
					else {
						request.game = games[0]
						var player = request.game.players[request.session.id]

						if (!player) {
							callback({success: false, message: "not a player of this game"})
						}
						else if (["killer", "ghost", "telepath"].indexOf(player.status.role) == -1) {
							callback({success: false, message: "not a member of any chats"})
						}
						else {
							var chat = {
								id: main.generateRandom(),
								created: new Date().getTime(),
								author: player.id,
								text: main.sanitizeString(request.post.text) || ""
							}

							var push = {}
								push["chats." + player.status.role] = chat
							var set = {}
								set.updated = new Date().getTime()

							main.storeData("games", {id: request.game.id}, {$push: push, $set: set}, {}, function (game) {
								callback({success: true, chat: chat})
							})
						}
					}
				})
			}
		}

	/* submitNotes */
		module.exports.submitNotes = submitNotes
		function submitNotes(request, callback) {
			if (!request.post) {
				callback({success: false, message: "no notes submitted"})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "game not found"})
					}
					else {
						request.game = games[0]
						var player = request.game.players[request.session.id]

						if (!player) {
							callback({success: false, message: "not a player of this game"})
						}
						else {
							var notes = main.sanitizeString(request.post.notes) || ""

							var set = {}
								set["players." + request.session.id + ".notes"] = notes
								set.updated = new Date().getTime()

							main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (game) {
								callback({success: true, notes: notes})
							})
						}
					}
				})
			}
		}

	/* submitEvent */
		module.exports.submitEvent = submitEvent
		function submitEvent(request, callback) {
			if (!request.post) {
				callback({success: false, message: "no data submitted"})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "game not found"})
					}
					else {
						request.game = games[0]

						var event = request.game.events.find(function (e) {
							return (e.id == request.post.id)
						})

						if (!event) {
							callback({success: false, message: "event not found"})
						}
						else if (event.doers.indexOf(request.session.id) == -1) {
							callback({success: false, message: "player not on this event"})
						}
						else {
							var set = {}
								set.updated = new Date().getTime()
								set["events.$.doers"]  = event.doers  = []
								set["events.$.answer"] = event.answer = request.post.value

							main.storeData("games", {id: request.game.id, "events.id": event.id}, {$set: set}, {}, function (game) {
								request.game  = game
								request.event = event
								
								eval(event.next)
								if (!next || typeof next !== "function") {
									callback({success: true, message: "unable to trigger next"})
								}
								else {
									next(request, callback)
								}
							})
						}

					}
				})
			}
		}

/*** events ***/
	/* pushEvents */
		module.exports.pushEvents = pushEvents
		function pushEvents(request, array, callback) {
			var events = []
			for (var a in array) {
				events.push(createEvent(request, array[a]))
			}

			if (!events.length) {
				callback({success: false, message: "Unable to create event."})
			}
			else {
				var each = events
				var set  = {}
					set.updated = new Date().getTime()

				main.storeData("games", {id: request.game.id}, {$set: set, $push: {events: {$each: each}}}, {}, function (game) {
					if (!game) {
						callback({success: false, message: "Unable to find game."})
					}
					else {
						callback({success: true, events: events})
					}
				})
			}
		}

	/* createEvent */
		module.exports.createEvent = createEvent
		function createEvent(request, data) {

			// info by type
				switch (data.type) {
					// setup
						case "setup-welcome":
							var event = {
								text: main.chooseRandom(["Welcome to Specter Inspectors: the game of ghosts and guesses!", "The game is afoot!", "Boo!", "Here we go!", "Testing, testing, 1, 2, check.", "Hey! How's it going?", "Are you ready for some Specter Inspectors? I know I am.", "I suspect you're expecting Specter Inspectors to connect... You suspect correctly.", "I don't know about you, but I'm very excited for this game.", "SPECTER INSPECTORS will now commence..."]),
								input: "okay",
								options: "Let's play!",
								next: 'function next (request, callback) {\
									setupPlayer(request, function() {\
										pushEvents(request, [{type: "setup-name", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "setup-name":
							var event = {
								text: main.chooseRandom(["What's your name?", "Can we get a name for you?", "So, who exactly is playing, here?", "Let us begin. Who are you?", "We're gonna get started - first, we'll need a name."]),
								input: "text",
								options: null,
								next: 'function next (request, callback) {\
									setupPlayer(request, function() {\
										pushEvents(request, [{type: "setup-shirt", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "setup-shirt":
							var event = {
								text: main.chooseRandom(["In this game, we're gonna need to know what color shirt you're wearing.", "And can I ask what color shirt you've got on?", "This might be a weird question, but, uh... what color is your shirt?", "All right. Can you tell me what color shirt you've got?", "Next thing, believe it or not, is your shirt color."]),
								input: "select",
								options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"],
								next: 'function next (request, callback) {\
									setupPlayer(request, function() {\
										pushEvents(request, [{type: "setup-pants", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "setup-pants":
							var event = {
								text: main.chooseRandom(["We'll also need to know your pants color.", "And what about your pants?", "Trust me, this is important: what color are your pants?", "Great. And can you tell me what color pants you've got?", "Now I'm gonna need to get the color of your pants."]),
								input: "select",
								options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"],
								next: 'function next (request, callback) {\
									setupPlayer(request, function() {\
										pushEvents(request, [{type: "setup-shoes", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "setup-shoes":
							var event = {
								text: main.chooseRandom(["Last one, I promise: what color shoes do you have on?", "And your shoes - what color are they?", "What about those shoes?", "Thanks! Now I just need to know about your shoes.", "And to finish up: shoes?"]),
								input: "select",
								options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"],
								next: 'function next (request, callback) {\
									setupPlayer(request, function() {\
										checkQueue(request, {from: "' + data.type + '", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
											pushEvents(request, [{type: "setup-launch", viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players)}], callback)\
										}\'}, callback)\
									})\
								}'
							}
						break

						case "setup-launch":
							var event = {
								text: main.chooseRandom(["Is everybody ready to go?", "Shall we launch the game?", "Is everyone in?", "Are all players accounted for?", "Everybody good to go?", "Can we get this thing going?", "Ready to play?", "Let me know when the rest of them are ready.", "Ready to launch Specter Inspectors, at your command...", "Anyone else we're waiting on?"]),
								input: "okay",
								options: "launch game",
								next: 'function next (request, callback) {\
									assignRoles(request, callback)\
								}'
							}
						break

					// start
						case "start-inciting":
							var event = {
								text: "Our story begins... You and your friends have gathered together, but as it turns out, some of you are murderers. That's right - your good friend " + main.chooseRandom(["Petey McPeterson", "Gregorio the Great", "Archduke Ferdinand", "Princess Pomegranate", "Carol from HR", "Millie Miles", "Sam Pats", "Shmorko Jr.", "Anabel Lee", "Santa Claus", "Dudebro", "Vanessa Vines", "Robotron-9000", "Professor Z", "Dr. Rogers", "Gertrude Glarkenstein", "Li'l Bigs", "Mrs. Brinkley", "Paul"]) + " is dead. Now you have to figure out who the killers are... before they get you too!",
								input: null,
								options: null
							}
						break

						case "start-role":
							var event = {
								text: "In this game, your role will be a " + request.game.players[request.session.id].role + ". What does that mean? " + getRoleDescription(request.game.players[request.session.id].role),
								input: "okay",
								options: "got it",
								next: 'function next (request, callback) {\
									checkQueue(request, {from: "' + data.type + '", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
										createDay(request, callback)\
									}\'}, callback)\
								}'
							}
						break

					// story
						case "story-day":
							var event = {
								text: main.chooseRandom(["The sun is rising over the hills.", "A new dawn rises.", "It's the start of a brand new day.", "The next day has begun.", "Goooooood morning!", "The story continues with a new day.", "Day phase, activated.", "The next day has commenced.", "Let us begin a new day.", "Here we go: another day."]),
								input: null,
								options: null
							}
						break

						case "story-dream":
							var event = {
								text: main.chooseRandom(["You had the strangest dream last night - something about " + data.color + " " + data.item + "?", "That was definitely a bizarre dream - " + data.color + " " + data.item + "...", "Well, dreams don't get more interesting than " + data.color + " " + data.item + ", right?", "What a dream! You can still see it clearly: " + data.color + " " + data.item + ".", "No, no! Not the " + data.color + " " + data.item + "! Oh... it was only a dream.", "Are these dreams, or visions? All you know is you can't get " + data.color + " " + data.item + " out of your head.", "What a nightmare! Just " + data.color + " " + data.item + " everywhere!", "And that dream about " + data.color + " " + data.item + " was pretty interesting, to say the least.", "You begin to wonder if anyone else dreams about " + data.color + " " + data.item + ".", "Wow, what a restless night, constantly interrupted by visions of " + data.color + " " + data.item + "!", "You suspect there's something up with " + data.color + " " + data.item + " after those thoughts dancing in your mind all of last night."]),
								input: null,
								options: null
							}
						break

						case "story-murder":
							var event = {
								text: main.chooseRandom(["It's a murder! " + data.name + " is dead!", "You awake to find " + data.name + " is no longer with us.", "It seems that " + data.name + " was killed in the middle of the night.", "Oh no! " + data.name + " is dead!", "Sadly, " + data.name + " has passed on from this world.", "And the next ghost is: " + data.name + ".", "Well, can't say we didn't see this coming. " + data.name + " is dead.", "They got another one! " + data.name + " has been murdered!"]),
								input: null,
								options: null
							}
						break

						case "story-safe":
							var event = {
								text: main.chooseRandom(["No one died last night! But still... what about those other murders?", "Seems like the murderers didn't do much last night. But they're out there.", "Thankfully, it was a quiet night. But there's still a killer on the loose.", "Somehow, nobody died. That's the good news. The bad news? The murderer didn't die either.", "Maybe the killers are on vacation? Well, they'll be back eventually.", "It seems fate has spared your friends. But one or more of them could still be a killer.", "We know there's a murderer (or two or three...) still alive, even if nobody was slaughtered in their sleep.", "Just because nobody died doesn't mean nobody tried.", "Maybe the murderers are just biding their time, building up a false sense of security before they strike again. And when they do...", "What a relief! Everybody's still here! Except... someone did commit those killings before..."]),
								input: null,
								options: null
							}
						break

						case "story-ghost":
							var event = {
								text: main.chooseRandom(["Well... these things happen, sometimes. Welcome to the afterlife. On the bright side - now you can chat with other ghosts.", "Not sure how to break it to you... but uh... you're a ghost now. At least there's the ghost chat!", "You have shed your mortal skin and ascended into a higher plane of existence - complete with a new chat room!", "This is phase 2: ghost time. Check out the ghost chat!", "Sorry about your death and everything - but try the new ghost chat!", "Whelp, you're dead. But you're not done playing - get in on the ghost chat!"]),
								input: null,
								options: null
							}
						break

						case "story-decision":
							var event = {
								text: main.chooseRandom(["The decision is " + data.pro + " for, " + data.anti + " against.", "Yea: " + data.pro + ". Nay: " + data.anti + ".", data.pro + " said yes, " + data.anti + " said no.", "The results: " + data.pro + " think yes, " + data.anti + " think no.", "How many for? " + data.pro + ". How many against? " + data.anti + ".", "All those in favor: " + data.pro + ". All those opposed: " + data.anti + "."]),
								input: null,
								options: null
							}
						break

						case "story-execution":
							var event = {
								text: main.chooseRandom(["The people have spoken! " + data.name + " is found guilty!", "Off with their head! " + data.name + " is done.", "Well, " + data.name + ", it seems your fate is sealed.", "That's that. " + data.name + " shall be executed!", "The group agrees: " + data.name + " should be sentenced to death.", "Sorry, " + data.name + ", but your time has come.", "Well, can't say we didn't see this coming. " + data.name + " is executed by the group.", "So we agree, then? " + data.name + " shall die!"]),
								input: null,
								options: null
							}
						break

						case "story-night":
							var event = {
								text: main.chooseRandom(["And the sun sets on that day... night time!", "Here comes the night.", "Darkness falls.", "A new night begins.", "As light fades from the sky, the night is upon us.", "Thus begins another night.", "The night is now.", "And now? Night.", "What's next? Oh, right... night time.", "Here we go with another night."]),
								input: null,
								options: null
							}
						break

					// triggers
						case "story-sleep":
							var event = {
								text: "",
								input: "okay",
								options: "go to sleep",
								next: 'function next (request, callback) {\
									checkQueue(request, {from: "story-day", author: 0, target: 0, viewers: Object.keys(request.game.players).filter(function(p) { return request.game.players[p].alive }), doers: Object.keys(request.game.players).filter(function(p) { return request.game.players[p].alive }), next: \'function next (request, callback) {\
										createNight(request, callback)\
									}\'}, callback)\
								}'
							}
						break

						case "story-wake":
							var event = {
								text: "",
								input: "okay",
								options: "end the night",
								next: 'function next (request, callback) {\
									checkQueue(request, {from: "story-night", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
										createDay(request, callback)\
									}\'}, callback)\
								}'
							}
						break

					// end
						case "end-good":
							var event = {
								text: main.chooseRandom(["And with that, the good guys win!", "The winners are... the good guys!", "Congratulations, Team Good - you did it!", "And for once, the murderers don't get away with it!", "That's a wrap! Great job, not-evil people!", "Victory goes to the good ones!"]),
								input: "link",
								options: ["../../", "play again"],
							}
						break

						case "end-evil":
							var event = {
								text: main.chooseRandom(["And that's the game. Well done, you villanous scum!", "Game over - better luck next time, good team.", "The murderers emerge victorious.", "It just wasn't enough - you can't stop these killers!", "The bad guys are victorious! Thanks for playing!", "And that's another win for evil."]),
								input: "link",
								options: ["../../", "play again"],
							}
						break

					// execution
						case "execution-nomination":
							var event = {
								text: main.chooseRandom(["Who do you want to point the finger at?", "Who dunnit?", "Who is the killer?", "Who do you blame?", "Somebody's gotta pay for this. But who?", "Who is responsible for this atrocity?", "Someone did it - but who?", "Who should we execute?", "One of us is the killer... but which one of us?", "Who deserves to be executed?"]),
								input: "select",
								options: data.options,
								next: 'function next (request, callback) {\
									pushEvents(request, [{type: "execution-poll", author: request.session.id, target: request.post.value, viewers: Object.keys(request.game.players), doers: ["' + data.options.concat([request.session.id]).join('","') + '"].filter(function (p) { return p.id !== request.post.value }) }], callback)\
								}'
							}
						break

						case "execution-poll":
							var event = {
								text: main.chooseRandom(["An accusation has been made! " + data.author + " blames " + data.target + "; do you agree?", "What's this? " + data.author + " is pointing the finger at " + data.target + "! What do you think?", "Looks like " + data.author + " thinks " + data.target + " is to blame - do you concur?", "Well, " + data.author + " has accused " + data.target + ". Shall we commence the execution?", "Accusation! " + data.author + " accuses " + data.target + " of murder! What say you?"]),
								input: "buttons",
								options: ["not guilty", "guilty"],
								next: 'function(request, callback) {\
									checkQueue(request, {from: "' + data.type + '", author: "' + data.author + '", target: "' + data.target + '", viewers: Object.keys(request.game.players), doers: ["' + data.options.concat([request.session.id]).join('","') + '"], next: \'function next (request, callback) {\
										executePlayer(request, callback)\
									}\'}, callback)\
								}'
							}
						break

					// murder
						case "murder-nomination":
							var event = {
								text: main.chooseRandom(["Who do you want to kill tonight?", "Whose turn is it to die?", "Who should we murder?", "Who do you want to off tonight?", "Somebody's gonna die... but who?", "Who is the next victim?", "Someone has seconds to live - but who?", "Who should we do away with?", "One of these people is a murder victim... but which?", "Who deserves to be executed?"]),
								input: "select",
								options: data.options,
								next: 'function next (request, callback) {\
									pushEvents(request, [{type: "murder-poll", author: request.session.id, target: request.post.value, viewers: ' + data.viewers + ', doers: ' + data.viewers + '}], callback)\
								}'
							}
						break

						case "murder-poll":
							var event = {
								text: main.chooseRandom([info.data[0] + " has nominated " + info.data[1] + " to die - what's your take?", "It would appear " + info.data[0] + " is ready to murder " + info.data[1] + "... are you?", "Now " + info.data[0] + " wants to kill " + info.data[1] + ". Do you?", "Do you agree with " + info.data[0] + " in murdering " + info.data[1] + "?", "Should we listen to " + info.data[0] + " and kill off " + info.data[1] + "?"]),
								input: "buttons",
								options: ["don't murder", "murder"],
								next: 'function next (request, callback) {\
									checkQueue(request, {from: "' + data.type + '", author: "' + data.author + '", target: "' + data.target + '", viewers: ' + data.viewers + ', doers: ' + data.viewers + ', next: \'function next () {\
										murderPlayer(request, function() {\
											checkQueue(request, {from: "story-night", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
												createDay(request, callback)\
											}\'}, callback)\
										}, callback)\
									}\'}, callback)\
								}'
							}
						break

					// dream
						case "dream-name":
							var event = {
								text: main.chooseRandom(["Who do you want to give a dream to tonight?", "Whose turn is it to dream?", "Who should have a dream now?", "Who do you want to send a dream to?", "Somebody's gonna dream... but who?", "Who is the next dreamer?", "Someone is about to have a dream - but who?", "Whose perfect night of sleep should we interrupt?", "One of these people is about to have a strange dream - but which one?", "Who needs to get this dream?"]),
								input: "select",
								options: options,
								next: 'function next (request, callback) {\
									setupDream(request, function() {\
										pushEvents(request, [{type: "dream-item", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "dream-item":
							var event = {
								text: main.chooseRandom(["And what should they dream about?", "What's the dream gonna be about?", "What's the focus of this dream?", "What does this dream involve?", "What should the dream include?", "Next, pick an article of clothing:", "Select the relevant item:", "What's the core component of this dream?", "And what do they see in this dream?", "Pick a piece of clothing..."]),
								input: "select",
								options: ["shirt", "pants", "shoes"],
								next: 'function next (request, callback) {\
									setupDream(request, function() {\
										pushEvents(request, [{type: "dream-color", viewers: [request.session.id], doers: [request.session.id]}], callback)\
									})\
								}'
							}
						break

						case "dream-color":
							var event = {
								text: main.chooseRandom(["And what color?", "What color is that?", "Pick a hue:", "Let's determine the color:", "Let's make this more colorful:", "Finally, the color:", "Color it in!", "Send them a hue too...", "Select the right color:", "Let's add a little detail:"]),
								input: "select",
								options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"],
								next: 'function next (request, callback) {\
									setupDream(request, function() {\
										checkQueue(request, {from: "story-night", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
											createDay(request, callback)\
										}\'}, callback)\
									})\
								}'
							}
						break

					// specials

					// random
						case "random-why":
							var event = {
								text: main.chooseRandom(["To ensure other players don't know who you are, we ask you pointless questions.", "This is just so no one knows your role.", "To make it so no one know's who's who, we have to make you click random buttons.", "This next part is so nobody can figure out your role.", "This data's not going anywhere - it's just so other players don't know what your role is.", "It's important that you look like you're doing something, even if you're not.", "Gotta make sure nobody knows your role.", "We have to keep up the ruse that you could be any player.", "Just to make sure nobody knows what role you have..."]),
								input: null,
								options: null
							}
						break

						case "random-select":
							var event = {
								text: main.chooseRandom(["While you're waiting, what's your favorite?", "What's the best?", "Also, we're doing a survey:", "If you had to choose one (and you do), what would you choose?", "So...", "Take your time deciding:", "Which of these is the good one?", "So many options, so little significance:", "What's the worst?"]),
								input: "select",
								options: main.chooseRandom([["red","orange","yellow","green","blue","purple","brown","white","gray","black"], ["shirt", "pants", "shoes"], options, ["earth", "wind", "fire", "water"], ["spring", "summer", "autumn", "winter"], ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], [0,1,2,3,4,5,6,7,8,9], ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"], ["north", "east", "west", "south"], ["up", "right", "left", "down"], ["rock", "paper", "scissors"], ["africa", "antarctica", "asia", "australia", "europe", "north america", "south america"]]),
								next: 'function next (request, callback) {\
									pushEvents(request, [{type: "random-text", viewers: [request.session.id], doers: [request.session.id]}], callback)\
								}'
							}
						break

						case "random-text":
							var event = {
								text: main.chooseRandom(["Type any word you want:", "Go ahead and type a word.", "What's a word you particularly enjoy?", "So, tell me what you had for breakfast.", "What's the farthest you've ever been from home?", "Name a country. Any country.", "What's the best flavor of ice cream?", "If you could be anything, what would it be?", "What's your favorite type of cloud?", "Enter a number. Any number.", "Type your favorite letter.", "Time to button mash. (Letters and numbers only.)"]),
								input: "text",
								options: null,
								next: 'function next (request, callback) {\
									pushEvents(request, [{type: "random-buttons", viewers: [request.session.id], doers: [request.session.id]}], callback)\
								}'
							}
						break

						case "random-buttons":
							var event = {
								text: main.chooseRandom(["While you're waiting, which is better?", "So uh... click a random button.", "The eternal dilemma...", "What do you like better?", "Which do you prefer?", "Left or right?", "Quick question:", "Just doing a survey here..."]),
								input: "buttons",
								options: main.chooseRandom([["no", "yes"], ["cats", "dogs"], ["left", "right"], ["0", "1"], ["a", "z"], ["circles", "squares"], ["ghosts", "ghouls"], ["detectives", "inspectors"], ["mystery", "horror"], ["chocolate", "vanilla"], ["cookies", "cake"], ["rock-n-roll", "classical"], ["night", "day"], ["ocean", "mountains"], ["urban", "rural"], ["music", "science"], ["buttons", "dropdowns"], ["light", "dark"], ["rain", "sun"], ["scifi", "fantasy"]]),
								next: 'function next (request, callback) {\
									checkQueue(request, {from: "story-night", author: 0, target: 0, viewers: Object.keys(request.game.players), doers: Object.keys(request.game.players), next: \'function next (request, callback) {\
										createDay(request, callback)\
									}\'}, callback)\
								}'
							}
						break

					// others
						case "queue":
							var event = {
								text: main.chooseRandom(["Great. Nothing to do now but wait for everybody else.", "All right, hold tight while we wait for your friends.", "Cool - just waiting on some other responses now.", "Awesome! Now we're just waiting on everyone else.", "Aaaaand now we wait for the others.", "Waiting for others...", "Please wait for other players.", "Hold please - other players aren't ready yet.", "Kick back and relax - other people aren't caught up yet.", "Waiting for the rest of them.", "Okay, other people are still taking actions..."]),
								input: null,
								options: null,
								from: data.from,
								author: data.author || 0,
								target: data.target || 0,
								pro: data.pro,
								anti: data.anti,
								next: data.next
							}
						break

						case "error":
							var event = {
								text: main.chooseRandom(["Uh-oh!", "Hm... something went wrong...", "That's an error:", "Wait a second...", "Nope, that's not gonna work."]) + " " + info.data,
								input: null,
								options: null
							}
						break

						default:
							var event = {
								text: "...",
								input: null,
								options: null
							}
						break
				}

			// build event
				event.id      = main.generateRandom()
				event.day     = request.game.state.day || 0
				event.created = new Date().getTime()
				event.updated = new Date().getTime()
				event.type    = data.type    || "error"
				event.viewers = data.viewers || [request.session.id]
				event.doers   = data.doers   || [request.session.id]

				if (event.next) {
					event.next = event.next.replace(/\t+/gi," ").trim()
				}

			return event
		}

/*** actions ***/
	/* getRoleDescription */
		module.exports.getRoleDescription = getRoleDescription
		function getRoleDescription(role) {
			switch (role) {
				case "killer":
					return "Your goal is to kill off enough regular people that there are just as many murderers as good guys. To make things a little easier, you and your fellow killers can chat in the chat tab."
				break

				case "telepath":
					return "You want to get out of here alive, just like everyone else - and that means figuring out who the killers are. Luckily, you and the other telepath(s) can read each others' minds... in the chat tab."
				break

				case "empath":
					return "You don't want to be murdered! To help you survive, you can sense others' emotions - specifically, you can empathically feel how people vote during secret polls throughout the game."
				break

				case "medium":
					return "You'd prefer not to be killed and turned into a ghost. But you have a clearer understanding of ghosts - in fact, when ghosts communicate with you through dreams, you'll know who's sending the dreams!"
				break

				case "insomniac":
					return "You can't sleep - too scared of all these murderers! But that means you can hear what they're saying in the killer chat each night, though you're not exactly sure who they are."
				break

				case "psychic":
					return "You're on the good team, and as it happens, you have an extrasensory ability to judge people's morals. That means you know if someone's good or evil... but only once they die."
				break

				case "person":
				default:
					return "You just want to live! There are some other people on your side with some special abilities, but you're not sure who's who."
				break
			}
		}

	/* setupPlayer */
		module.exports.setupPlayer = setupPlayer
		function setupPlayer(request, callback) {
			if (request.event.type == "setup-welcome") {
				callback()
			}
			else {
				var set = {}
					set.updated = new Date().getTime()
			
				if (request.event.type == "setup-name") {
					set["players." + request.session.id + ".name"] = request.post.value
				}
				else if (request.event.type == "setup-shirt") {
					set["players." + request.session.id + ".colors.shirt"] = request.post.value
				}
				else if (request.event.type == "setup-pants") {
					set["players." + request.session.id + ".colors.pants"] = request.post.value
				}
				else if (request.event.type == "setup-shoes") {
					set["players." + request.session.id + ".colors.shoes"] = request.post.value
				}

				main.storeData("games", {id: request.game.id, "events.id": request.event.id}, {$set: set}, {}, function (game) {
					callback()
				})
			}
		}

	/* assignRoles */
		module.exports.assignRoles = assignRoles
		function assignRoles(request, callback) {
			var playerList = Object.keys(request.game.players)
			var playerCount = playerList.length
			
			if (playerCount < 5) {
				callback({success: false, message: "5 or more players required."})
			}
			else {
				var evilCount = Math.ceil(playerCount / 2) - 1
				var goodCount = playerCount - evilCount

				// generate evil team
					var roles = []
					while (roles.length < evilCount) {
						roles.push("killer")
					}

				// generate good team
					while (roles.length < playerCount) {
						do {
							var next = main.chooseRandom(["telepath", "empath", "medium", "insomniac", "psychic", "person"])
						} while ((roles.indexOf(next) !== -1) || (next !== "person"))

						if ((next == "telepath") && (roles.length + 2 < playerCount)) {
							roles.push(next)
							roles.push(next)
						}
						else if (next !== "telepath") {
							roles.push(next)
						}
					}

				// shuffle
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})

				// assign
					var set = {}
					for (var p = 0; p < playerCount; p++) {
						set["players." + playerList[p] + ".role"] = roles[p]

						if (roles[p] == "killer") {
							set["players." + playerList[p] + ".good"] = false
						}
					}

				// start game
					set.updated = new Date().getTime()
					set["state.start"] = new Date().getTime()
					set["events." + request.event.id + ".doers"] = []

					main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (game) {
						if (!game) {
							callback({success: false, message: "Unable to assign roles."})
						}
						else {
							var ids = Object.keys(request.game.players)
							var events = []
							for (var p = 0; p < ids.length; p++) {
								events.push({type: "story-role", viewers: [ids[p]], doers: [ids[p]]})
							}

							events.unshift({type: "story-inciting", viewers: Object.keys(request.game.players), doers: []})

							pushEvents(request, events, callback)
						}
					})					
			}
		}

	/* createDay */
		module.exports.createDay = createDay
		function createDay(request, callback) {
			// get data
				var dreams = request.game.dreams || []
				var killed = request.game.killed || []
				request.game.state.day = Number(request.game.state.day) + 1

			// set data
				var set = {}
					set.state.day    = request.game.state.day
					set.state.killed = request.game.killed = []
					set.state.dreams = request.game.dreams = []
					set.updated      = new Date().getTime()

			// day
				var events = []
				events.push({type: "story-day", viewers: Object.keys(request.game.players), doers: []})
			
			// dreams
				for (var d in dreams) {
					if (killed.indexOf(dreams[d].for) == -1) {
						events.push({type: "story-dream", viewers: dreams[d].for, doers: [], color: dreams[d].color, item: (dreams[d].item + "s").replace("ss", "s")})
					}
				}

			// murders
				if (!killed || killed.length == 0) {
					events.push({type: "story-safe", viewers: Object.keys(request.game.players), doers: []})
				}
				else {
					for (var k in killed) {
						events.push({type: "story-murder", viewers: Object.keys(request.game.players), doers: [], name: killed[k].name})
						events.push({type: "story-ghost", viewers: killed[k].id, doers: []})
						set["players." + killed[k].id + ".state.role"]  = request.game.players[killed[k].id].state.role  = "ghost"
						set["players." + killed[k].id + ".state.alive"] = request.game.players[killed[k].id].state.alive = false
					}
				}

			// execution-nomination and sleep
				var alive = Object.keys(request.game.players).filter(function(p) { return request.game.players[p].state.alive == true })
				for (var a in alive) {
					var others = alive.filter(function (p) { return p !== request.session.id })
					events.push({type: "execution-nomination", viewers: alive[a], doers: alive[a], options: others})
					events.push({type: "story-sleep", viewers: alive[a], doers: alive[a]})
				}

			// check for game end
				var goodAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].state.alive &&  request.game.players[p].good) })
				var evilAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].state.alive && !request.game.players[p].good) })

				if (evilAlive == 0) {
					set["state.end"]     = request.state.end     = new Date().getTime()
					set["state.victory"] = request.state.victory = "good"
					events.push({type: "end-good", viewers: Object.keys(request.game.players), doers: [] })
				}
				else if (goodAlive.length < evilAlive.length) {
					set["state.end"]     = request.state.end     = new Date().getTime()
					set["state.victory"] = request.state.victory = "evil"
					events.push({type: "end-evil", viewers: Object.keys(request.game.players), doers: [] })
				}

			// update data and make new events
				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					pushEvents(request, events, callback)
				})
		}

	/* createNight */
		module.exports.createNight = createNight
		function createNight(request, callback) {
			// get data
				var ids     = Object.keys(request.game.players)
				var killers = []
				var ghosts  = []
				var persons = []
				
				for (var i in ids) {
					if (request.game.players[ids[i]].state.alive == false) {
						ghosts.push(ids[i])
					}
					else if (request.game.players[ids[i]].role == "killer") {
						killers.push(ids[i])
					}
					else {
						persons.push(ids[i])
					}
				}

			// set data
				var set = {}
					set.state.killed = []
					set.state.dreams = []
					set.updated      = new Date().getTime()

			// night
				var events = []
				events.push({type: "story-night", viewers: Object.keys(request.game.players), doers: []})
			
			// ghosts
				for (var g in ghosts) {
					events.push({type: "dream-name", viewers: [ghosts[g]], doers: [ghosts[g]]})
				}

			// killers
				for (var k in killers) {
					events.push({type: "murder-nomination", options: persons.concat(killers), viewers: [killers[k]], doers: [killers[k]]})
				}

			// random
				if (request.game.state.day == 0) {
					events.push({type: "random-why", viewers: persons, doers: []})
				}

				for (var p in persons) {
					events.push({type: "random-select", viewers: [persons[p]], doers: [persons[p]]})
				}

			// wake
				for (var i in ids) {
					events.push({type: "story-wake", viewers: ids[i], doers: ids[i]})
				}

			// update data and make new events
				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					pushEvents(request, events, callback)
				})
		}

	/* executePlayer */
		module.exports.executePlayer = executePlayer
		function executePlayer(request, callback) {
			var accuser = request.queue.author
			var accused = request.queue.target

			var pro  = request.queue.pro.length
			var anti = request.queue.anti.length

			if (pro <= anti) { // rejected
				pushEvents(request, [{type: "story-decision", pro: pro, anti: anti, viewers: Object.keys(request.game.players), doers: []}], callback)
			}
			else { // accepted
				var set = {}
					set.updated = new Date().getTime()
					set["players." + accused + ".role"]  = request.players[accused].role  = "ghost"
					set["players." + accused + ".alive"] = request.players[accused].alive = false

				var events = [
					{type: "story-decision", pro: pro, anti: anti, viewers: Object.keys(request.game.players), doers: []},
					{type: "story-execution", name: request.game.players[accused].name, viewers: Object.keys(request.game.players), doers: []},
					{type: "story-ghost", viewers: [accused], doers: []}
				]

				// check for game end
					var goodAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].state.alive &&  request.game.players[p].good) })
					var evilAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].state.alive && !request.game.players[p].good) })

					if (evilAlive == 0) {
						set["state.end"]     = request.state.end     = new Date().getTime()
						set["state.victory"] = request.state.victory = "good"
						events.push({type: "end-good", viewers: Object.keys(request.game.players), doers: [] })
					}
					else if (goodAlive.length < evilAlive.length) {
						set["state.end"]     = request.state.end     = new Date().getTime()
						set["state.victory"] = request.state.victory = "evil"
						events.push({type: "end-evil", viewers: Object.keys(request.game.players), doers: [] })
					}

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					pushEvents(request, events, callback)
				})
			}
		}

	/* setupDream */
		module.exports.setupDream = setupDream
		function setupDream(request, callback) {
			var set = {}
				set.updated = new Date().getTime()
			var dream = request.game.state.dreams.find(function (d) { return d.from == request.session.id }) || false

			if (!dream) {
				var push = {}
					push["state.dreams"] = {
						from: request.session.id,
						for: request.post.value,
						item: null,
						color: null,
					}

				main.storeData("games", {id: request.game.id}, {$set: set, $push: push}, {}, function (game) {
					callback()
				})
			}
			else {
				if (request.event.type == "dream-name") {
					set["state.dreams.$.for"] = request.post.value
				}
				else if (request.event.type == "dream-item") {
					set["state.dreams.$.item"] = request.post.value
				}
				else if (request.event.type == "dream-color") {
					set["state.dreams.$.color"] = request.post.value
				}			
			
				main.storeData("games", {id: request.game.id, "state.dreams.from": request.session.id }, {$set: set}, {}, function (game) {
					callback()
				})
			}
		}

	/* murderPlayer */
		module.exports.murderPlayer = murderPlayer
		function murderPlayer(request, joinQueue, callback) {
			var killers = Object.keys(request.game.players).filter(function (p) { return ((request.game.players[p].role == "killer") && (request.game.players[p].alive)) })
			var nominator = request.queue.author
			var target    = request.queue.target

			var pro  = request.queue.pro.length
			var anti = request.queue.anti.length

			if (pro <= anti) { // rejected
				pushEvents(request, [{type: "story-decision", pro: pro, anti: anti, viewers: killers, doers: []}], callback)
			}
			else { // accepted
				var set = {}
					set.updated = new Date().getTime()
					set["state.killed"] = [target]

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					pushEvents(request, [{type: "story-decision", pro: pro, anti: anti, viewers: Object.keys(request.game.players), doers: []}], callback)
					joinQueue()
				})
			}
		}

	/* checkQueue */
		module.exports.checkQueue = checkQueue
		function checkQueue(request, data, callback) {
			var queue = request.game.events.filter(function(e) {
				return ((e.type == "queue") && (e.from == data.from) && (e.day == request.game.state.day) && (e.author == data.author) && (e.target == data.target))
			}) || null

			// create new queue
				if (!queue || queue.length == 0) {
					if (request.post.value === true) {
						var pro  = [request.session.id]
						var anti = []
					}
					else if (request.post.value === false) {
						var pro  = []
						var anti = [request.session.id]
					}
					else {
						var pro  = []
						var anti = []
					}

					pushEvents(request, [{
						type:    "queue", 
						from:    data.from,
						pro:     pro,
						anti:    anti,
						viewers: [request.session.id],
						doers:   data.doers.filter(function(p) { return p !== request.session.id }),
						next:    data.next
					}], callback)
				}
			
			// existing queue
				else {
					queue = queue[queue.length - 1]
				
					if (queue.viewers.indexOf(request.session.id) !== -1) { // already completed event
						callback({success: true, events: []})
					}
					
					else { // completing event now
						// update values
							queue.viewers.push(request.session.id)
							queue.doers = queue.doers.filter(function(p) {
								return p !== request.session.id
							}) || []

							if (request.post.value === true) {
								queue.pro.push(request.session.id)
							}
							else if (request.post.value === false) {
								queue.anti.push(request.session.id)
							}

						var set = {}
							set.updated = new Date().getTime()
							set["events.$.doers"]   = queue.doers
							set["events.$.viewers"] = queue.viewers
							set["events.$.pro"]     = queue.pro
							set["events.$.anti"]    = queue.anti

						main.storeData("games", {id: request.game.id, "events.id": queue.id}, {$set: set}, {}, function (game) {
							if (queue.doers.length > 0) { // non-empty queue
								callback({success: true, events: [queue]})
							}
							else { // empty queue
								if (typeof next !== "undefined") {
									next == undefined
								}
			
								request.queue = queue						
								eval(queue.next)

								if (!next || typeof next !== "function") {
									callback({success: true, message: "unable to trigger next"})
								}
								else {
									next(request, callback)
								}
							}
						})
					}
				}
		}
