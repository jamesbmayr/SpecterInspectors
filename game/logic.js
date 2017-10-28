/*** modules ***/
	var main = require("../main/logic")
	module.exports = {}

/*** fetches ***/
	/* fetchData */
		module.exports.fetchData = fetchData
		function fetchData(request, callback) {
			if (!request.post) {
				callback({success: false, message: "That's not a valid fetch request..."})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "This game cannot be found."})
					}
					else if (!games[0].players[request.session.id]) {
						callback({success: false, message: "You're not a player of this game!"})
					}
					else {
						request.game  = games[0]

						// events
							var newEvents = []
							var eventIDs = Object.keys(request.game.events)
							var lastEvent = request.game.events[request.post.event] || false

							if (lastEvent) {
								var eventIDs = eventIDs.filter(function (e) {
									return ((request.game.events[e].created > lastEvent.created) && (request.game.events[e].viewers.indexOf(request.session.id) !== -1))
								}).sort(function(x, y) {
									return request.game.events[x].created - request.game.events[y].created
								})

								for (var e in eventIDs) {
									newEvents.push(request.game.events[eventIDs[e]])
								}
							}

						// chats
							var chats    = []
							var newChats = []
							var lastChat = false
							var player   = request.game.players[request.session.id]
							
							if (!player.status.alive) { // ghost chat
								chats = request.game.chats.ghost
							}
							else if (!player.status.good) { // killer chat
								chats = request.game.chats.killer
							}
							else if (player.status.role == "telepath") { // telepath chat
								chats = request.game.chats.telepath
							}

							if (chats && chats.length) { // get most recent chat
								lastChat = chats.find(function (c) { return c.id == request.post.chat }) || false
							}

							if (lastChat) { // filter and sort
								chats = chats.filter(function (c) {
									return (c.created > lastChat.created)
								}).sort(function(x, y) {
									return x.created - y.created
								})
							}

							if (chats.length) {
								for (var c in chats) {
									newChats.push(chats[c])
								}
							}

						// response
							callback({success: true, start: request.game.state.start, end: request.game.state.end, day: request.game.state.day, night: request.game.state.night, role: player.status.role, events: newEvents, chats: newChats})
					}
				})
			}
		}

/*** submits ***/
	/* submitChat */
		module.exports.submitChat = submitChat
		function submitChat(request, callback) {
			if (!request.post || !request.post.text) {
				callback({success: false, message: "No message was submitted."})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "This game cannot be found."})
					}
					else if (!games[0].state.start) {
						callback({success: false, message: "This game has not started."})
					}
					else if (games[0].state.end) {
						callback({success: false, message: "This game already ended."})
					}
					else if (!games[0].players[request.session.id]) {
						callback({success: false, message: "You're not a player of this game!"})
					}
					else if (games[0].players[request.session.id].status.alive && games[0].players[request.session.id].status.good && (games[0].players[request.session.id].status.role !== "telepath")) {
						callback({success: false, message: "You're not a member of any chats!"})
					}
					else if (games[0].players[request.session.id].status.alive && !games[0].players[request.session.id].status.good && !games[0].state.night) {
						callback({success: false, message: "Killers can only communicate at night."})
					}
					else if (games[0].players[request.session.id].status.alive && (games[0].players[request.session.id].status.role == "telepath") && games[0].state.night) {
						callback({success: false, message: "Telepaths can only communicate during the day."})
					}
					else if (games[0].players[request.session.id].status.alive && (games[0].players[request.session.id].status.role == "telepath") && Object.keys(games[0].players).filter(function(p) { return (games[0].players[p].status.role == "spellcaster" && games[0].players[p].status.alive) }).length) {
						callback({success: false, message: "A spellcaster is interrupting your telepathy."})
					}
					else {
						request.game = games[0]
						var player = request.game.players[request.session.id]
						var chat = {
							id: main.generateRandom(),
							created: new Date().getTime(),
							author: player.id,
							name: player.name,
							text: main.sanitizeString(request.post.text) || ""
						}

						if (!player.status.alive) {
							var type = "ghost"
						}
						else if (!player.status.good) {
							var type = "killer"
						}
						else if (player.status.role == "telepath") {
							var type = "telepath"
						}

						var push = {}
							push["chats." + type] = chat
						var set = {}
							set.updated = new Date().getTime()

						main.storeData("games", {id: request.game.id}, {$push: push, $set: set}, {}, function (data) {
							callback({success: true, chat: chat})
						})
					}
				})
			}
		}

	/* submitNotes */
		module.exports.submitNotes = submitNotes
		function submitNotes(request, callback) {
			if (!request.post) {
				callback({success: false, message: "No notes were submitted."})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "This game not found."})
					}
					else if (!games[0].state.start) {
						callback({success: false, message: "This game has not started."})
					}
					else if (games[0].state.end) {
						callback({success: false, message: "This game already ended."})
					}
					else if (!games[0].players[request.session.id]) {
						callback({success: false, message: "You're not a player of this game!"})
					}
					else {
						request.game = games[0]
						var notes = main.sanitizeString(request.post.notes) || ""

						var set = {}
							set["players." + request.session.id + ".notes"] = notes
							set.updated = new Date().getTime()

						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							callback({success: true, notes: notes})
						})
					}
				})
			}
		}

	/* submitEvent */
		module.exports.submitEvent = submitEvent
		function submitEvent(request, callback) {
			if (!request.post) {
				callback({success: false, message: "No event response data was submitted."})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
					if (!games) {
						main.logError("unable to find game: " + request.path[2].toLowerCase())
						callback({success: false, message: "This game cannot be found."})
					}
					else if (games[0].state.end) {
						callback({success: false, message: "This game already ended."})
					}
					else if (!games[0].players[request.session.id]) {
						callback({success: false, message: "You're not a player of this game!"})
					}
					else if (!games[0].events[request.post.id]) {
						callback({success: false, message: "This event cannot be found."})
					}
					else if (games[0].events[request.post.id].doers.indexOf(request.session.id) == -1) {
						callback({success: false, message: "You're not on this event!"})
					}
					else {
						request.game = games[0]
						request.event = request.game.events[request.post.id]

						try {
							switch (request.event.type) {
								case "setup-welcome":
								case "setup-name":
								case "setup-shirt":
								case "setup-pants":
									setupPlayer(request, callback)
								break

								case "start-launch":
									launchGame(request, callback)
								break

								case "start-role":
								case "trigger-wake":
									createDay(request, callback)
								break

								case "trigger-sleep":
									createNight(request, callback)
								break

								case "execution-nomination":
								case "execution-poll":
									executePlayer(request, callback)
								break

								case "murder-nomination":
								case "murder-poll":
									murderPlayer(request, callback)
								break

								case "dream-name":
								case "dream-color":
									setupDream(request, callback)
								break

								case "random-select":
								case "random-text":
								case "random-buttons":
									setupRandom(request, callback)
								break

								default:
									main.logError("cannot trigger event: " + request.post.id)
									callback({success: false, message: "Unable to trigger the next event..."})
								break
							}
						}
						catch (error) {
							main.logError("cannot trigger event: " + request.post.id + "\n" + error)
							callback({success: false, message: "Unable to trigger the next event..."})
						}
					}
				})
			}
		}

/*** creates ***/
	/* createStaticEvent */
		module.exports.createStaticEvent = createStaticEvent
		function createStaticEvent(request, data) {
			// data
				if (!data) { var data = {} }

			// create event
				var event = {
					id:      main.generateRandom(),
					created: new Date().getTime(),
					updated: new Date().getTime(),
					day:     request.game.state.day   || 0,
					night:   request.game.state.night || false,
					type:    data.type    || "error",
					viewers: data.viewers || Object.keys(request.game.players),
					doers:   []
				}

			// get event content
				switch (data.type) {
					// setup
						case "setup-gamecode":
							event.text = "Your friends can join using this code: <span class='special-text'>" + request.game.id.substring(0,4).toUpperCase() + "</span>..."
						break

					// start
						case "start-story":
							event.text = "Our story begins... You and your friends have gathered together " + request.game.flavor.rationale + " " + request.game.flavor.locale + ", but as it turns out, some of you are murderers. That's right - your good friend <span class='special-text'>" + request.game.flavor.ghost + "</span> is dead. Now you have to figure out who the killers are... before they get you too!"
						break

						case "start-players":
							event.text = "Here are all the suspects: <br>" + main.sortRandom(data.players).join("<br>") + "<br><br>And here are all the roles: <br>" + main.sortRandom(data.roles).join(" ")
						break

						case "start-notes":
							event.text = main.chooseRandom(["Things are gonna get a bit crazy, so you might need to write stuff down.", "To solve these murders, you might need to write down some clues.", "To make things a bit easier, there's a place for you to keep track of everything.", "As you play the game, you might need a place to keep your thoughts.", "If you're looking for a place to organize your ideas..."]) + " Check out the Notes tab to the left."
						break
						
						case "start-day":
							event.text = "Every day, each living player can nominate someone they suspect... for execution! If a simple majority approves, the player is put to death and becomes a ghost. (Only one person can be executed each day.)"
						break
						
						case "start-evil":
							event.text = "Here's the evil team: " + data.names.join(" ") + "..."
						break

						case "start-night":
							event.text = "Every night, the killers can (unanimously) select one person to murder - but dead players come back as ghosts! These ghosts - including " + request.game.flavor.ghost + " - can send dreams to living players, providing clues to help find the killers."
						break

					// morning
						case "story-day":
							event.text = main.chooseRandom(["The sun is rising here " + request.game.flavor.locale + ".", "A new dawn rises.", "It's the start of a brand new day here " + request.game.flavor.locale + ".", "The next day has begun.", "Goooooood morning!", "The story continues with a new day.", "Day phase, activated.", "The next day has commenced.", "Let us begin a new day.", "Here we go: another day " + request.game.flavor.locale + ".", "You wake up once again " + request.game.flavor.locale + ".", "New day. Still alive. Still " + request.game.flavor.locale + "."])
						break

						case "story-dream":
							event.text = main.chooseRandom(["You had the strangest dream last night - something about <span class='special-text " + data.color + "'>" + data.color + "</span> things?", "That was definitely a bizarre dream - everything was <span class='special-text " + data.color + "'>" + data.color + "</span>, everywhere you looked...", "Well, dreams don't get more interesting than wall-to-wall <span class='special-text " + data.color + "'>" + data.color + "</span>, right?", "What a dream! You can still see it clearly: everything you touched turned <span class='special-text " + data.color + "'>" + data.color + "</span>.", "No, no! Not the <span class='special-text " + data.color + "'>" + data.color + "</span> squares! Oh... it was only a dream.", "Are these dreams, or visions? All you know is you can't get <span class='special-text " + data.color + "'>" + data.color + "</span> out of your head.", "What a nightmare! Just <span class='special-text " + data.color + "'>" + data.color + "</span> liquids, everywhere, as far as the eye can see!", "And that dream about <span class='special-text " + data.color + "'>" + data.color + "</span> shadows was pretty interesting, to say the least.", "You begin to wonder if anyone else dreams about everyday objects all being <span class='special-text " + data.color + "'>" + data.color + "</span>.", "Wow, what a restless night, constantly interrupted by visions of <span class='special-text " + data.color + "'>" + data.color + "</span>!", "You suspect there's something up with <span class='special-text " + data.color + "'>" + data.color + "</span> after those thoughts dancing in your mind all of last night.", "Even the air you breathed felt thoroughly <span class='special-text " + data.color + "'>" + data.color + "</span> in your dreams last night."])
						break

						case "story-sleep":
							event.text = main.chooseRandom(["BEES! BEES EVERYWHERE! Oh... oh, it was only a dream.", "Between the astronauts, the jazz trombone, and the flying zebras, that was an awesome dream last night.", "You hate that dream - you know, the one about the pigeons and the celery. Ugh. Terrible.", "Why is it that your dreams about attractive models are always after the zombie apocalypse?", "In your dream last night, the sun and moon decided to swap places. Few people noticed.", "Crazy dream last night - everyone was speaking in barcodes.", "!!! Oh, you were sleeping. But what a nightmare! Kindergarten - again!", "You had a dream about pancakes, but they were stale.", "Your favorite dreams are always the ones about scuba diving on the moon. Someone should make that a thing.", "They say it's in dreams that our best ideas are born. So I guess your best idea is a pantsuit for hamsters. Huh.", "You dreamed mostly about the number 31, but you're not sure if that's significant. Probably not.", "Whoa - you just had that recurring nightmare again - the one with the octopus telemarketer. You should talk to someone about that.", "You dreamt that you had been a better child to your parents. Alas.", "Last night, you had a dream about unicorns, but they were all on strike for workplace safety violations.", "Is it normal to dream about throwing your friends in a volcano? No, probably not.", "Your latest dream was a revolutionary new tech gadget, but... sigh... the specifics have faded from your memory.", "You had a dream last night that you crawled into your bed.", "Your dream last night was one for the history books... in that it was literally about you reading a history book.", "Strange visions in your sleep - visions of smells. Bad ones.", "You dreamt that you had wet the bed, but you awoke to find you hadn't. Nice.", "Last night, you had a dream that you and your friends were playing a sort of board game on your phone... ghosts and guesses, was it?", "It's probably best if you forget your latest dreams altogether.", "Honestly, that was the best dream you will ever have - you had a steady job, a family that cared about you, and attainable ambitions... oh well...", "Huh, that was a first. Never had a dream about a rabbit wielding katanas before.", "At this point, most of your dreams are just pop-up ads for more expensive dreams.", "Can't remember the last time you had a dream that all of America's former governors had invited you to tea.", "Terrible, terrible nightmares last night - all of the birds were singing cartoon theme songs! In harmony!", "Your dream last night included Beethoven's Moonlight Sonata, as performed by a box of crayons distraught over the state of the economy.", "Worst. Dream. Ever. 0 out of 5 stars. You literally can't even.", "Your favorite dreams are generally the ones where you're somebody's household pet.", "File this under freaky: last night, you dreamt that you were dreaming about not getting enough sleep.", "In a strange twist, your dream last night involved physical words flying out of your mouth - all of them with the squiggly underline for incorrect spelling.", "Your parents would be proud - in your dream last night, you actually accomplished something meaningful.", "It was first day at the police academy all over again in your most recent dream.", "The muses must be speaking to you in code, because your dream last night was literally javascript.", "Do dreams about mirrors generally involve action stars punching through them screaming about revenge? No? Just you? Okay.", "Vampires, goblins, and werewolves were the main feature of your dreams this evening. Not ghosts, though.", "You had a dream that you were extinguishing everyone else's candles by inhaling the flame into your nostrils. Kinda mean, now that you think about it.", "Aw, yeah, dreams about laser guns and space ships. Awesome.", "During last night's slumber, you were transported back to your 7th birthday party - complete with the pizza and that weird kid your mom insisted on inviting.", "In your dream last night, you were good at racing video games. But in reality, you are not."])
						break

						case "story-murder":
							event.text = main.chooseRandom(["It's a murder! <span class='special-text'>" + data.name + "</span> is dead!", "You awake to find <span class='special-text'>" + data.name + "</span> is no longer with us.", "It seems that <span class='special-text'>" + data.name + "</span> was killed in the middle of the night.", "Oh no! <span class='special-text'>" + data.name + "</span> is dead!", "Sadly, <span class='special-text'>" + data.name + "</span> has passed on from this world.", "And the next ghost is: <span class='special-text'>" + data.name + "</span>.", "Well, can't say we didn't see this coming. <span class='special-text'>" + data.name + "</span> is dead.", "They got another one! <span class='special-text'>" + data.name + "</span> has been murdered!", "Tragically, <span class='special-text'>" + data.name + "</span> is off to join " + request.game.flavor.ghost + " in the afterlife.", "First " + request.game.flavor.ghost + ", and now <span class='special-text'>" + data.name + "</span>!?", "Well... at least <span class='special-text'>" + data.name + "</span> can keep " + request.game.flavor.ghost + " company in the great beyond.", "As you examine the deceased body of <span class='special-text'>" + data.name + "</span>, you wonder if " + request.game.flavor.ghost + " will be happy to see them.", "They came after " + request.game.flavor.ghost + ". And now they've killed <span class='special-text'>" + data.name + "</span> too."]) + " " + main.chooseRandom(["Nearby, you find ", "The weapon of choice? ...", "It appears it was ", "How!? Well, it was ", "Strangely enough, the murder weapon was ", "All due to ", "How did this happen? ...", "No one suspected ", "Turns out the killer used "]) + main.chooseRandom(["a chalice of cyanide", "a chalice of hemlock", "a chalice of arsenic", "a chalice of nightshade", "a large orange container reeking of gasoline", "a 50-year-old rusty cylinder of propane", "a rusty knife stained with the blood of a hundred murders", "an ancient battle axe", "a glimmering replica prop sword", "a 3D-printed carbon filament katana", "some embarassing childhood photographs", "a mechanical pencil sharpener", "frayed piano wire", "a skein of multicolored acrlyic yarn", "a plastic grocery bag with a smiley face on the front", "a cast-iron frying pan", "some origami throwing stars", "a broken stapler", "half a pound of pink chewing gum", "two and a half wool socks", "a syringe dripping with some sort of poison", "a handful of matches and three-quarters of a pack of playing cards", "a cucumber sandwich cut into triangles", "some terrible puns scribbled on post-it notes", "a crude dagger composed of hardened cheese", "some paperclips and rubberbands, mostly", "a map of the nearest children's museum", "twenty live tarantulas in glass jars", "a now-deceased canary", "rocks, paper, and scissors", "a civil war-era musket", "three semi-automatic rifles", "C4", "a standard police pistol", "plastic cling wrap", "kitchen utensils", "ink cartridges", "a water gun converted into a flamethrower", "truly awful top-40 music on shuffle", "a cell phone battery"]) + "."
						break

						case "story-safe":
							event.text = main.chooseRandom(["No one died last night! But still... what about " + request.game.flavor.ghost + " (and any other murders)?", "Seems like the murderers didn't do much last night. But they're out there.", "Thankfully, it was a quiet night. But there's still a killer on the loose.", "Somehow, nobody died. That's the good news. The bad news? The murderer didn't die either.", "Maybe the killers are on vacation? Well, they'll be back eventually.", "It seems fate has spared your friends. But one or more of them could still be a killer.", "We know there's a murderer (or two or three...) still alive, even if nobody was slaughtered in their sleep.", "Just because nobody died doesn't mean nobody tried.", "Maybe the murderers are just biding their time, building up a false sense of security before they strike again. And when they do...", "What a relief! Everybody's still here! Except... someone did commit those killings before...", "Nobody has died this night. But " + request.game.flavor.ghost + " must be avenged.", "Thankfully, no one new is dead. But " + request.game.flavor.ghost + " cannot have died in vain.", "Nobody's joining " + request.game.flavor.ghost + " in death today... but there's still a killer on the loose."])
						break

					// day
						case "special-telepath":
							event.text = "During the day, telepaths can read each others thoughts. Use the chat tab on the right to send out a mental message!"
						break

						case "story-accusation":
							event.text = "An accusation has been made against you! " + main.chooseRandom(["It appears <span class='special-text'>" + data.author + "</span> thinks it's all your fault.", "Everyone will cast a vote on <span class='special-text'>" + data.author + "</span>'s motion... to kill you.", "Now that <span class='special-text'>" + data.author + "</span> has suggested it, everyone will vote... except you.", "Let's see if everyone else agrees with <span class='special-text'>" + data.author + "</span>.", "Will <span class='special-text'>" + data.author + "</span> get their way, or will you live to fight another day?", "First, <span class='special-text'>" + data.author + "</span> points the finger. Then everyone else decides.", "Time to find out if <span class='special-text'>" + data.author + "</span> has convinced the others."])
						break

						case "story-execution":
							event.text = main.chooseRandom(["The people have spoken! <span class='special-text'>" + data.name + "</span> is found guilty!", "Off with their head! <span class='special-text'>" + data.name + "</span> is done.", "Well, <span class='special-text'>" + data.name + "</span>, it seems your fate is sealed.", "That's that. <span class='special-text'>" + data.name + "</span> shall be executed!", "The group agrees: <span class='special-text'>" + data.name + "</span> should be sentenced to death.", "Sorry, <span class='special-text'>" + data.name + "</span>, but your time has come.", "Well, can't say we didn't see this coming. <span class='special-text'>" + data.name + "</span> is executed by the group.", "So we agree, then? <span class='special-text'>" + data.name + "</span> shall die!"])
						break

						case "story-ghost":
							event.text = main.chooseRandom(["Well... these things happen, sometimes. Welcome to the afterlife. On the bright side - now you can chat with other ghosts (on the right).", "Not sure how to break it to you... but uh... you're a ghost now. At least there's the ghost chat (on the right)!", "You have shed your mortal skin and ascended into a higher plane of existence - complete with a new chat room (on the right)!", "This is phase 2: ghost time. Check out the ghost chat (on the right)!", "Sorry about your death and everything - but try the new ghost chat (on the right)!", "Whelp, you're dead. But you're not done playing - get in on the ghost chat (on the right)!", "Hey, now you're dead! Just like " + request.game.flavor.ghost + "! Try chatting with other ghosts in the ghost chat (on the right).", "As your soul ascends into the mystical beyond, " + request.game.flavor.ghost + " welcomes, you, saying, Check out the ghost chat on the right."])
						break

					// night
						case "story-night":
							event.text = main.chooseRandom(["And the sun sets on that day... night time!", "Here comes the night.", "Darkness falls.", "A new night begins.", "As light fades from the sky, the night is upon us.", "Thus begins another night.", "The night is now.", "And now? Night.", "What's next? Oh, right... night time.", "Here we go with another night.", "Night has come, here " + request.game.flavor.locale + ".", "Darkness has fallen here " + request.game.flavor.locale + ".", "Now, " + request.game.flavor.locale + ", it is night."])
						break

						case "special-killer":
							event.text = "At night, killers can communicate in secret using the chat tab on the right. Just make sure you're not obvious about it!"
						break

						case "special-ghost":
							event.text = "As a ghost, you can't talk to the living, but you can still communicate! Every night, you can send someone a dream to give them clues about who the killers might be! <br>Just keep in mind that " + request.game.flavor.ghost + " is also sending dreams... but is pretty clueless about who the killers are."
						break

						case "murder-ghost":
							event.text = main.chooseRandom(["Using your ethereal hearing, you learn the murderers are considering killing <span class='special-text'>" + data.target + "</span>.", "As a ghost, you can listen in on all kinds of conversations. Like the one about possibly murdering <span class='special-text'>" + data.target + "</span>.", "Your ghostly senses suggest that <span class='special-text'>" + data.target + "</span> might be the next victim.", "One perk of being dead? You know what the living are up to - like discussing the murder of <span class='special-text'>" + data.target + "</span>.", "The spectral plane reveals the murderers' next possible victim: <span class='special-text'>" + data.target + "</span>.", "Floating between the walls, you see that the killers are plotting the murder of <span class='special-text'>" + data.target + "</span> next.", "As you hover in eternal purgatory, you pick up on a fun fact: the killers want to go after <span class='special-text'>" + data.target + "</span> now.", "Looks like <span class='special-text'>" + data.target + "</span> might be joining you in the afterlife if the murderers all agree.", "Things are looking dire for <span class='special-text'>" + data.target + "</span>, at least as far as those ghostly vibes are going.", "You begin to wonder what it would be like for <span class='special-text'>" + data.target + "</span> to join you as a spirit - you know, if the killers go through with it."])
						break

						case "random-why":
							event.text = main.chooseRandom(["To ensure other players don't know who you are, we ask you pointless questions.", "This is just so no one knows your role. We need to be sure they think you're doing something.", "To make it so no one know's who's who, we have to make you click random buttons.", "This next part is so nobody can figure out your role. Just a bunch of random questions.", "This data's not going anywhere - it's just so other players don't know what your role is.", "It's important that you look like you're doing something, even if you're not.", "Gotta make sure nobody knows your role. That's why we make you press buttons and stuff.", "We have to keep up the ruse that you could be any player. So we make you answer meaningless questions.", "Just to make sure nobody knows what role you have... let's go through some pointless questions."])
						break

						case "murder-complete":
							event.text = main.chooseRandom(["And just like that, <span class='special-text'>" + data.target + "</span> will become the next victim.", "Poor <span class='special-text'>" + data.target + "</span> - never saw it coming.", "You almost feel bad killing <span class='special-text'>" + data.target + "</span>. Almost.", "See ya never, <span class='special-text'>" + data.target + "</span>!", "Whelp, that's just about it for <span class='special-text'>" + data.target + "</span>!", "Looks like <span class='special-text'>" + data.target + "</span> will breathe that final breath tonight.", "You begin to wonder just how much blood <span class='special-text'>" + data.target + "</span> has", "You quickly and quietly sketch out the murder of <span class='special-text'>" + data.target + "</span>.", "Wait till they wake up to find good ol' <span class='special-text'>" + data.target + "</span> lying there, dead! Time to get to work.", "Bye bye forever, <span class='special-text'>" + data.target + "</span>! It's murderin' time.", "Raise that death count - <span class='special-text'>" + data.target + "</span> has seconds to live."])
						break

						case "dream-complete":
							event.text = main.chooseRandom(["All right, that dream is packed up and good to go.", "Dream crafted - and on its way.", "The dream shall not be deferred!", "Sending along the vision... now!", "The dream is sent!", "Hallucinations in transit...", "Okay, great! That dream is ready!", "Nightmare manufactured!", "Sending along to that sleeping somebody.", "Sweet (?) dreams, friend!"])
						break

					// end
						case "end-good":
							event.text = main.chooseRandom(["And with that, the good guys win!", "The winners are... the good guys!", "Congratulations, Team Good - you did it!", "And for once, the murderers don't get away with it!", "That's a wrap! Great job, not-evil people!", "Victory goes to the good ones!", request.game.flavor.ghost + ", you have been avenged!", "As we celebrate the victory of the good team, let us remember our departed friend, " + request.game.flavor.ghost + "."])
							event.input = "link"
							event.options = ["../../", "play again"]
						break

						case "end-evil":
							event.text = main.chooseRandom(["And that's the game. Well done, you villanous scum!", "Game over - better luck next time, good team.", "The murderers emerge victorious.", "It just wasn't enough - you can't stop these killers!", "The bad guys are victorious! Thanks for playing!", "And that's another win for evil.", "It appears the death of " + request.game.flavor.ghost + " sent everyone down a path of doom. Evil seizes the day.", "Going after " + request.game.flavor.ghost + " just wasn't enough... they had to go and kill everyone. Evil wins."])
							event.input = "link"
							event.options = ["../../", "play again"]
						break

					// decision
						case "decision-waiting":
							event.text = main.chooseRandom(["Great. Nothing to do now but wait for everybody else.", "All right, hold tight while we wait for your friends.", "Cool - just waiting on some other responses now.", "Awesome! Now we're just waiting on everyone else.", "Aaaaand now we wait for the others.", "Waiting for others...", "Please wait for other players.", "Hold please - other players aren't ready yet.", "Kick back and relax - other people aren't caught up yet.", "Waiting for the rest of them.", "Okay, other people are still taking actions...", "A'ight, not quite ready to continue.", "Cool, you're done, but someone else is not.", "As you wait, you begin to ponder what your childhood friends are up to these days.", "Waitin' time.", "Tick, tock, everybody - let's go.", "You begin to twiddle your thumbs while contemplating the meaning of the universe and what's taking everyone so long.", "Done! What's taking the rest of them!?", "Might as well take a nap while your friends catch up.", "Still a couple stragglers...", "Question completed. Associates still in motion."])
						break

						case "decision-complete":
							event.text = main.chooseRandom(["The decision is " + data.pro.length + " for, " + data.anti.length + " against.", "Yea: " + data.pro.length + ". Nay: " + data.anti.length + ".", data.pro.length + " said yes, " + data.anti.length + " said no.", "The results: " + data.pro.length + " think yes, " + data.anti.length + " think no.", "How many for? " + data.pro.length + ". How many against? " + data.anti.length + ".", "All those in favor: " + data.pro.length + ". All those opposed: " + data.anti.length + "."]) + "<br>yes: " + data.pro.join(" ") + "<br>no: " + data.anti.join(" ")
						break
						
						case "special-empath":
						case "special-cheater":
							event.text = main.chooseRandom(["Wait, that's not how you wanted to vote... somebody changed something...", "Powers beyond your control have conspired to change your vote...", "Strange. You could have sworn you voted differently...", "Something - or someone - is changing votes!", "Your vote has been altered! But who is responsible!?", "Interesting. Not how you intended to vote, but that's how it came out. You wonder who's to blame for this.", "Somehow, your vote is not your own. Somebody's messing with it."])
						break

					// special
						case "special-augur":
							event.text = main.chooseRandom(["Sensing their fading aura, you see that person just executed was <span class='special-text'>" + data.team + "</span>.", "As the light leaves their eyes and the soul leaves their body, you can tell that this person was <span class='special-text'>" + data.team + "</span>.", "You breathe in deep and absorb the energy of the dying person before you: this one was <span class='special-text'>" + data.team + "</span>.", "Very clear aura on that one - <span class='special-text'>" + data.team + "</span>.", "It's subtle, but you're pretty confident the aura around this now-dead persn reveals their true allegiance: <span class='special-text'>" + data.team + "</span>."])
						break

						case "special-clairvoyant":
							event.text = main.chooseRandom(["You get in close to the body and feel that this person was definitely <span class='special-text'>" + data.magic + "</span>.", "A fuzzy glow hangs around the recently deceased, indicating that this person was <span class='special-text'>" + data.magic + "</span>.", "Closing your eyes and twitching your fingers, you conclude that this now-dead person was <span class='special-text'>" + data.magic + "</span>.", "Very strong vibes on this one - <span class='special-text'>" + data.magic + "</span>.", "That sensation flowing through your veins reveals the truth about the dead body before you: <span class='special-text'>" + data.magic + "</span>."])
						break

						case "special-medium":
							event.text = main.chooseRandom(["And who sent that dream? Why, none other than <span class='special-text'>" + data.name + "</span>.", "That dream definitely comes to you from <span class='special-text'>" + data.name + "</span>.", "These visions are clearly the work of <span class='special-text'>" + data.name + "</span>, may they rest in peace.", "You whisper a solemn thank you to the painter of that particular illusion: <span class='special-text'>" + data.name + "</span>.", "Seems that <span class='special-text'>" + data.name + "</span> is more useful dead than alive, since that's who sent you this dream.", "This information courtesy of a certain ghost named <span class='special-text'>" + data.name + "</span>.", "Excellent dream-making, <span class='special-text'>" + data.name + "</span>, you think to yourself.", "At least you can always count on <span class='special-text'>" + data.name + "</span> to craft some interesting dreams.", "You strongly suspect that it was <span class='special-text'>" + data.name + "</span> making this dream.", "And you're quite certain these hallucinations are coming from <span class='special-text'>" + data.name + "</span>."])
						break

						case "special-psychic":
							event.text = main.chooseRandom(["With a slight touch on both their shoulders, you conclude that these two are on <span class='special-text'>" + data.match + "</span>.", "Are they on the same team? you wonder. And just like that, you know: <span class='special-text'>" + data.match + "</span>.", "Using magic powers you don't fully comprehend, you know these two are on <span class='special-text'>" + data.match + "</span>.", "Using your magical future vision or whatever, you can tell that they're on <span class='special-text'>" + data.match + "</span>.", "It feels like they're on <span class='special-text'>" + data.match + "</span>to you, though you're not really sure why.", "The voices whisper in your mind: <span class='special-text'>" + data.match + "</span>.", "Maybe you can't predict the future, but you can predict the present: they're on <span class='special-text'>" + data.match + "</span>.", "Who knows where ideas come from? But this one is loud and clear: <span class='special-text'>" + data.match + "</span>.", "Using your gift for this sort of thing, you assess that these people are on <span class='special-text'>" + data.match + "</span>.", "Interesting. You can feel that they're on <span class='special-text'>" + data.match + "</span>."])
						break

						case "special-insomniac":
							event.text = main.chooseRandom(["Who are they thinking about killing now? <span class='special-text'>" + data.name + "</span>?", "Sounds like the murderers want to kill <span class='special-text'>" + data.name + "</span>!", "As you try desperately to fall asleep, you hear the murmur of murderers planning their next kill: <span class='special-text'>" + data.name + "</span>.", "Lying awake in your bed, you hear them plotting: <span class='special-text'>" + data.name + "</span> might be the next target.", "You can't sleep, and here's why: somebody's talking about killing <span class='special-text'>" + data.name + "</span>!", "So many restless nights! So little time left for <span class='special-text'>" + data.name + "</span>, if the killers go through with it.", "You were almost drifting off to sleep when you heard the voices talking - and the name they kept mentioning? <span class='special-text'>" + data.name + "</span>.", "They're there. You don't know who, but you can hear them casually chatting about who to kill next... <span class='special-text'>" + data.name + "</span>.", "Oh no! Not <span class='special-text'>" + data.name + "</span>! Oh no! The killers are gonna strike!", "You long for the calm respite of sleep, but instead, you hear someone discussing the impending death of <span class='special-text'>" + data.name + "</span>!", "What's that? Who's there? What are they planning to do to <span class='special-text'>" + data.name + "</span>!?"])
						break

						case "special-immortal":
							event.text = main.chooseRandom(["LOL. They tried to murder you last night. You even pretended to be dead. Kinda feel bad about that now.", "The latest murder victim? You! Just kidding, of course. You can't die. But they still tried.", "It's good to be invincible, especially when people keep trying to murder you.", "They tried to murder you last night - but they of course did not succeed.", "Stellar performance, you think to yourself, reflecting on last night's attempted murder - and your dedication to playing the part.", "You have sustained literally no damage from the killing last night - too bad, killers!", "Who do they think you are, " + request.game.flavor.ghost + "? You're immortal!"])
						break

						case "special-illusionist":
							event.text = main.chooseRandom(["Using a mannequin, you managed to trick the killers into thinking they killed you. But they did not.", "They thought they killed you, but you managed to get out of there just in time.", "The murderers really thought they had you, but you snuck out the back way.", "Those villainous evildoers nearly did you in, but you disappeared in a cloud of smoke at the right moment.", "Using your training from the magician academy, you pull off the impossible: not getting killed. But they did try.", "The killers came after you, but you were too fast and fled the scene. Not gonna become the next " + request.game.flavor.ghost + "!"])
						break

						case "special-watchkeeper":
							event.text = main.chooseRandom(["Without seeing the killers' faces, <span class='special-text'>" + data.watchkeeeper + "</span>, the <span class='special-text'>watchkeeper</span>, rescues <span class='special-text'>" + data.targets.join(" & ") + "</span> from certain doom.", "Not so fast! The <span class='special-text'>watchkeeper</span>, <span class='special-text'>" + data.watchkeeper + "</span>, is here to protect <span class='special-text'>" + data.targets.join(" & ") + "</span>.", "The killers are going in after <span class='special-text'>" + data.targets.join(" & ") + "</span>, but all of a sudden, <span class='special-text'>" + data.watchkeeper + "</span>, the <span class='special-text'>watchkeeper</span>, intervenes!", "They were about to slaughter <span class='special-text'>" + data.targets.join(" & ") + "</span> when the <span class='special-text'>watchkeeper</span> - none other than <span class='special-text'>" + data.watchkeeper + "</span> - got involved (without getting a good look at the killers).", "The <span class='special-text'>watchkeeper</span> was too fast! Though the killers remain anonymous for now, <span class='special-text'>" + data.watchkeeper + "</span> has protected <span class='special-text'>" + data.targets.join(" & ") + "</span> from murder.", "Well, <span class='special-text'>" + data.watchkeeper + "</span> couldn't protect " + request.game.flavor.ghost + ", but they could protect <span class='special-text'>" + data.targets.join(" & ") + "</span>. Except now the killers know who's keeping watch."])
						break

						case "special-detective":
							event.text = main.chooseRandom(["You did some digging, and came up with this: <span class='special-text'>" + data.name + "</span> is <span class='special-text'>" + data.team + "</span>.", "Excellent detective work, you think to yourself. Yeah - <span class='special-text'>" + data.name + "</span> is definitely <span class='special-text'>" + data.team + "</span>.", "Based on what you've observed - and your years of police training - you've figured out that <span class='special-text'>" + data.name + "</span> is most certainly on the <span class='special-text'>" + data.team + "</span> team.", "The skills you picked up at the academy have served you well: <span class='special-text'>" + data.name + "</span> is one of the <span class='special-text'>" + data.team + "</span> folks.", "How do you know <span class='special-text'>" + data.name + "</span> is <span class='special-text'>" + data.team + "</span>? Simple. You're good at what you do.", "Piecing the clues together, you conclude that <span class='special-text'>" + data.name + "</span> is <span class='special-text'>" + data.team + "</span> - for sure.", "Is <span class='special-text'>" + data.name + "</span> with the <span class='special-text'>" + data.team + "</span>team? Are you a fantastic detective who stops at nothing to uncover the truth? ...Yes. The answer is yes.", "Pretty opened and closed this time around: <span class='special-text'>" + data.name + "</span> is definitely <span class='special-text'>" + data.team + "</span>."])
						break

						case "special-necromancer":
							event.text = main.chooseRandom(["Chanting the mystical, ancient words, you bring to life those who have died this night: <span class='special-text'>" + data.names.join(" & ") + "</span>.", "You sense that <span class='special-text'>" + data.names.join(" & ") + "</span>. was slain in the darkness - but through the power of the spirits, you bring air back into their lungs that they may breathe again.", "Nope. Not another murder. Not <span class='special-text'>" + data.names.join(" & ") + "</span>. Not as long as you can bring people back to life.", "When the spell is complete, the dead <span class='special-text'>" + data.names.join(" & ") + "</span> will walk again - without any knowledge of their passing onto the other side and back.", "You are a powerful sorcerer, using magic beyond all human understanding to resurrect all those who have died in the last few hours: <span class='special-text'>" + data.names.join(" & ") + "</span>.", "Hey, it worked! The dead person isn't dead anymore! Hooray for <span class='special-text'>" + data.names.join(" & ") + "</span>.", "With all sorts of whooshing sounds and flickery candles and stuff, you pull off a cool party trick - bringing a dead person back to life: <span class='special-text'>" + data.names.join(" & ") + "</span>.", "You weren't fast enough to resurrect " + request.game.flavor.ghost + ", but you have successfully brought back <span class='special-text'>" + data.names.join(" & ") + "</span>."])
						break

						case "special-obscurer":
							event.text = main.chooseRandom(["Some strange magic is obscuring the names - you can't tell who voted how!", "Evil magic blinds you to the identities of the voters.", "Until the obscurer is dead, you won't know which people are voting yes and no.", "Mystery surrounds these votes - the work of the magical obscurer!", "The names cannot be known - they are... obscured."])
						break

						case "special-spellcaster":
							event.text = "The spellcaster is blocking all magical abilities."
						break

					// other
						case "error":
						default:
							event.text = main.chooseRandom(["Uh-oh!", "Hm... something went wrong...", "That's an error:", "Wait a second...", "Nope, that's not gonna work."])
						break
				}

			// return
				return event || {}
		}

	/* createActionEvent */
		module.exports.createActionEvent = createActionEvent
		function createActionEvent(request, data) {
			// create event
				var event = {
					id:      main.generateRandom(),
					created: new Date().getTime(),
					updated: new Date().getTime(),
					day:     request.game.state.day   || 0,
					night:   request.game.state.night || false,
					type:    data.type    || "error",
					viewers: data.viewers || [request.session.id],
					doers:   data.doers   || [request.session.id],
					queue:   data.queue   || false
				}

			// get event content
				switch (data.type) {
					// setup
						case "setup-welcome":
							event.text = main.chooseRandom(["Welcome to Specter Inspectors: the game of ghosts and guesses!", "The game is afoot!", "Boo!", "Here we go!", "Testing, testing, 1, 2, check.", "Hey! How's it going?", "Are you ready for some Specter Inspectors? I know I am.", "I suspect you're expecting Specter Inspectors to connect... You suspect correctly.", "I don't know about you, but I'm very excited for this game.", "SPECTER INSPECTORS will now commence..."])
							event.input = "okay"
							event.options = "Let's go!"
						break

						case "setup-name":
							event.text = main.chooseRandom(["What's your name?", "Can we get a name for you?", "So, who exactly is playing, here?", "Let us begin. Who are you?", "We're gonna get started - first, we'll need a name."])
							event.input = "text"
						break

						case "setup-shirt":
							event.text = main.chooseRandom(["In this game, we're gonna need to know what color shirt you're wearing.", "And can I ask what color shirt you've got on?", "This might be a weird question, but, uh... what color is your shirt?", "All right. Can you tell me what color shirt you've got?", "Next thing, believe it or not, is your shirt color."])
							event.input = "select"
							event.options = ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
						break

						case "setup-pants":
							event.text = main.chooseRandom(["We'll also need to know your pants color.", "And what about your pants?", "Trust me, this is important: what color are your pants?", "Great. And can you tell me what color pants you've got?", "Now I'm gonna need to get the color of your pants."])
							event.input = "select"
							event.options = ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
						break

					// start
						case "start-launch":
							event.text = main.chooseRandom(["Is everybody ready to go?", "Shall we launch the game?", "Is everyone in?", "Are all players accounted for?", "Everybody good to go?", "Can we get this thing going?", "Ready to play?", "Let me know when the rest of them are ready.", "Ready to launch Specter Inspectors, at your command...", "Anyone else we're waiting on?"])
							event.input = "okay"
							event.options = "launch game"
						break

						case "start-role":
							event.text = "In this game, your role will be the <span class='special-text'>" + data.role + "</span>. What does that mean? <br>" + getRoleDescription(data.role, false)
							event.input = "okay"
							event.options = "got it"
						break

					// triggers
						case "trigger-sleep":
							event.text = ""
							event.input = "okay"
							event.options = "end the day"
						break

						case "trigger-wake":
							event.text = ""
							event.input = "okay"
							event.options = "end the night"
						break

					// execution
						case "execution-nomination":
							event.text = main.chooseRandom(["Who do you want to point the finger at for these deaths?", "Who dunnit?", "Who is the killer?", "Who do you blame for the murder?", "Somebody's gotta pay for this murder. But who?", "Who is responsible for this atrocious murder?", "Someone did it - someone killed 'em - but who?", "Who should we execute for committing these crimes?", "One of us is the killer... but which one of us?", "Who deserves to be executed?"])
							event.input = "select"
							event.options = data.options
								var names = []
								data.options.forEach(function (o) { names.push(request.game.players[o].name) })
							event.names = names
						break

						case "execution-poll":
							event.text = main.chooseRandom(["An accusation has been made! " + data.author + " blames <span class='special-text'>" + data.target + "</span>; do you agree?", "What's this? " + data.author + " is pointing the finger at <span class='special-text'>" + data.target + "</span>! What do you think?", "Looks like " + data.author + " thinks <span class='special-text'>" + data.target + "</span> is to blame - do you concur?", "Well, " + data.author + " has accused <span class='special-text'>" + data.target + "</span>. Shall we commence the execution?", "Accusation! " + data.author + " accuses <span class='special-text'>" + data.target + "</span> of murder! What say you?"])
							event.input = "buttons"
							event.options = ["not guilty", "guilty"]
						break

					// murder
						case "murder-nomination":
							event.text = main.chooseRandom(["Who do you want to kill tonight?", "Whose turn is it to die?", "Who should we murder?", "Who do you want to off tonight?", "Somebody's gonna die... but who?", "Who is the next victim?", "Someone has seconds to live - but who?", "Who should we do away with?", "One of these people is a murder victim... but which?", "Who deserves to be executed?"])
							event.input = "select"
							event.options = data.options
								var names = []
								data.options.forEach(function (o) { names.push(request.game.players[o].name) })
							event.names = names
						break

						case "murder-poll":
							event.text = main.chooseRandom(["It seems <span class='special-text'>" + data.author + "</span> has nominated <span class='special-text'>" + data.target + "</span> to die - what's your take?", "It would appear <span class='special-text'>" + data.author + "</span> is ready to murder <span class='special-text'>" + data.target + "</span>... are you?", "Now <span class='special-text'>" + data.author + "</span> wants to kill <span class='special-text'>" + data.target + "</span>. Do you?", "Do you agree with <span class='special-text'>" + data.author + "</span> in murdering <span class='special-text'>" + data.target + "</span>?", "Should we listen to <span class='special-text'>" + data.author + "</span> and kill off <span class='special-text'>" + data.target + "</span>?"])
							event.input = "buttons"
							event.options = ["don't murder", "murder"]
						break

					// dream
						case "dream-name":
							event.text = main.chooseRandom(["Who do you want to give a dream to tonight?", "Whose turn is it to dream?", "Who should have a dream now?", "Who do you want to send a dream to?", "Somebody's gonna dream... but who?", "Who is the next dreamer?", "Someone is about to have a dream - but who?", "Whose perfect night of sleep should we interrupt?", "One of these people is about to have a strange dream - but which one?", "Who needs to get this dream?"])
							event.input = "select"
							event.options = data.options
								var names = []
								data.options.forEach(function (o) { names.push(request.game.players[o].name) })
							event.names = names
						break

						case "dream-color":
							event.text = main.chooseRandom(["And what color should you send?", "What color is it gonna be?", "Pick a hue:", "Let's determine the color:", "Let's make this more colorful:", "Finally, the color:", "Color it in!", "Send them a hue too...", "Select the right color:", "Let's add a little detail:", "Make everything a specific color:", "Send them a clue in color form...", "How should you shade in the details?"])
							event.input = "select"
							event.options = ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
						break

					// random
						case "random-select":
							event.text = main.chooseRandom(["While you're waiting, what's your favorite?", "What's the best?", "Also, we're doing a survey:", "If you had to choose one (and you do), what would you choose?", "So...", "Take your time deciding:", "Which of these is the good one?", "So many options, so little significance:", "What's the worst?", "There's a lot of options, but one is clearly coming out on top...", "Choose!", "Let's hear it!", "Survey says...", "We're just asking for opinions, here.", "The choice is clear:"])
							event.input = "select"
							event.options = main.sortRandom(main.chooseRandom([["red","orange","yellow","green","blue","purple","brown","white","gray","black"], ["shirt", "pants", "shoes"], ["earth", "wind", "fire", "water"], ["spring", "summer", "autumn", "winter"], ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], [0,1,2,3,4,5,6,7,8,9], ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"], ["north", "east", "west", "south"], ["up", "right", "left", "down"], ["rock", "paper", "scissors"], ["africa", "antarctica", "asia", "australia", "europe", "north america", "south america"], ["up", "down", "top", "bottom", "strange", "charmed"], ["circle", "triangle", "square", "pentagon", "hexagon", "septagon", "octagon"], ["like", "love", "haha", "wow", "sad", "angry"], ["flute", "oboe", "clarinet", "saxophone", "bassoon"], ["trumpet", "trombone", "horn", "tuba"], ["violin", "viola", "cello", "bass"], ["guitar", "bass", "drums", "keys"], ["soprano", "alto", "tenor", "bass"], ["baseball", "basketball", "football", "hockey", "soccer", "tennis"], ["velociraptor", "tyrannosaur", "stegasaur", "brachiosaur", "pteradactyl", "triceratops"]]))
						break

						case "random-text":
							event.text = main.chooseRandom(["Type any word you want:", "Go ahead and type a word.", "What's a word you particularly enjoy?", "So, tell me what you had for breakfast.", "What's the farthest you've ever been from home?", "Name a country. Any country.", "What's the best flavor of ice cream?", "If you could be anything, what would it be?", "What's your favorite type of cloud?", "Enter a number. Any number.", "Type your favorite letter.", "Time to button mash. (Letters and numbers only.)", "Wish your friend a happy birthday!", "What is the optimal number of cats?", "How many are we talking, here?", "Best song on the radio right now?", "Anyone you want to shout out?", "Favorite holiday?", "Knock-knock.", "A train is leaving from Chicago at 9 PM traveling east at 45 mph. Another train will leave from NYC at 10:30 PM traveling west at 37.5 mph. Assuming no friction or air resistance, who was driving the bus?", "Which city has the best public transportation system?", "Worst date of the year?", "Favorite font?"])
							event.input = "text"
							event.options = null
						break

						case "random-buttons":
							event.text = main.chooseRandom(["While you're waiting, which is better?", "So uh... click a random button.", "The eternal dilemma...", "What do you like better?", "Which do you prefer?", "Left or right?", "Quick question:", "Just doing a survey here...", "Interested in your thoughts...", "This is very, very important:", "If you could only ever have one, what would you rather have?", "And the award goes to..."])
							event.input = "buttons"
							event.options = main.chooseRandom([["no", "yes"], ["cats", "dogs"], ["left", "right"], ["0", "1"], ["a", "z"], ["circles", "squares"], ["ghosts", "ghouls"], ["detectives", "inspectors"], ["mystery", "horror"], ["chocolate", "vanilla"], ["cookies", "cake"], ["rock-n-roll", "classical"], ["night", "day"], ["ocean", "mountains"], ["urban", "rural"], ["music", "science"], ["buttons", "dropdowns"], ["light", "dark"], ["rain", "sun"], ["scifi", "fantasy"], ["capitalism", "socialism"], ["democracy", "monarchy"], ["iced tea", "cold brew"], ["tea", "coffee"], ["texting", "calling"], ["inside", "outside"], ["board games", "video games"], ["chocolate", "peanut butter"], ["fish", "chicken"], ["astronaut", "astronomer"]])
						break

					// other
						case "error":
						default:
							event.text = main.chooseRandom(["Uh-oh!", "Hm... something went wrong...", "That's an error:", "Wait a second...", "Nope, that's not gonna work."])
						break
				}

			// return
				if (event.next) {
					event.next = event.next.replace(/\t+/gi," ").trim()
				}
				return event || {}
		}

	/* createQueueEvent */
		module.exports.createQueueEvent = createQueueEvent
		function createQueueEvent(request, data) {
			if (!data) { var data = {} }

			// create event
				var event = {
					id:      main.generateRandom(),
					created: new Date().getTime(),
					updated: new Date().getTime(),
					day:     request.game.state.day   || 0,
					night:   request.game.state.night || false,
					type:    "queue",
					for:     data.for    || null,
					author:  data.author || 0,
					target:  data.target || 0,
					viewers: [],
					doers:   data.doers  || Object.keys(request.game.players),
					results: {}
				}

			// return
				return event || {}
		}

/*** helpers ***/
	/* getRoleDescription */
		module.exports.getRoleDescription = getRoleDescription
		function getRoleDescription(role, quick) {
			switch (role) {
				// evil magic
					case "spellcaster":
						var long = "You are <span class='special-text red'>evil</span>. You are <span class='special-text purple'>magic</span>. <br>As long as you're alive, no one's magic abilities will work! Mwuahahahahaha!"
						var short = "evil, magic; prevents all other magic abilities from working"
					break

					case "obscurer":
						var long = "You are <span class='special-text red'>evil</span>. You are <span class='special-text purple'>magic</span>. <br>As long as you're alive, no one will know how people vote in execution polls - all the names will disappear from their minds!"
						var short = "evil, magic; when poll results are revealed, names will be hidden"
					break

					case "dreamsnatcher":
						var long = "You are <span class='special-text red'>evil</span>. You are <span class='special-text purple'>magic</span>. <br>Every night, all the ghost-crafted dreams will be absorbed into your mind - as well as floating off to their intended recipients."
						var short = "evil, magic; sees all ghost dreams every night"
					break

					case "cheater":
						var long = "You are <span class='special-text red'>evil</span>. You are <span class='special-text'>not magic</span>. <br>Every time there's an execution poll, you'll change one random vote to match your own. Nobody will suspect a thing! Except, you know... that person."
						var short = "evil, not magic; one random vote is switched to match this player's during each poll"
					break

				// evil normal
					case "killer":
						var long = "You are <span class='special-text red'>evil</span>. You are <span class='special-text'>not magic</span>. <br>Your goal is to kill off all the good people, at least until your team is just as big as theirs. You and any fellow killers can coordinate at night in the chat tab."
						var short = "evil, not magic; can chat with other evil players at night"
					break

				// good magic
					case "telepath":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>You want to get out of here alive, just like everyone else - and that means figuring out who the killers are. Luckily, you and the other telepath can read each others' minds during the day... in the chat tab."
						var short = "good, magic; can chat with the other telepath during the day"
					break

					case "augur":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>And you don't want to be murdered! To help you survive, you can read others' auras. Specifically, when someone is executed during the day, you can tell if they were good or evil - in the moment they pass from this world."
						var short = "good, magic; learns allegiance of each executed player"
					break

					case "clairvoyant":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>And you can sense magic around people - but only once their souls have left their bodies. That means you can determine if the recently deceased have special magical abilities. <br>(telepath, augur, medium, seer, psychic, empath, immortal, necromancer, spellcaster, obscurer, dreamsnatcher)"
						var short = "good, magic; learns magic-ness of each executed or murdered player"
					break

					case "medium":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>You'd prefer not to be killed and turned into a ghost. But you have a pretty good understanding of ghosts - in fact, when ghosts communicate with you through dreams, you know who's talking!"
						var short = "good, magic; sees name of ghost sending each dream received"
					break

					case "psychic":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>And as it happens, you have an extrasensory ability to judge people's morals. Whenever another player proposes an execution, you can sense if the accused and accuser are on the same team - even if they can't."
						var short = "good, magic; learns if allegiance of accused and accuser matches during each execution nomination"
					break

					case "seer":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>For you, dreams are plentiful and powerful, and they come to you every night. In fact, you receive every dream sent by every ghost, no matter who that dream was intended for."
						var short = "good, magic; sees all ghost dreams every night"
					break

					case "empath":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>You can make other people feel whatever emotions you want - and that means every time there's a poll, one random player will vote the way you feel."
						var short = "good, magic; one random vote is switched to match this player's during each poll"
					break

					case "immortal":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>You cannot die... well... mostly. Your power protects you from being murdered in the nighttime. In fact, you'll sleep right through it."
						var short = "good, magic; cannot be murdered at night"
					break

					case "necromancer":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text purple'>magic</span>. <br>As long as you're alive, you can bring back the dead - and that means anyone who's murdered at night will wake up all the same the next morning."
						var short = "good, magic; immediately resurrects murdered players every night"
					break

				// good normal
					case "detective":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text'>not magic</span>. <br>Each night, you'll do a bit of investigative work and ascertain the allegiance - good or evil - of some random person."
						var short = "good, not magic; learns allegiance of one random player every night"
					break

					case "illusionist":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text'>not magic</span>. <br>The first time someone tries to murder you, you'll almost certainly find a way to disappear and escape - though you probably won't get much sleep that night. But the second time? Yeah, they'll definitely get you the second time."
						var short = "good, not magic; escapes from murder on first attempt"
					break

					case "watchkeeper":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text'>not magic</span>. <br>As long as you're alive, you can protect people - you can fight off the killers, every time, if they go after anyone else. Unfortunately, the murderers will see who you are and will probably go after you next!"
						var short = "good, not magic; prevents murder of others each night, but reveals identity"
					break

					case "insomniac":
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text'>not magic</span>. <br>You can't sleep - too scared of all these murderers! But that means you can hear what the killers are up to each night - specifically, who they're thinking about killing."
						var short = "good, not magic; sees names of murder nomination targets, but cannot receive dreams"
					break

					case "person":
					default:
						var long = "You are <span class='special-text blue'>good</span>. You are <span class='special-text'>not magic</span>. <br>And you just want to live! There are some other people on your side with some special abilities, but you're not sure who's who."
						var short = "good, not magic; no special ability"
					break
			}
			
			// short or long ?
				if ((typeof quick !== "undefined") && quick) {
					return short
				}
				else {
					return long
				}
		}
	
	/* checkQueue */
		module.exports.checkQueue = checkQueue
		function checkQueue (request, failure, success) {
			var queue   = request.game.events[request.event.queue] || false

			// no queue or not on queue
				if (!queue) {
					failure({success: false, message: "This queue cannot be found."})
				}
				else if (queue.doers.indexOf(request.session.id) == -1) {
					failure({success: false, message: "You're not in this queue!"})
				}

			// remove from queue, add results to queue and initiating event
				else {
					var set = {}
						set.updated = new Date().getTime()
						set["events." + request.event.id + ".doers"] = request.event.doers = []
						set["events." +         queue.id + ".doers"] = queue.doers = queue.doers.filter(function (p) { return p !== request.session.id })

					if (typeof request.post.value !== "undefined" && request.post.value !== null) {
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + queue.id + ".results." + request.session.id] = queue.results[request.session.id] = request.post.value
					}
				
					main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
						// incomplete
							if (queue.doers.length > 0) {
								var waitingEvent = createStaticEvent(request, {type: "decision-waiting", viewers: [request.session.id]})
								failure({success: true, events: [waitingEvent]})
							}

						// complete
							else {
								success(queue)
							}
					})
				}
		}

/*** event actions ***/
	/* setupPlayer */
		module.exports.setupPlayer = setupPlayer
		function setupPlayer(request, callback) {
			if (["setup-welcome","setup-name","setup-shirt","setup-pants"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "This is not a valid setup event."})
			}
			else if (request.game.state.start) {
				callback({success: false, message: "This game already started."})
			}
			else {
				var myEvents = []
				var set = {}
					set.updated = new Date().getTime()

				// complete event and create next event
					if (request.event.type == "setup-welcome") {
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var gamecodeEvent = createStaticEvent(request, {type: "setup-gamecode", viewers: [request.session.id]})
						set["events." + gamecodeEvent.id] = gamecodeEvent
						myEvents.push(gamecodeEvent)

						var setupEvent = createActionEvent(request, {type: "setup-name"})
						set["events." + setupEvent.id] = setupEvent
						myEvents.push(setupEvent)
					}
					if (request.event.type == "setup-name") {
						set["players." + request.session.id + ".name"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []

						var setupEvent = createActionEvent(request, {type: "setup-shirt"})
						set["events." + setupEvent.id] = setupEvent
						myEvents.push(setupEvent)
					}
					else if (request.event.type == "setup-shirt") {
						set["players." + request.session.id + ".colors.shirt"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var setupEvent = createActionEvent(request, {type: "setup-pants"})
						set["events." + setupEvent.id] = setupEvent
						myEvents.push(setupEvent)
					}
					else if (request.event.type == "setup-pants") {
						set["players." + request.session.id + ".colors.pants"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []	
					}

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					if (!data) {
						callback({success: false, message: "Unable to save player data..."})
					}
					else if (request.event.type !== "setup-pants") { // continue
						callback({success: true, events: myEvents})
					}
					else { // checkQueue
						request.event.queue = Object.keys(request.game.events).find(function (e) { return (request.game.events[e].author == "welcome") })

						checkQueue(request, function(results) { // failure
							callback(results)
						}, function(queue) { // success
							var players = Object.keys(request.game.players)
							
							// don't add launch event for players who already have one
								var existingLaunchEvents = Object.keys(request.game.events).filter(function (e) { return request.game.events[e].type == "start-launch" })
								for (var e in existingLaunchEvents) {
									players = players.filter(function (p) { 
										return request.game.events[existingLaunchEvents[e]].viewers.indexOf(p) == -1
									})
								}

							var myEvents = []
							var set = {}
								set.updated = new Date().getTime()

							for (var p in players) {
								var launchEvent = createActionEvent(request, {type: "start-launch", viewers: [players[p]], doers: [players[p]]})
								set["events." + launchEvent.id] = launchEvent

								if (players[p] == request.session.id) {
									myEvents.push(launchEvent)
								}
							}

							main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
								callback({success: true, events: myEvents})
							})
						})
					}
				})
			}
		}

	/* launchGame */
		module.exports.launchGame = launchGame
		function launchGame(request, callback) {
			if (["start-launch"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "This is not a launch event."})
			}
			else if (request.game.state.start) {
				callback({success: false, message: "This game already launched."})
			}
			else if (Object.keys(request.game.players).length < 5) {
				callback({success: false, message: "You need 5+ players to play."})
			}
			else if (Object.keys(request.game.events).filter(function (e) { return ((request.game.events[e].author == "welcome") && (request.game.events[e].doers.length)) }).length) {
				callback({success: false, message: "Other players are still setting up."})
			}
			else {
				// get team sizes
					var players          = Object.keys(request.game.players)
					var evilCount        = Math.floor(players.length / 3)
					var evilSpecialCount = Math.floor(evilCount / 2)
					var goodCount        = players.length - evilCount
					var goodSpecialCount = Math.floor(goodCount / 2)
					var roles            = []

				// evil
					// get list
						var availableEvil = []
						if (players.length >= 5) {
							availableEvil.push("dreamsnatcher")
						}
						if (players.length >= 7) {
							availableEvil.push("obscurer")
						}
						if (players.length >= 9) {
							availableEvil.push("cheater")
						}
						if (players.length >= 11) {
							availableEvil.push("spellcaster")
						}

					// generate specials
						while (roles.length < evilSpecialCount) {
							do {
								var next = main.chooseRandom(availableEvil)
							} while (roles.indexOf(next) !== -1)
							roles.push(next)
						}

					// generate normals
						while (roles.length < evilCount) {
							roles.push("killer")
						}

				// good
					// get list
						var availableGood = []
						roles.push(main.chooseRandom(["necromancer", "immortal", "illusionist"]))

						if (players.length >= 5) {
							availableGood.push("necromancer")
							availableGood.push("illusionist")
							availableGood.push("augur")
							availableGood.push("clairvoyant")
							availableGood.push("medium")
							availableGood.push("seer")
						}
						if (players.length >= 7) {
							availableGood.push("immortal")
							availableGood.push("insomniac")
							availableGood.push("psychic")
						}
						if (players.length >= 9) {
							availableGood.push("empath")
							availableGood.push("telepath")
							availableGood.push("telepath")
						}
						if (players.length >= 11) {
							roles.push("detective")
							roles.push("watchkeeper")

							availableGood = availableGood.filter(function (a) { return a !== "necromancer" })
							roles = roles.filter(function (r) { return r !== "necromancer" })
						}

					// generate specials
						while (roles.length < (evilCount + goodSpecialCount)) {
							do {
								var next = main.chooseRandom(availableGood)
							} while (roles.indexOf(next) !== -1)

							if ((next == "telepath") && ((roles.length + 2) < (evilCount + goodSpecialCount))) {
								roles.push(next)
								roles.push(next)
							}
							else if (next !== "telepath") {
								roles.push(next)
							}
						}

					// generate normals
						while (roles.length < players.length) {
							roles.push("person")
						}

				// shuffle roles
					roles = main.sortRandom(roles)

				// start game
					var myEvents = []
					var set = {}
						set.updated = new Date().getTime()
						set["state.start"] = new Date().getTime()

				// create queue after players see role
					var queueEvent = createQueueEvent(request, {for: "story-day"})
					set["events." + queueEvent.id] = queueEvent

				// create inciting event
					var incitingEvent = createStaticEvent(request, {type: "start-story"})
					set["events." + incitingEvent.id] = incitingEvent
					myEvents.push(incitingEvent)

				// create players event
					var infoArray = []
					for (var p in players) {
						var player = request.game.players[players[p]]
						infoArray.push("<span class='special-text'>" + player.name + "</span> : <span class='special-text " + player.colors.shirt + "'>" + player.colors.shirt + "</span> shirt, <span class='special-text " + player.colors.pants + "'>" + player.colors.pants + "</span> pants... ")
					}

					var rolesArray = []
					for (var r in roles)  {
						if (["killer", "spellcaster", "obscurer", "dreamsnatcher", "cheater"].indexOf(roles[r]) !== -1) {
							var color = "red"
						}
						else {
							var color = "blue"
						}
						
						rolesArray.push("<details><summary class='special-text " + color + "'>" + roles[r] + "</summary><p>" + getRoleDescription(roles[r], true) + "</p></details>")
					}

					var playersEvent = createStaticEvent(request, {type: "start-players", players: infoArray, roles: rolesArray})
					set["events." + playersEvent.id] = playersEvent
					myEvents.push(playersEvent)

				// create notes event
					var notesEvent = createStaticEvent(request, {type: "start-notes"})
					set["events." + notesEvent.id] = notesEvent
					myEvents.push(notesEvent)

				// shuffle some more
					roles = main.sortRandom(roles)

				// assign roles & role events
					for (var p = 0; p < players.length; p++) {
						set["players." + players[p] + ".status.role"] = request.game.players[players[p]].status.role = roles[p]

						var roleEvent = createActionEvent(request, {type: "start-role", viewers: [players[p]], doers: [players[p]], role: roles[p], queue: queueEvent.id})
						set["events." + roleEvent.id] = roleEvent

						if (["killer", "spellcaster", "obscurer", "dreamsnatcher", "cheater"].indexOf(roles[p]) !== -1) {
							set["players." + players[p] + ".status.good"] = request.game.players[players[p]].status.good = false
						}

						if (["telepath", "augur", "clairvoyant", "medium", "psychic", "seer", "necromancer", "empath", "immortal", "spellcaster", "obscurer", "dreamcatcher"].indexOf(roles[p]) !== -1) {
							set["players." + players[p] + ".status.magic"] = request.game.players[players[p]].status.magic = true
						}

						if (players[p] == request.session.id) {
							myEvents.push(roleEvent)
						}
					}					
				
				// hide launch events
					var launchEvents = Object.keys(request.game.events).filter(function (e) { return request.game.events[e].type == "start-launch" })
					for (var l in launchEvents) {
						set["events." + launchEvents[l] + ".doers"]   = []
						set["events." + launchEvents[l] + ".viewers"] = []
					}

				// save data
					main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
						if (!data) {
							callback({success: false, message: "Unable to launch game..."})
						}
						else {
							callback({success: true, events: myEvents})
						}
					})					
			}
		}

	/* createDay */
		module.exports.createDay = createDay
		function createDay(request, callback) {
			if (["start-role", "trigger-wake"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "You can't create a day from this event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else {
				checkQueue(request, function (results) { // failure
					callback(results)
				}, function (queue) { // success
					// get data
						var players = Object.keys(request.game.players)
						var dreams  = Object.keys(request.game.temporary.dreams) || []
						var killed  = request.game.temporary.killed || []

					// set data
						var myEvents = []
						var set = {}
							set["state.day"]   = request.game.state.day   = Number(request.game.state.day) + 1
							set["state.night"] = request.game.state.night = false
							set.updated        = new Date().getTime()

					// disable old events
						var oldEvents = Object.keys(request.game.events).filter(function (e) {
							return (request.game.events[e].day == request.game.state.day - 1)
						})
						for (var o in oldEvents) {
							set["events." + oldEvents[o] + ".doers"] = []
						}

					// preventing death
						// specials
							var spellcaster = players.find(function (p) { // special-spellcaster
								return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "spellcaster"))
							}) || null

							var necromancer = players.find(function (p) { // special-necromancer
								return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "necromancer"))
							}) || null

							var watchkeeper = players.find(function (p) { // special-watchkeeper
								return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "watchkeeper"))
							}) || null

							var illusionist = players.find(function (p) { // special-illusionist
								return (request.game.players[p].status.alive && (request.game.players[p].status.role == "illusionist"))
							}) || null

							var immortal = players.find(function (p) { // special-immortal
								return (request.game.players[p].status.alive && !spellcaster && (request.game.players[p].status.role == "immortal"))
							}) || null

							var killers = players.filter(function (p) {
								return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && !request.game.players[p].status.good)
							}) || []

						// special-watchkeeper
							if (watchkeeper && killed.length) {
								var killedNames = []
								for (var k in killed) {
									killedNames.push(request.game.players[killed[k]].name)
								}
								
								var watchkeeperEvent = createStaticEvent(request, {type: "special-watchkeeper", viewers: killers.concat([watchkeeper]), watchkeeper: request.game.players[watchkeeper].name, targets: killedNames})
								set["events." + watchkeeperEvent.id] = watchkeeperEvent

								if ((watchkeeper == request.session.id) || (killers.indexOf(request.session.id) !== -1)) {
									myEvents.push(watchkeeperEvent)
								}

								killed = []
							}

						// special-immortal
							if (immortal && (killed.indexOf(immortal) !== -1)) {
								var immortalEvent = createStaticEvent(request, {type: "special-immortal", viewers: [immortal]})
								set["events." + immortalEvent.id] = immortalEvent

								if (immortal == request.session.id) {
									myEvents.push(immortalEvent)
								}

								killed = killed.filter(function (k) { return k !== immortal })
							}

						// special-illusionist
							if (illusionist && (killed.indexOf(illusionist) !== -1) && (request.game.players[illusionist].status.unsafe == undefined || !request.game.players[illusionist].status.unsafe)) {
								var illusionistEvent = createStaticEvent(request, {type: "special-illusionist", viewers: [illusionist]})
								set["events." + illusionistEvent.id] = illusionistEvent
								set["players." + illusionist + ".status.unsafe"] = true

								if (illusionist == request.session.id) {
									myEvents.push(illusionistEvent)
								}

								killed = killed.filter(function (k) { return k !== illusionist })
							}

						// special-necromancer
							if (necromancer && killed.length) {
								var killedNames = []
								for (var k in killed) {
									killedNames.push(request.game.players[killed[k]].name)
								}
								
								var necromancerEvent = createStaticEvent(request, {type: "special-necromancer", viewers: [necromancer], names: killedNames})
								set["events." + necromancerEvent.id] = necromancerEvent

								if (necromancer == request.session.id) {
									myEvents.push(necromancerEvent)
								}

								killed = []				
							}

					// more specials
						var seer = players.find(function (p) { // special-seer
							return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "seer"))
						}) || null

						var insomniac = players.find(function (p) { // special-insomniac
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "insomniac"))
						}) || null

						var medium = players.find(function (p) { // special-medium
							return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "medium"))
						}) || null

						var clairvoyant = players.find(function (p) { // special-clairvoyant
							return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "clairvoyant"))
						}) || null

						var detective = players.find(function (p) { // special-detective
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "detective"))
						}) || null

						var dreamsnatcher = players.find(function (p) { // special-dreamsnatcher
							return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "dreamsnatcher"))
						}) || null

						var telepaths = players.filter(function (p) { // special-telepath
							return (request.game.players[p].status.alive && !spellcaster && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "telepath"))
						}) || []

					// special-detective
						if (detective) {
							var alive = players.filter(function (p) { return (request.game.players[p].status.alive && (p !== detective)) })
							var suspect = main.chooseRandom(alive)
							var detectiveEvent = createStaticEvent(request, {type: "special-detective", viewers: [detective], name: request.game.players[suspect].name, team: (request.game.players[suspect].status.good ? "good" : "evil") })
							set["events." + detectiveEvent.id] = detectiveEvent

							if (request.session.id == detective) {
								myEvents.psuh(detectiveEvent)
							}
						}

					// day
						var dayEvent = createStaticEvent(request, {type: "story-day"})
						set["events." + dayEvent.id] = dayEvent
						myEvents.push(dayEvent)

					// first day only
						if (request.game.state.day == 1) {
							var firstDayEvent = createStaticEvent(request, {type: "start-day"})
							set["events." + firstDayEvent.id] = firstDayEvent
							myEvents.push(firstDayEvent)
							
						// start-evil
							var evil = Object.keys(request.game.players).filter(function (p) {
								return !request.game.players[p].status.good
							})
							
							var evilNames = []
							for (var e in evil) {
								evilNames.push("<span class='special-text'>" + request.game.players[evil[e]].name + "</span>")	
							}
							
							var evilEvent = createStaticEvent(request, {type: "start-evil", viewers: evil, names: evilNames})
							set["events." + evilEvent.id] = evilEvent
							
							if (evil.indexOf(request.session.id) !== -1) {
								myEvents.push(evilEvent)
							}
					
						// special-spellcaster
							if (spellcaster) {
								var spellcasterEvent = createStaticEvent(request, {type: "special-spellcaster"})
								set["events." + spellcasterEvent.id] = spellcasterEvent
								myEvents.push(spellcasterEvent)
							}

						// special-telepath
							if (telepaths && telepaths.length) {
								var telepathEvent = createStaticEvent(request, {type: "special-telepath", viewers: telepaths})
								set["events." + telepathEvent.id] = telepathEvent

								if (telepaths.indexOf(request.session.id) !== -1) {
									myEvents.push(telepathEvent)
								}
							}
						}

					// dreams (subsequent days)
						else if (request.game.state.day > 1) {
							// ai dream
								var sleepers = players.filter(function(s) {
									return (request.game.players[s].status.alive && (killed.indexOf(s) == -1) && (s !== insomniac)) // special-insomniac
								})

								var suspect   = main.chooseRandom(sleepers)
								var slumberer = main.chooseRandom(sleepers)
								var item      = main.chooseRandom(["shirt", "pants"])

								var aiDreamEvent = createStaticEvent(request, {type: "story-dream", viewers: [slumberer, seer, dreamsnatcher], color: request.game.players[suspect].colors[item]}) // special-seer
								set["events." + aiDreamEvent.id] = aiDreamEvent

								if ((slumberer == request.session.id) || (request.session.id == seer)) { // special-seer
									myEvents.push(aiDreamEvent)
								}

								// special-medium
									if (slumberer == medium) {
										var mediumEvent = createStaticEvent(request, {type: "special-medium", viewers: [medium], name: request.game.flavor.ghost})
										set["events." + mediumEvent.id] = mediumEvent

										if (slumberer == request.session.id) {
											myEvents.push(mediumEvent)
										}
									}

								sleepers = sleepers.filter(function (p) { return p !== slumberer })

							// ghost dreams
								for (var d in dreams) {
									var dream = request.game.temporary.dreams[dreams[d]] || false
									
									if (dream && dream.target && dream.color) {
										sleepers = sleepers.filter(function (p) { return p !== dream.target })
										
										if (request.game.players[dream.target].status.alive && (killed.indexOf(dream.target) == -1) && (dream.target !== insomniac)) { // special-insomniac
											var dreamEvent = createStaticEvent(request, {type: "story-dream", viewers: [dream.target, seer, dreamsnatcher], color: dream.color}) // special-seer
											set["events." + dreamEvent.id] = dreamEvent

											if ((dream.target == request.session.id) || request.session.id == seer || request.session.id == dreamsnatcher) { // special-seer // special-dreamsnatcher
												myEvents.push(dreamEvent)
											}

											// special-medium
												if (dream.target == medium) {
													var mediumEvent = createStaticEvent(request, {type: "special-medium", viewers: [medium], name: request.game.players[dreams[d]].name})
													set["events." + mediumEvent.id] = mediumEvent

													if (medium == request.session.id) {
														myEvents.push(mediumEvent)
													}
												}
										}
									}
								}

							// fake dreams
								for (var s in sleepers) {
									var fakeDreamEvent = createStaticEvent(request, {type: "story-sleep", viewers: [sleepers[s]]})
									set["events." + fakeDreamEvent.id] = fakeDreamEvent

									if (sleepers[s] == request.session.id) {
										myEvents.push(fakeDreamEvent)
									}
								}
						}

					// murders
						if ((!killed || killed.length == 0) && (request.game.state.day > 1)) {
							var safeEvent = createStaticEvent(request, {type: "story-safe"})
							set["events." + safeEvent.id] = safeEvent
							myEvents.push(safeEvent)
						}
						else {
							for (var k in killed) {
								set["players." + killed[k] + ".status.alive"] = request.game.players[killed[k]].status.alive = false

								var murderEvent = createStaticEvent(request, {type: "story-murder", name: request.game.players[killed[k]].name})
								set["events." + murderEvent.id] = murderEvent
								myEvents.push(murderEvent)

								var ghostEvent = createStaticEvent(request, {type: "story-ghost", viewers: [killed[k]]})
								set["events." + ghostEvent.id] = ghostEvent
								if (killed[k] == request.session.id) {
									myEvents.push(ghostEvent)
								}

								// special-clairvoyant
									if (clairvoyant) {
										var magic = request.game.players[killed[k]].status.magic ? "magic" : "not magic"

										var clairvoyantEvent = createStaticEvent(request, {type: "special-clairvoyant", viewers: [clairvoyant], magic: magic})
										set["events." + clairvoyantEvent.id] = clairvoyantEvent
										if (clairvoyant == request.session.id) {
											myEvents.push(clairvoyantEvent)
										}
									}

							}
						}

					// check for game end
						var alive     = players.filter(function(p) { return  request.game.players[p].status.alive })
						var goodAlive =   alive.filter(function(p) { return  request.game.players[p].status.good  })
						var evilAlive =   alive.filter(function(p) { return !request.game.players[p].status.good  })

						if (evilAlive.length == 0) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "good"
							
							var goodEvent = createStaticEvent(request, {type: "end-good"})
							set["events." + goodEvent.id] = goodEvent
							myEvents.push(goodEvent)
						}
						else if (goodAlive.length <= evilAlive.length) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "evil"
							
							var evilEvent = createStaticEvent(request, {type: "end-evil"})
							set["events." + evilEvent.id] = evilEvent
							myEvents.push(evilEvent)
						}
						else {
							// night queue and trigger-sleep
								var queueEvent = createQueueEvent(request, {for: "story-night", doers: players})
								set["events." + queueEvent.id] = queueEvent

								for (var p in players) {
									var sleepEvent = createActionEvent(request, {type: "trigger-sleep", viewers: [players[p]], doers: [players[p]], queue: queueEvent.id})
									set["events." + sleepEvent.id] = sleepEvent

									if (players[p] == request.session.id) {
										myEvents.push(sleepEvent)
									}
								}								

							// execution-nomination and sleep								
								for (var a in alive) {
									var others = alive.filter(function (p) { return p !== alive[a] })
									var nominationEvent = createActionEvent(request, {type: "execution-nomination", viewers: [alive[a]], doers: [alive[a]], options: main.sortRandom(others)})
									set["events." + nominationEvent.id] = nominationEvent

									if (alive[a] == request.session.id) {
										myEvents.push(nominationEvent)
									}
								}
						}

					// wipe temporary
						set["temporary.killed"] = request.game.temporary.killed = []
						set["temporary.dreams"] = request.game.temporary.dreams = {}

					// update data and make new events
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create day..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})

				})
			}
		}

	/* createNight */
		module.exports.createNight = createNight
		function createNight(request, callback) {
			if (["trigger-sleep"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "You cannot create a night from this event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else {
				checkQueue(request, function (results) { // failure
					callback(results)
				}, function (queue) { // success
					// get data
						var players = Object.keys(request.game.players)
						var killers = []
						var ghosts  = []
						var persons = []
						var alive   = []
						
						for (var p in players) {
							if (!request.game.players[players[p]].status.alive) {
								ghosts.push(players[p])
							}
							else if (!request.game.players[players[p]].status.good) {
								killers.push(players[p])
								alive.push(players[p])
							}
							else {
								persons.push(players[p])
								alive.push(players[p])
							}
						}

					// set data
						var myEvents = []
						var set = {}
							set["state.night"]      = request.game.state.night      = true
							set["temporary.killed"] = request.game.temporary.killed = []
							set["temporary.dreams"] = request.game.temporary.dreams = {}
							set.updated         = new Date().getTime()

					// disable old events
						var oldEvents = Object.keys(request.game.events).filter(function (e) {
							return (request.game.events[e].day == request.game.state.day)
						})
						for (var o in oldEvents) {
							set["events." + oldEvents[o] + ".doers"] = []
						}

					// night
						var nightEvent = createStaticEvent(request, {type: "story-night"})
						set["events." + nightEvent.id] = nightEvent
						myEvents.push(nightEvent)
						
						var queueEvent = createQueueEvent(request, {for: "story-day"})
						set["events." + queueEvent.id] = queueEvent

					// first night only
						if (request.game.state.day == 1) {
							var explainEvent = createStaticEvent(request, {type: "start-night"})
							set["events." + explainEvent.id] = explainEvent
							myEvents.push(explainEvent)
						}

					// wake (for ghosts / killers)
						for (var p in players) {
							// alive/good can't see it until after randoms
								if (persons.indexOf(players[p]) == -1) {
									var wakeEvent = createActionEvent(request, {type: "trigger-wake", viewers: [players[p]], doers: [players[p]], queue: queueEvent.id})
									set["events." + wakeEvent.id] = wakeEvent

									if (players[p] == request.session.id) {
										myEvents.push(wakeEvent)
									}
								}
						}
					
					// ghosts
						var oldGhosts = []
						var oldGhostEvents = Object.keys(request.game.events).filter(function (e) { return request.game.events[e].type == "special-ghost" })
						for (var o in oldGhostEvents) {
							oldGhosts.push(request.game.events[oldGhostEvents[o]].viewers[0])
						}

						for (var g in ghosts) {
							console.log("next ghost is: " + request.game.players[ghosts[g]].name)
							if (oldGhosts.indexOf(ghosts[g]) == -1) {
								var newGhostEvent = createStaticEvent(request, {type: "special-ghost", viewers: [ghosts[g]]})
								set["events." + newGhostEvent.id] = newGhostEvent

								if (ghosts[g] == request.session.id) {
									myEvents.push(newGhostEvent)
								}
							}

							var living = alive
							var ghostEvent = createActionEvent(request, {type: "dream-name", viewers: [ghosts[g]], doers: [ghosts[g]], queue: queueEvent.id, options: main.sortRandom(living)})
							set["events." + ghostEvent.id] = ghostEvent

							if (ghosts[g] == request.session.id) {
								myEvents.push(ghostEvent)
							}
						}

					// first night only
						if (request.game.state.day == 1) {
							var killerChatEvent = createStaticEvent(request, {type: "special-killer", viewers: killers})
							set["events." + killerChatEvent.id] = killerChatEvent

							if (killers.indexOf(request.session.id) !== -1) {
								myEvents.push(killerChatEvent)
							}

							var randomExplanation = createStaticEvent(request, {type: "random-why", viewers: persons})
							set["events." + randomExplanation.id] = randomExplanation

							if (persons.indexOf(request.session.id) !== -1) {
								myEvents.push(randomExplanation)
							}
						}

					// killers
						for (var k in killers) {
							var killerEvent = createActionEvent(request, {type: "murder-nomination", options: main.sortRandom(alive), viewers: [killers[k]], doers: [killers[k]]})
							set["events." + killerEvent.id] = killerEvent

							if (killers[k] == request.session.id) {
								myEvents.push(killerEvent)
							}
						}

					// random (for persons)
						for (var p in persons) {
							var randomEvent = createActionEvent(request, {type: "random-select", viewers: [persons[p]], doers: [persons[p]]})
							set["events." + randomEvent.id] = randomEvent

							if (persons[p] == request.session.id) {
								myEvents.push(randomEvent)
							}
						}

					// update data and make new events
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create night..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})
				})
			}
		}

	/* executePlayer */
		module.exports.executePlayer = executePlayer
		function executePlayer(request, callback) {
			if (["execution-nomination", "execution-poll"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "You cannot execute a player from this event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else if (request.event.doers.indexOf(request.session.id) == -1) {
				callback({success: false, message: "You're not on this event!"})
			}
			else if (request.event.type == "execution-nomination") {
				var otherQueues = Object.keys(request.game.events).filter(function (e) { return ((request.game.events[e].day == request.game.state.day) && (request.game.events[e].type == "queue") && (request.game.events[e].for == "execution-poll") && (request.game.events[e].doers.length > 0)) })
				if (otherQueues.length) {
					callback({success: false, message: "There's already a poll in progress."})
				}
				else if (!request.post.value || Object.keys(request.game.players).indexOf(request.post.value) == -1) {
					callback({success: false, message: "That's not a valid target."})
				}
				else {
					// set data
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()
							set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
							set["events." + request.event.id + ".doers"]  = request.event.doers  = []

					// specials
						var spellcaster = Object.keys(request.game.players).find(function (p) { // special-spellcaster
							return (request.game.players[p].status.alive && (request.game.players[p].status.role == "spellcaster"))
						}) || null

						var psychic = Object.keys(request.game.players).find(function (p) { // special-psychic
							return (request.game.players[p].status.alive && !spellcaster && (request.game.players[p].status.role == "psychic"))
						}) || null

					// create queue
						var players = Object.keys(request.game.players)
						var queueEvent = createQueueEvent(request, {for: "execution-poll", author: request.session.id, target: request.post.value, doers: players.filter(function(p) { return ((request.game.players[p].id !== request.post.value) && (request.game.players[p].status.alive)) }) })
						set["events." + queueEvent.id] = queueEvent

					// create poll event
						for (var p in players) {
							if (request.game.players[players[p]].status.alive && (players[p] !== request.post.value)) {
								var pollEvent = createActionEvent(request, {type: "execution-poll", author: request.game.players[request.session.id].name, target: request.game.players[request.post.value].name, viewers: [players[p]], doers: [players[p]], queue: queueEvent.id})
								set["events." + pollEvent.id] = pollEvent

								if (players[p] == request.session.id) {
									myEvents.push(pollEvent)
								}
							}
						}

					// accused event
						var accusedEvent = createStaticEvent(request, {type: "story-accusation", author: request.game.players[request.session.id].name, viewers: [request.post.value]})
						set["events." + accusedEvent.id] = accusedEvent

					// special-psychic
						if (psychic) {
							if (request.game.players[request.post.value].status.good == request.game.players[request.session.id].status.good) {
								var match = "the same team"
							}
							else {
								var match = "different teams"
							}

							var psychicEvent = createStaticEvent(request, {type: "special-psychic", viewers: [psychic], match: match})
							set["events." + psychicEvent.id] = psychicEvent

							if (psychic == request.session.id) {
								myEvents.push(psychicEvent)
							}
						}

					// update data
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create an execution poll..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})
				}
			}
			else if (request.event.type == "execution-poll") {
				checkQueue(request, function (results) { // failure
					callback(results)
				}, function (queue) { // success
					// get info
						var author   = queue.author
						var target   = queue.target
						var voters   = Object.keys(queue.results)
						var pro      = []
						var anti     = []
						var proText  = []
						var antiText = []

					// set info
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()

					// specials
						var spellcaster = Object.keys(request.game.players).find(function (p) { // special-spellcaster
							return (request.game.players[p].status.alive && (request.game.players[p].status.role == "spellcaster"))
						}) || null

						var clairvoyant = Object.keys(request.game.players).find(function (p) { // special-clairvoyant
							return (request.game.players[p].status.alive && !spellcaster && (p !== target) && (request.game.players[p].status.role == "clairvoyant"))
						}) || null

						var augur = Object.keys(request.game.players).find(function (p) { // special-augur
							return (request.game.players[p].status.alive && !spellcaster && (p !== target) && (request.game.players[p].status.role == "augur"))
						}) || null

						var empath = Object.keys(request.game.players).find(function (p) { // special-empath
							return (request.game.players[p].status.alive && !spellcaster && (p !== target) && (request.game.players[p].status.role == "empath"))
						}) || null

						var cheater = Object.keys(request.game.players).find(function (p) { // special-cheater
							return (request.game.players[p].status.alive && (p !== target) && (request.game.players[p].status.role == "cheater"))
						}) || null

						var obscurer = Object.keys(request.game.players).find(function (p) { // special-obscurer
							return (request.game.players[p].status.alive && !spellcaster && (request.game.players[p].status.role == "obscurer"))
						}) || null

					// determine pro and anti
						for (var v in voters) {
							if (Number(queue.results[voters[v]]) == 1) {
								pro.push(voters[v])
							}
							else {
								anti.push(voters[v])
							}
						}

					// special-empath
						if (empath) {
							if ((pro.indexOf(empath) !== -1) && anti.length) {
								var switchID = main.chooseRandom(anti)
								anti = anti.filter(function (p) { return p !== switchID })
								pro.push(switchID)
							}
							else if ((anti.indexOf(empath) !== -1) && pro.length) {
								var switchID = main.chooseRandom(pro)
								pro = pro.filter(function (p) { return p !== switchID })
								anti.push(switchID)
							}
							
							if (switchID) {
								var empathEvent = createStaticEvent(request, {type: "special-empath", viewers: [switchID]})
								set["events." + empathEvent.id] = empathEvent
								if (switchID == request.session.id) {
									myEvents.push(empathEvent)
								}
							}
						}

					// special-cheater
						if (cheater) {
							if ((pro.indexOf(cheater) !== -1) && anti.length) {
								var switchID = main.chooseRandom(anti)
								anti = anti.filter(function (p) { return p !== switchID })
								pro.push(switchID)
							}
							else if ((anti.indexOf(cheater) !== -1) && pro.length) {
								var switchID = main.chooseRandom(pro)
								pro = pro.filter(function (p) { return p !== switchID })
								anti.push(switchID)
							}
							
							if (switchID) {
								var cheaterEvent = createStaticEvent(request, {type: "special-cheater", viewers: [switchID]})
								set["events." + cheaterEvent.id] = cheaterEvent
								if (switchID == request.session.id) {
									myEvents.push(cheaterEvent)
								}
							}
						}

					// get text
						if (obscurer) { // special-obscurer
							for (var v in voters) {
								if (pro.indexOf(voters[v]) !== -1) {
									 proText.push("<span class='special-text'>?</span>")
								}
								else if (anti.indexOf(voters[v]) !== -1) {
									antiText.push("<span class='special-text'>?</span>")
								}
							}
						}
						else {
							for (var v in voters) {
								if (pro.indexOf(voters[v]) !== -1) {
									 proText.push("<span class='special-text'>" + request.game.players[voters[v]].name + "</span>")
								}
								else if (anti.indexOf(voters[v]) !== -1) {
									antiText.push("<span class='special-text'>" + request.game.players[voters[v]].name + "</span>")
								}
							}
						}

					// decision
						var decisionEvent = createStaticEvent(request, {type: "decision-complete", pro: proText, anti: antiText})
						set["events." + decisionEvent.id] = decisionEvent
						myEvents.push(decisionEvent)

					// special-obscurer
						if (obscurer && !Object.keys(request.game.events).filter(function (e) { return request.game.events[e].type == "special-obscurer" }).length) {
							var obscurerEvent = createStaticEvent(request, {type: "special-obscurer"})
							set["events." + obscurerEvent.id] = obscurerEvent
							myEvents.push(obscurerEvent)
						}

					// accepted?
						if (pro.length > anti.length) {
							set["players." + target + ".status.alive"] = request.game.players[target].status.alive = false

							var executionEvent = createStaticEvent(request, {type: "story-execution", name: request.game.players[target].name})
							set["events." + executionEvent.id] = executionEvent
							myEvents.push(executionEvent)

							var ghostEvent = createStaticEvent(request, {type: "story-ghost", viewers: [target]})
							set["events." + ghostEvent.id] = ghostEvent
							if (target == request.session.id) {
								myEvents.push(ghostEvent)
							}

							var nominationEvents = Object.keys(request.game.events).filter(function (e) { return ((request.game.events[e].day == request.game.state.day) && (request.game.events[e].type == "execution-nomination")) })
							for (var n in nominationEvents) {
								set["events." + nominationEvents[n] + ".doers"] = []
							}

							// special-clairvoyant
								if (clairvoyant) {
									var magic = request.game.players[target].status.magic ? "magic" : "not magic"

									var clairvoyantEvent = createStaticEvent(request, {type: "special-clairvoyant", viewers: [clairvoyant], magic: magic})
									set["events." + clairvoyantEvent.id] = clairvoyantEvent
									if (clairvoyant == request.session.id) {
										myEvents.push(clairvoyantEvent)
									}
								}

							// special-augur
								if (augur) {
									if (request.game.players[target].status.good) {
										var team = "good"
									}
									else {
										var team = "evil"
									}

									var augurEvent = createStaticEvent(request, {type: "special-augur", viewers: [augur], team: team})
									set["events." + augurEvent.id] = augurEvent
									if (augur == request.session.id) {
										myEvents.push(augurEvent)
									}
								}
						}

					// check for game end
						var goodAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive &&  request.game.players[p].status.good) })
						var evilAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive && !request.game.players[p].status.good) })

						if (evilAlive == 0) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "good"

							var goodEvent = createStaticEvent(request, {type: "end-good"})
							set["events." + goodEvent.id] = goodEvent
							myEvents.push(goodEvent)
						}
						else if (goodAlive.length <= evilAlive.length) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "evil"
							
							var evilEvent = createStaticEvent(request, {type: "end-evil"})
							set["events." + evilEvent.id] = evilEvent
							myEvents.push(evilEvent)
						}

					// save data
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to save execution data..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})
				})
			}
		}

	/* murderPlayer */
		module.exports.murderPlayer = murderPlayer
		function murderPlayer(request, callback) {
			if (["murder-nomination", "murder-poll"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "You cannot murder a player from this event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else if (request.event.doers.indexOf(request.session.id) == -1) {
				callback({success: false, message: "You're not on this event!"})
			}
			else if (request.event.type == "murder-nomination") {
				var otherQueues = Object.keys(request.game.events).filter(function (e) { return ((request.game.events[e].day == request.game.state.day) && (request.game.events[e].type == "queue") && (request.game.events[e].for == "murder-poll") && (request.game.events[e].doers.length > 0)) })
				if (otherQueues.length) {
					callback({success: false, message: "There's already a poll in progress."})
				}
				else if (!request.post.value || Object.keys(request.game.players).indexOf(request.post.value) == -1) {
					callback({success: false, message: "That's not a valid target."})
				}
				else {
					// set data
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()
							set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
							set["events." + request.event.id + ".doers"]  = request.event.doers  = []

					// specials
						var insomniac = Object.keys(request.game.players).find(function (p) { // special-insomniac
							return (request.game.players[p].status.alive && (request.game.players[p].status.role == "insomniac"))
						}) || null					

					// create queue
						var killerList = Object.keys(request.game.players).filter(function(p) { return ((!request.game.players[p].status.good) && (request.game.players[p].status.alive)) })
						var queueEvent = createQueueEvent(request, {for: "murder-poll", author: request.session.id, target: request.post.value, doers: killerList})
						set["events." + queueEvent.id] = queueEvent

					// create poll event
						for (var k in killerList) {
							var pollEvent = createActionEvent(request, {type: "murder-poll", author: request.game.players[request.session.id].name, target: request.game.players[request.post.value].name, viewers: [killerList[k]], doers: [killerList[k]], queue: queueEvent.id})
							set["events." + pollEvent.id] = pollEvent

							if (killerList[k] == request.session.id) {
								myEvents.push(pollEvent)
							}
						}

					// create ghost event
						var ghosts = Object.keys(request.game.players).filter(function (p) { return !request.game.players[p].status.alive }) || []
						if (ghosts.length) {
							var ghostEvent = createStaticEvent(request, {type: "murder-ghost", target: request.game.players[request.post.value].name, viewers: ghosts})
							set["events." + ghostEvent.id] = ghostEvent
						}

					// special-insomniac
						if (insomniac) {
							var insomniacEvent = createStaticEvent(request, {type: "special-insomniac", viewers: [insomniac], name: request.game.players[request.post.value].name})
							set["events." + insomniacEvent.id] = insomniacEvent
						}

					// update data
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create a murder poll..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})
				}
			}
			else if (request.event.type == "murder-poll") {
				checkQueue(request, function (results) { // failure
					callback(results)
				}, function (queue) { // success
					// get info
						var author   = queue.author
						var target   = queue.target
						var voters   = Object.keys(queue.results)
						var pro      = []
						var anti     = []
						var proText  = []
						var antiText = []

					// set info
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()

					// determine pro and anti
						for (var v in voters) {
							if (Number(queue.results[voters[v]]) == 1) {
								pro.push(voters[v])
								proText.push("<span class='special-text'>" + request.game.players[voters[v]].name + "</span>")
							}
							else {
								anti.push(voters[v])
								antiText.push("<span class='special-text'>" + request.game.players[voters[v]].name + "</span>")
							}
						}

					// decision
						var decisionEvent = createStaticEvent(request, {type: "decision-complete", pro: proText, anti: antiText, viewers: voters})
						set["events." + decisionEvent.id] = decisionEvent
						myEvents.push(decisionEvent)

					// accepted?
						if (anti.length == 0) { // must be unanimous
							set["temporary.killed"] = [target]

							var nominationEvents = Object.keys(request.game.events).filter(function (e) { return ((request.game.events[e].day == request.game.state.day) && (request.game.events[e].type == "murder-nomination")) })
							for (var n in nominationEvents) {
								set["events." + nominationEvents[n] + ".doers"] = []
							}

							var murderEvent = createStaticEvent(request, {type: "murder-complete", target: request.game.players[target].name, viewers: voters})
							set["events." + murderEvent.id] = murderEvent
							myEvents.push(murderEvent)
						}

					// save data
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to save murder data..."})
							}
							else {
								callback({success: true, events: myEvents})
							}
						})
				})
			}
		}

	/* setupDream */
		module.exports.setupDream = setupDream
		function setupDream(request, callback) {
			if (["dream-name","dream-color"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "That's not a dream event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else if (request.event.doers.indexOf(request.session.id) == -1) {
				callback({success: false, message: "You're not on this event!"})
			}
			else {
				var myEvents = []
				var set = {}
					set.updated = new Date().getTime()

				// complete event and create next event
					if (request.event.type == "dream-name") {
						set["temporary.dreams." + request.session.id] = {
							target: request.post.value,
							color: null
						}
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var dreamEvent = createActionEvent(request, {type: "dream-color"})
						set["events." + dreamEvent.id] = dreamEvent
						myEvents.push(dreamEvent)
					}
					else if (request.event.type == "dream-color") {
						set["temporary.dreams." + request.session.id + ".color"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var dreamEvent = createStaticEvent(request, {type: "dream-complete", viewers: [request.session.id]})
						set["events." + dreamEvent.id] = dreamEvent
						myEvents.push(dreamEvent)
					}

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					if (!data) {
						callback({success: false, message: "Unable to set up the dream..."})
					}
					else {
						callback({success: true, events: myEvents})
					}
				})
			}
		}

	/* setupRandom */
		module.exports.setupRandom = setupRandom
		function setupRandom(request, callback) {
			if (["random-select","random-text","random-buttons"].indexOf(request.event.type) == -1) {
				callback({success: false, message: "That's not a random event."})
			}
			else if (!request.game.state.start) {
				callback({success: false, message: "This game has not started."})
			}
			else if (request.event.doers.indexOf(request.session.id) == -1) {
				callback({success: false, message: "You're not on this event."})
			}
			else {
				var myEvents = []
				var set = {}
					set.updated = new Date().getTime()

				// complete event and create next event
					if (request.event.type == "random-select") {
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var randomEvent = createActionEvent(request, {type: "random-text"})
						set["events." + randomEvent.id] = randomEvent
						myEvents.push(randomEvent)
					}
					if (request.event.type == "random-text") {
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []

						var randomEvent = createActionEvent(request, {type: "random-buttons"})
						set["events." + randomEvent.id] = randomEvent
						myEvents.push(randomEvent)
					}
					else if (request.event.type == "random-buttons") {
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []

						var sampleWake = Object.keys(request.game.events).find(function (e) { return ((request.game.events[e].day == request.game.state.day) && (request.game.events[e].type == "trigger-wake"))})
						var queueID = request.game.events[sampleWake].queue
						
						var wakeEvent = createActionEvent(request, {type: "trigger-wake", viewers: [request.session.id], doers: [request.session.id], queue: queueID})
						set["events." + wakeEvent.id] = wakeEvent
						myEvents.push(wakeEvent)
					}

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					if (!data) {
						callback({success: false, message: "Unable to submit random event data..."})
					}
					else {
						callback({success: true, events: myEvents})
					}
				})
			}
		}
