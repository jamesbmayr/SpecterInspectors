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
									return request.game.events[x].created > request.game.events[y].created
								})

								console.log(eventIDs)

								for (var e in eventIDs) {
									newEvents.push(request.game.events[eventIDs[e]])
								}
							}

						// chats
							var newChats = []
							var player   = request.game.players[request.session.id]
							var chats    = request.game.chats[player.status.role] || []

							if (chats.length) {
								var lastChat = chats.filter(function (c) { return c.id == request.post.chat }) || false
							}
							else {
								var lastChat = false
							}

							if (lastChat) {
								var chats = chats.filter(function (e) {
									return (c.created > lastChat.created)
								}).sort(function(x, y) {
									return x.created > y.created
								})

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
					else if (["killer", "ghost", "telepath"].indexOf(games[0].players[request.session.id].status.role) == -1) {
						callback({success: false, message: "You're not a member of any chats!"})
					}
					else if (games[0].players[request.session.id].status.role == "killer" && !games[0].state.night) {
						callback({success: false, message: "Killers can only communicate at night."})
					}
					else if (games[0].players[request.session.id].status.role == "telepath" && games[0].state.night) {
						callback({success: false, message: "Telepaths can only communicate during the day."})
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

						var push = {}
							push["chats." + player.status.role] = chat
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
								case "setup-shoes":
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
								case "dream-item":
								case "dream-color":
									setupDream(request, callback)
								break

								case "random-select":
								case "random-text":
								case "random-buttons":
									setupRandom(request, callback)
								break

								default:
									callback({success: false, message: "Unable to trigger the next event..."})
								break
							}
						}
						catch (error) {
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
							event.text = "Your friends can join using this code: <span class='special-text'>" + request.game.id.substring(0,4).toUpperCase() + "</span>"
						break

					// start
						case "start-inciting":
							event.text = "Our story begins... You and your friends have gathered together, but as it turns out, some of you are murderers. That's right - your good friend <span class='special-text'>" + request.game.state.ghost + "</span> is dead. Now you have to figure out who the killers are... before they get you too!"
						break

						case "start-players":
							event.text = "Here are all the suspects: <br>" + data.players.join("<br>")
						break

						case "start-notes":
							event.text = main.chooseRandom(["Things are gonna get a bit crazy, so you might need to write stuff down.", "To solve these murders, you might need to write down some clues.", "To make things a bit easier, there's a place for you to keep track of everything.", "As you play the game, you might need a place to keep your thoughts.", "If you're looking for a place to organize your ideas..."]) + " Check out the Notes tab to the left."
						break

					// morning
						case "story-day":
							event.text = main.chooseRandom(["The sun is rising over the hills.", "A new dawn rises.", "It's the start of a brand new day.", "The next day has begun.", "Goooooood morning!", "The story continues with a new day.", "Day phase, activated.", "The next day has commenced.", "Let us begin a new day.", "Here we go: another day."])
						break

						case "story-dream":
							event.text = main.chooseRandom(["You had the strangest dream last night - something about " + data.color + " " + data.item + "?", "That was definitely a bizarre dream - " + data.color + " " + data.item + "...", "Well, dreams don't get more interesting than " + data.color + " " + data.item + ", right?", "What a dream! You can still see it clearly: " + data.color + " " + data.item + ".", "No, no! Not the " + data.color + " " + data.item + "! Oh... it was only a dream.", "Are these dreams, or visions? All you know is you can't get " + data.color + " " + data.item + " out of your head.", "What a nightmare! Just " + data.color + " " + data.item + " everywhere!", "And that dream about " + data.color + " " + data.item + " was pretty interesting, to say the least.", "You begin to wonder if anyone else dreams about " + data.color + " " + data.item + ".", "Wow, what a restless night, constantly interrupted by visions of " + data.color + " " + data.item + "!", "You suspect there's something up with " + data.color + " " + data.item + " after those thoughts dancing in your mind all of last night."])
						break

						case "story-fakedream":
							event.text = main.chooseRandom(["BEES! BEES EVERYWHERE! Oh... oh, it was only a dream.", "Between the astronauts, the jazz trombone, and the flying zebras, that was an awesome dream last night.", "You hate that dream - you know, the one about the pigeons and the celery. Ugh. Terrible.", "Why is it that your dreams about attractive models are always after the zombie apocalypse?", "In your dream last night, the sun and moon decided to swap places. Few people noticed.", "Crazy dream last night - everyone was speaking in barcodes.", "!!! Oh, you were sleeping. But what a nightmare! Kindergarten - again!", "You had a dream about pancakes, but they were stale.", "Your favorite dreams are always the ones about scuba diving on the moon. Someone should make that a thing.", "They say it's in dreams that our best ideas are born. So I guess your best idea is a pantsuit for hamsters. Huh.", "You dreamed mostly about the number 31, but you're not sure if that's significant. Probably not.", "Whoa - you just had that recurring nightmare again - the one with the octopus telemarketer. You should talk to someone about that.", "You dreamt that you had been a better child to your parents. Alas.", "Last night, you had a dream about unicorns, but they were all on strike for workplace safety violations.", "Is it normal to dream about throwing your friends in a volcano? No, probably not.", "Your latest dream was a revolutionary new tech gadget, but... sigh... the specifics have faded from your memory.", "You had a dream last night that you crawled into your bed.", "Your dream last night was one for the history books... in that it was literally about you reading a history book.", "Strange visions in your sleep - visions of smells. Bad ones.", "You dreamt that you had wet the bed, but you awoke to find you hadn't. Nice.", "Last night, you had a dream that you and your friends were playing a sort of board game on your phone... ghosts and guesswork, was it?", "It's probably best if you forget your latest dreams altogether.", "Honestly, that was the best dream you will ever have - you had a steady job, a family that cared about you, and attainable ambitions... oh well...", "Huh, that was a first. Never had a dream about a rabbit wielding katanas before.", "At this point, most of your dreams are just pop-up ads for more expensive dreams.", "Can't remember the last time you had a dream that all of America's former governors had invited you to tea.", "Terrible, terrible nightmares last night - all of the birds were singing cartoon theme songs! In harmony!", "Your dream last night included Beethoven's Moonlight Sonata, as performed by a box of crayons distraught over the state of the economy.", "Worst. Dream. Ever. 0 out of 5 stars. You literally can't even."])
						break

						case "story-murder":
							event.text = main.chooseRandom(["It's a murder! <span class='special-text'>" + data.name + "</span> is dead!", "You awake to find <span class='special-text'>" + data.name + "</span> is no longer with us.", "It seems that <span class='special-text'>" + data.name + "</span> was killed in the middle of the night.", "Oh no! <span class='special-text'>" + data.name + "</span> is dead!", "Sadly, <span class='special-text'>" + data.name + "</span> has passed on from this world.", "And the next ghost is: <span class='special-text'>" + data.name + "</span>.", "Well, can't say we didn't see this coming. <span class='special-text'>" + data.name + "</span> is dead.", "They got another one! <span class='special-text'>" + data.name + "</span> has been murdered!"])
						break

						case "story-safe":
							event.text = main.chooseRandom(["No one died last night! But still... what about those other murders?", "Seems like the murderers didn't do much last night. But they're out there.", "Thankfully, it was a quiet night. But there's still a killer on the loose.", "Somehow, nobody died. That's the good news. The bad news? The murderer didn't die either.", "Maybe the killers are on vacation? Well, they'll be back eventually.", "It seems fate has spared your friends. But one or more of them could still be a killer.", "We know there's a murderer (or two or three...) still alive, even if nobody was slaughtered in their sleep.", "Just because nobody died doesn't mean nobody tried.", "Maybe the murderers are just biding their time, building up a false sense of security before they strike again. And when they do...", "What a relief! Everybody's still here! Except... someone did commit those killings before..."])
						break

					// day
						case "special-telepath":
							event.text = "During the day, telepaths can read each others thoughts. Use the chat tab on the right to send out a mental message!"
						break

						case "story-execution":
							event.text = main.chooseRandom(["The people have spoken! <span class='special-text'>" + data.name + "</span> is found guilty!", "Off with their head! <span class='special-text'>" + data.name + "</span> is done.", "Well, <span class='special-text'>" + data.name + "</span>, it seems your fate is sealed.", "That's that. <span class='special-text'>" + data.name + "</span> shall be executed!", "The group agrees: <span class='special-text'>" + data.name + "</span> should be sentenced to death.", "Sorry, <span class='special-text'>" + data.name + "</span>, but your time has come.", "Well, can't say we didn't see this coming. <span class='special-text'>" + data.name + "</span> is executed by the group.", "So we agree, then? <span class='special-text'>" + data.name + "</span> shall die!"])
						break

						case "story-ghost":
							event.text = main.chooseRandom(["Well... these things happen, sometimes. Welcome to the afterlife. On the bright side - now you can chat with other ghosts (on the right).", "Not sure how to break it to you... but uh... you're a ghost now. At least there's the ghost chat (on the right)!", "You have shed your mortal skin and ascended into a higher plane of existence - complete with a new chat room (on the right)!", "This is phase 2: ghost time. Check out the ghost chat (on the right)!", "Sorry about your death and everything - but try the new ghost chat (on the right)!", "Whelp, you're dead. But you're not done playing - get in on the ghost chat (on the right)!"])
						break

					// night
						case "story-night":
							event.text = main.chooseRandom(["And the sun sets on that day... night time!", "Here comes the night.", "Darkness falls.", "A new night begins.", "As light fades from the sky, the night is upon us.", "Thus begins another night.", "The night is now.", "And now? Night.", "What's next? Oh, right... night time.", "Here we go with another night."])
						break

						case "special-killer":
							event.text = "At night, killers can communicate in secret using the chat tab on the right. Just make sure you're not obvious about it!"
						break

						case "special-ghost":
							event.text = "As a ghost, you can't talk to the living, but you can still communicate! Every night, you can send someone a dream to give them clues about who the killers might be!"
						break

						case "random-why":
							event.text = main.chooseRandom(["To ensure other players don't know who you are, we ask you pointless questions.", "This is just so no one knows your role.", "To make it so no one know's who's who, we have to make you click random buttons.", "This next part is so nobody can figure out your role.", "This data's not going anywhere - it's just so other players don't know what your role is.", "It's important that you look like you're doing something, even if you're not.", "Gotta make sure nobody knows your role.", "We have to keep up the ruse that you could be any player.", "Just to make sure nobody knows what role you have..."])
						break

						case "murder-complete":
							event.text = main.chooseRandom(["And just like that, <span class='special-text'>" + data.target + "</span> is dead.", "Poor <span class='special-text'>" + data.target + "</span> - never saw it coming.", "You almost feel bad killing <span class='special-text'>" + data.target + "</span>. Almost.", "See ya never, <span class='special-text'>" + data.target + "</span>!", "Whelp, that's it for <span class='special-text'>" + data.target + "</span>! Dead.", "Looks like <span class='special-text'>" + data.target + "</span> has breathed that final breath.", "Oh, the blood! Blood everywhere! Who knew <span class='special-text'>" + data.target + "</span> had so much blood?", "You quickly and quietly commit the murder of <span class='special-text'>" + data.target + "</span>.", "Wait till they wake up to find good ol' <span class='special-text'>" + data.target + "</span> lying there, dead!", "Bye bye forever, <span class='special-text'>" + data.target + "</span>!", "Raise that death count - <span class='special-text'>" + data.target + "</span> is a goner."])
						break

						case "dream-complete":
							event.text = main.chooseRandom(["All right, that dream is packed up and good to go.", "Dream crafted - and on its way.", "The dream shall not be deferred!", "Sending along the vision... now!", "The dream is sent!", "Hallucinations in transit...", "Okay, great! That dream is ready!", "Nightmare manufactured!", "Sending along to that sleeping somebody.", "Sweet (?) dreams, friend!"])
						break

					// end
						case "end-good":
							event.text = main.chooseRandom(["And with that, the good guys win!", "The winners are... the good guys!", "Congratulations, Team Good - you did it!", "And for once, the murderers don't get away with it!", "That's a wrap! Great job, not-evil people!", "Victory goes to the good ones!"])
							event.input = "link"
							event.options = ["../../", "play again"]
						break

						case "end-evil":
							event.text = main.chooseRandom(["And that's the game. Well done, you villanous scum!", "Game over - better luck next time, good team.", "The murderers emerge victorious.", "It just wasn't enough - you can't stop these killers!", "The bad guys are victorious! Thanks for playing!", "And that's another win for evil."])
							event.input = "link"
							event.options = ["../../", "play again"]
						break

					// decision
						case "decision-waiting":
							event.text = main.chooseRandom(["Great. Nothing to do now but wait for everybody else.", "All right, hold tight while we wait for your friends.", "Cool - just waiting on some other responses now.", "Awesome! Now we're just waiting on everyone else.", "Aaaaand now we wait for the others.", "Waiting for others...", "Please wait for other players.", "Hold please - other players aren't ready yet.", "Kick back and relax - other people aren't caught up yet.", "Waiting for the rest of them.", "Okay, other people are still taking actions..."])
						break

						case "decision-complete":
							event.text = main.chooseRandom(["The decision is " + data.pro + " for, " + data.anti + " against.", "Yea: " + data.pro + ". Nay: " + data.anti + ".", data.pro + " said yes, " + data.anti + " said no.", "The results: " + data.pro + " think yes, " + data.anti + " think no.", "How many for? " + data.pro + ". How many against? " + data.anti + ".", "All those in favor: " + data.pro + ". All those opposed: " + data.anti + "."])
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

					// other
						case "error":
						default:
							event.text = main.chooseRandom(["Uh-oh!", "Hm... something went wrong...", "That's an error:", "Wait a second...", "Nope, that's not gonna work."]) + " " + info.data
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

						case "setup-shoes":
							event.text = main.chooseRandom(["Last one, I promise: what color shoes do you have on?", "And your shoes - what color are they?", "What about those shoes?", "Thanks! Now I just need to know about your shoes.", "And to finish up: shoes?"])
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
							event.text = "In this game, your role will be a <span class='special-text'>" + data.role + "</span>. What does that mean? <br>" + getRoleDescription(data.role)
							event.input = "okay"
							event.options = "got it"
						break

					// triggers
						case "trigger-sleep":
							event.text = ""
							event.input = "okay"
							event.options = "go to sleep"
						break

						case "trigger-wake":
							event.text = ""
							event.input = "okay"
							event.options = "end the night"
						break

					// execution
						case "execution-nomination":
							event.text = main.chooseRandom(["Who do you want to point the finger at?", "Who dunnit?", "Who is the killer?", "Who do you blame?", "Somebody's gotta pay for this. But who?", "Who is responsible for this atrocity?", "Someone did it - but who?", "Who should we execute?", "One of us is the killer... but which one of us?", "Who deserves to be executed?"])
							event.input = "select"
							event.options = data.options
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
						break

						case "murder-poll":
							event.text = main.chooseRandom([data.author + " has nominated <span class='special-text'>" + data.target + "</span> to die - what's your take?", "It would appear " + data.author + " is ready to murder <span class='special-text'>" + data.target + "</span>... are you?", "Now " + data.author + " wants to kill <span class='special-text'>" + data.target + "</span>. Do you?", "Do you agree with " + data.author + " in murdering <span class='special-text'>" + data.target + "</span>?", "Should we listen to " + data.author + " and kill off <span class='special-text'>" + data.target + "</span>?"])
							event.input = "buttons"
							event.options = ["don't murder", "murder"]
						break

					// dream
						case "dream-name":
							event.text = main.chooseRandom(["Who do you want to give a dream to tonight?", "Whose turn is it to dream?", "Who should have a dream now?", "Who do you want to send a dream to?", "Somebody's gonna dream... but who?", "Who is the next dreamer?", "Someone is about to have a dream - but who?", "Whose perfect night of sleep should we interrupt?", "One of these people is about to have a strange dream - but which one?", "Who needs to get this dream?"])
							event.input = "select"
							event.options = options
						break

						case "dream-item":
							event.text = main.chooseRandom(["And what should they dream about?", "What's the dream gonna be about?", "What's the focus of this dream?", "What does this dream involve?", "What should the dream include?", "Next, pick an article of clothing:", "Select the relevant item:", "What's the core component of this dream?", "And what do they see in this dream?", "Pick a piece of clothing..."])
							event.input = "select"
							event.options = ["shirt", "pants", "shoes"]
						break

						case "dream-color":
							event.text = main.chooseRandom(["And what color?", "What color is that?", "Pick a hue:", "Let's determine the color:", "Let's make this more colorful:", "Finally, the color:", "Color it in!", "Send them a hue too...", "Select the right color:", "Let's add a little detail:"])
							event.input = "select"
							event.options = ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
						break

					// random
						case "random-select":
							event.text = main.chooseRandom(["While you're waiting, what's your favorite?", "What's the best?", "Also, we're doing a survey:", "If you had to choose one (and you do), what would you choose?", "So...", "Take your time deciding:", "Which of these is the good one?", "So many options, so little significance:", "What's the worst?"])
							event.input = "select"
							event.options = main.chooseRandom([["red","orange","yellow","green","blue","purple","brown","white","gray","black"], ["shirt", "pants", "shoes"], options, ["earth", "wind", "fire", "water"], ["spring", "summer", "autumn", "winter"], ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], [0,1,2,3,4,5,6,7,8,9], ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"], ["north", "east", "west", "south"], ["up", "right", "left", "down"], ["rock", "paper", "scissors"], ["africa", "antarctica", "asia", "australia", "europe", "north america", "south america"]])
						break

						case "random-text":
							event.text = main.chooseRandom(["Type any word you want:", "Go ahead and type a word.", "What's a word you particularly enjoy?", "So, tell me what you had for breakfast.", "What's the farthest you've ever been from home?", "Name a country. Any country.", "What's the best flavor of ice cream?", "If you could be anything, what would it be?", "What's your favorite type of cloud?", "Enter a number. Any number.", "Type your favorite letter.", "Time to button mash. (Letters and numbers only.)"])
							event.input = "text"
							event.options = null
						break

						case "random-buttons":
							event.text = main.chooseRandom(["While you're waiting, which is better?", "So uh... click a random button.", "The eternal dilemma...", "What do you like better?", "Which do you prefer?", "Left or right?", "Quick question:", "Just doing a survey here..."])
							event.input = "buttons"
							event.options = main.chooseRandom([["no", "yes"], ["cats", "dogs"], ["left", "right"], ["0", "1"], ["a", "z"], ["circles", "squares"], ["ghosts", "ghouls"], ["detectives", "inspectors"], ["mystery", "horror"], ["chocolate", "vanilla"], ["cookies", "cake"], ["rock-n-roll", "classical"], ["night", "day"], ["ocean", "mountains"], ["urban", "rural"], ["music", "science"], ["buttons", "dropdowns"], ["light", "dark"], ["rain", "sun"], ["scifi", "fantasy"]])
						break

					// other
						case "error":
						default:
							event.text = main.chooseRandom(["Uh-oh!", "Hm... something went wrong...", "That's an error:", "Wait a second...", "Nope, that's not gonna work."]) + " " + info.data
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
		function getRoleDescription(role) {
			switch (role) {
				case "killer":
					return "You are evil. Your goal is to kill off enough good people that your team matches theirs in size. You and your fellow killers can coordinate at night in the chat tab."
				break

				case "telepath":
					return "You are good. You want to get out of here alive, just like everyone else - and that means figuring out who the killers are. Luckily, you and the other telepath can read each others' minds during the day... in the chat tab."
				break

				case "augur":
					return "You are good. And you don't want to be murdered! To help you survive, you can read others' auras. Specifically, when someone is executed during the day, you can tell if they were good or evil - in the moment they pass from this world."
				break

				case "clairvoyant":
					return "You are good. And you can sense magic around people - but only once their souls have left their bodies. That means you can determine if the recently deceased have special abilities - including the telepaths, augur, medium, seer, and psychic."
				break

				case "medium":
					return "You are good. You'd prefer not to be killed and turned into a ghost. But you have a pretty good understanding of ghosts - in fact, when ghosts communicate with you through dreams, you know who's talking!"
				break

				case "psychic":
					return "You are good. And as it happens, you have an extrasensory ability to judge people's morals. Whenever another player proposes an execution, you can sense if the accused and accuser are on the same team - even if they can't."
				break

				case "seer":
					return "You are good. For you, dreams are plentiful and powerful, and they come to you every night. In fact, you receive every dream sent by every ghost, no matter who that dream was intended for."
				break

				case "insomniac":
					return "You are good. You can't sleep - too scared of all these murderers! But that means you can hear what the killers are up to each night - specifically, who they're thinking about killing."
				break

				case "person":
				default:
					return "You are good. And you just want to live! There are some other people on your side with some special abilities, but you're not sure who's who."
				break
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
			if (["setup-welcome","setup-name","setup-shirt","setup-pants","setup-shoes"].indexOf(request.event.type) == -1) {
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
						
						var setupEvent = createActionEvent(request, {type: "setup-shoes"})
						set["events." + setupEvent.id] = setupEvent
						myEvents.push(setupEvent)
					}
					else if (request.event.type == "setup-shoes") {
						set["players." + request.session.id + ".colors.shoes"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
					}

				main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
					if (!data) {
						callback({success: false, message: "Unable to save player data..."})
					}
					else if (request.event.type !== "setup-shoes") { // continue
						callback({success: true, events: myEvents})
					}
					else { // checkQueue
						request.event.queue = Object.keys(request.game.events).find(function (e) { return (request.game.events[e].author == "welcome") })

						checkQueue(request, function(results) { // failure
							callback(results)
						}, function(queue) { // success
							var players = Object.keys(request.game.players)

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
				// get data
					var playerList = Object.keys(request.game.players)
					var playerCount = playerList.length
					var evilCount = Math.floor(playerCount / 3)
					var goodCount = playerCount - evilCount
					var specialCount = Math.floor(goodCount / 2)

				// generate evil team
					var roles = []
					while (roles.length < evilCount) {
						roles.push("killer")
					}

				// generate specials
					while (roles.length < (evilCount + specialCount)) {
						do {
							var next = main.chooseRandom(["telepath", "augur", "clairvoyant", "medium", "psychic", "seer", "insomniac"])
						} while (roles.indexOf(next) !== -1)

						if ((next == "telepath") && ((roles.length + 2) < (evilCount + specialCount))) {
							roles.push(next)
							roles.push(next)
						}
						else if (next !== "telepath") {
							roles.push(next)
						}
					}

				// generate normals
					while (roles.length < playerCount) {
						roles.push("person")
					}

				// shuffle roles
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})
					roles = roles.sort(function(x, y) {
						return Math.floor(Math.random() * 2)
					})

				// start game
					var myEvents = []
					var set = {}
						set.updated = new Date().getTime()
						set["state.start"] = new Date().getTime()

				// create queue after players see role
					var queueEvent = createQueueEvent(request, {for: "story-day"})
					set["events." + queueEvent.id] = queueEvent

				// create inciting event
					var incitingEvent = createStaticEvent(request, {type: "start-inciting"})
					set["events." + incitingEvent.id] = incitingEvent
					myEvents.push(incitingEvent)

				// create players event
					var infoArray = []
					for (var p in playerList) {
						var player = request.game.players[playerList[p]]
						infoArray.push("<span class='special-text'>" + player.name + "</span> " + player.colors.shirt + " shirt, " + player.colors.pants + " pants, " + player.colors.shoes + " shoes... ")
					}
					var playersEvent = createStaticEvent(request, {type: "start-players", players: infoArray})
					set["events." + playersEvent.id] = playersEvent
					myEvents.push(playersEvent)

				// create notes event
					var notesEvent = createStaticEvent(request, {type: "start-notes"})
					set["events." + notesEvent.id] = notesEvent
					myEvents.push(notesEvent)

				// assign roles & role events
					for (var p = 0; p < playerCount; p++) {
						set["players." + playerList[p] + ".status.role"] = request.game.players[playerList[p]].status.role = roles[p]

						var roleEvent = createActionEvent(request, {type: "start-role", viewers: [playerList[p]], doers: [playerList[p]], role: roles[p], queue: queueEvent.id})
						set["events." + roleEvent.id] = roleEvent

						if (roles[p] == "killer") {
							set["players." + playerList[p] + ".status.good"] = request.game.players[playerList[p]].status.good = false
						}

						if (playerList[p] == request.session.id) {
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
						var dreams = Object.keys(request.game.state.dreams) || []
						var killed = request.game.state.killed || []

					// set data
						var myEvents = []
						var set = {}
							set["state.day"]    = request.game.state.day    = Number(request.game.state.day) + 1
							set["state.killed"] = request.game.state.killed = []
							set["state.dreams"] = request.game.state.dreams = []
							set["state.night"]  = request.game.state.night  = false
							set.updated         = new Date().getTime()

					// disable old events
						var oldEvents = Object.keys(request.game.events).filter(function (e) {
							return (request.game.events[e].day == request.game.state.day - 1)
						})
						for (var o in oldEvents) {
							set["events." + oldEvents[o] + ".doers"] = []
						}

					// day
						var dayEvent = createStaticEvent(request, {type: "story-day"})
						set["events." + dayEvent.id] = dayEvent
						myEvents.push(dayEvent)

					// specials
						var seer = Object.keys(request.game.players).filter(function (p) { // special-seer
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "seer"))
						}) || null

						var insomniac = Object.keys(request.game.players).filter(function (p) { // special-insomniac
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "insomniac"))
						}) || null

						var medium = Object.keys(request.game.players).filter(function (p) { // special-medium
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "medium"))
						}) || null

						var clairvoyant = Object.keys(request.game.players).filter(function (p) { // special-clairvoyant
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "clairvoyant"))
						}) || null
						var telepaths = Object.keys(request.game.players).filter(function (p) { // special-telepath
							return (request.game.players[p].status.alive && (killed.indexOf(p) == -1) && (request.game.players[p].status.role == "telepath"))
						}) || []

					// ai dream
						var sleepers = Object.keys(request.game.players).filter(function(s) {
							return (request.game.players[s].status.alive && (killed.indexOf(s) == -1) && (s !== insomniac)) // special-insomniac
						})

						var suspect   = main.chooseRandom(sleepers)
						var slumberer = main.chooseRandom(sleepers)
						var item      = main.chooseRandom(["shirt", "pants", "shoes"])

						var aiDreamEvent = createStaticEvent(request, {type: "story-dream", viewers: [slumberer, seer], color: request.game.players[suspect].colors[item], item: (item + "s").replace("ss", "s")}) // special-seer
						set["events." + aiDreamEvent.id] = aiDreamEvent

						if ((slumberer == request.session.id) || (request.session.id == seer)) { // special-seer
							myEvents.push(aiDreamEvent)
						}

						// special-medium
							if (slumberer == medium) {
								var mediumEvent = createStaticEvent(request, {type: "special-medium", viewers: [medium], name: request.game.state.ghost})
								set["events." + mediumEvent.id] = mediumEvent

								if (slumberer == request.session.id) {
									myEvents.push(mediumEvent)
								}
							}

						sleepers = sleepers.filter(function (p) { return p !== slumberer })

					// dreams
						for (var d in dreams) {
							sleepers = sleepers.filter(function (p) { return p !== dream.target })
							
							var dream = request.game.state.dreams[dreams[d]]

							if (request.game.players[dream.target].status.alive && (killed.indexOf(dream.target) == -1) && (dream.target !== insomniac)) { // special-insomniac
								var dreamEvent = createStaticEvent(request, {type: "story-dream", viewers: [dream.target, seer], color: dream.color, item: (dream.item + "s").replace("ss", "s")}) // special-seer
								set["events." + dreamEvent.id] = dreamEvent

								if ((dream.target == request.session.id) || request.session.id == seer) { // special-seer
									myEvents.push(dreamEvent)
								}

								// special-medium
									if (dream.target == medium) {
										var mediumEvent = createStaticEvent(request, {type: "special-medium", viewers: [medium], name: request.game.players[dream.author].name})
										set["events." + mediumEvent.id] = mediumEvent

										if (dream.target == request.session.id) {
											myEvents.push(mediumEvent)
										}
									}
							}
						}

					// fake dreams
						for (var s in sleepers) {
							var fakeDreamEvent = createStaticEvent(request, {type: "story-fakedream", viewers: [sleepers[s]]})
							set["events." + fakeDreamEvent.id] = fakeDreamEvent

							if (sleepers[s] == request.session.id) {
								myEvents.push(fakeDreamEvent)
							}
						}

					// special-telepath
						if ((request.game.state.day == 1) && telepaths && telepaths.length) {
							var telepathEvent = createStaticEvent(request, {type: "special-telepath", viewers: telepaths})
							set["events." + telepathEvent.id] = telepathEvent

							if (telepaths.indexOf(request.session.id) !== -1) {
								myEvents.push(telepathEvent)
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
								var roleBefore = request.game.players[killed[k].id].status.role
								set["players." + killed[k].id + ".status.role"]  = request.game.players[killed[k].id].status.role  = "ghost"
								set["players." + killed[k].id + ".status.alive"] = request.game.players[killed[k].id].status.alive = false

								var murderEvent = createStaticEvent(request, {type: "story-murder", name: request.game.players[killed[k]].name})
								set["events." + murderEvent.id] = murderEvent
								myEvents.push(murderEvent)

								var ghostEvent = createStaticEvent(request, {type: "story-ghost", viewers: [killed[k]]})
								set["events." + ghostEvent.id] = ghostEvent
								if (killed[k].id == request.session.id) {
									myEvents.push(ghostEvent)
								}

								// special-clairvoyant
									if (clairvoyant) {
										if (["telepath", "augur", "medium", "psychic", "seer"].indexOf(roleBefore) !== -1) {
											var magic = "magic"
										}
										else {
											var magic = "not magic"
										}

										var clairvoyantEvent = createStaticEvent(request, {type: "special-clairvoyant", viewers: [clairvoyant], magic: magic})
										set["events." + clairvoyantEvent.id] = clairvoyantEvent
										if (clairvoyant == request.session.id) {
											myEvents.push(clairvoyantEvent)
										}
									}

							}
						}

					// check for game end
						var goodAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive &&  request.game.players[p].status.good) })
						var evilAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive && !request.game.players[p].status.good) })

						if (evilAlive.length == 0) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "good"
							
							var goodEvent = createStaticEvent(request, {type: "end-good"})
							set["events." + goodEvent.id] = goodEvent
							myEvents.push(goodEvent)
						}
						else if (goodAlive.length < evilAlive.length) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "evil"
							
							var evilEvent = createStaticEvent(request, {type: "end-evil"})
							set["events." + evilEvent.id] = evilEvent
							myEvents.push(evilEvent)
						}
						else {
							// night queue
								var alive = Object.keys(request.game.players).filter(function(p) { return request.game.players[p].status.alive == true })
								var queueEvent = createQueueEvent(request, {for: "story-night", doers: alive})
								set["events." + queueEvent.id] = queueEvent

							// execution-nomination and sleep
								for (var a in alive) {
									var others = alive.filter(function (p) { return p !== alive[a] })
									var nominationEvent = createActionEvent(request, {type: "execution-nomination", viewers: [alive[a]], doers: [alive[a]], options: others})
									set["events." + nominationEvent.id] = nominationEvent

									var sleepEvent = createActionEvent(request, {type: "trigger-sleep", viewers: [alive[a]], doers: [alive[a]], queue: queueEvent.id})
									set["events." + sleepEvent.id] = sleepEvent

									if (alive[a] == request.session.id) {
										myEvents.push(nominationEvent)
										myEvents.push(sleepEvent)
									}
								}
						}

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
						var playerList = Object.keys(request.game.players)
						var killers    = []
						var ghosts     = []
						var persons    = []
						
						for (var p in playerList) {
							if (request.game.players[playerList[p]].status.alive == false) {
								ghosts.push(playerList[p])
							}
							else if (request.game.players[playerList[p]].role == "killer") {
								killers.push(playerList[p])
							}
							else {
								persons.push(playerList[p])
							}
						}

					// set data
						var myEvents = []
						var set = {}
							set["state.night"]  = request.game.state.night  = true
							set["state.killed"] = request.game.state.killed = []
							set["state.dreams"] = request.game.state.dreams = []
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
					
					// ghosts
						var oldGhosts = []
						var oldGhostEvents = Object.keys(request.game.events).filter(function (e) { return request.game.events[e].type == "special-ghost" })
						for (var o in oldGhostEvents) {
							oldGhosts.push(request.game.events[oldGhostEvents[o]].viewers[0])
						}

						for (var g in ghosts) {
							if (oldGhosts.indexOf(ghosts[g] == -1)) {
								var newGhostEvent = createStaticEvent(request, {type: "special-ghost", viewers: [ghosts[g]]})
								set["events." + newGhostEvent.id] = newGhostEvent

								if (ghosts[g] == request.session.id) {
									myEvents.push(newGhostEvent)
								}
							}

							var ghostEvent = createActionEvent(request, {type: "dream-name", viewers: [ghosts[g]], doers: [ghosts[g]], queue: queueEvent.id})
							set["events." + ghostEvent.id] = ghostEvent

							if (ghosts[g] == request.session.id) {
								myEvents.push(ghostEvent)
							}
						}

					// killers
						if (request.game.state.day == 1) {
							var killerChatEvent = createStaticEvent(request, {type: "special-killer", viewers: killers})
							set["events." + killerChatEvent.id] = killerChatEvent

							if (killers.indexOf(request.session.id) !== -1) {
								myEvents.push(killerChatEvent)
							}
						}

						for (var k in killers) {
							var killerEvent = createActionEvent(request, {type: "murder-nomination", options: persons.concat(killers), viewers: [killers[k]], doers: [killers[k]]})
							set["events." + killerEvent.id] = killerEvent

							if (killers[k] == request.session.id) {
								myEvents.push(killerEvent)
							}
						}

					// random
						if (request.game.state.day == 1) {
							for (var p in persons) {
								var randomExplanation = createStaticEvent(request, {type: "random-why", viewers: persons})
								set["events." + randomExplanation.id] = randomExplanation

								if (persons[p] == request.session.id) {
									myEvents.push(randomExplanation)
								}
							}
						}

						for (var p in persons) {
							var randomEvent = createActionEvent(request, {type: "random-select", viewers: [persons[p]], doers: [persons[p]]})
							set["events." + randomEvent.id] = randomEvent

							if (persons[p] == request.session.id) {
								myEvents.push(randomEvent)
							}
						}

					// wake
						for (var p in playerList) {
							// alive/good can't see it until after randoms
								if (!request.game.players[playerList[p]].status.good || !request.game.players[playerList[p]].status.alive) {
									var wakeEvent = createActionEvent(request, {type: "trigger-wake", viewers: [playerList[p]], doers: [playerList[p]], queue: queueEvent.id})
									set["events." + wakeEvent.id] = wakeEvent

									if (playerList[p] == request.session.id) {
										myEvents.push(wakeEvent)
									}
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
					// specials
						var psychic = Object.keys(request.game.players).filter(function (p) { // special-psychic
							return (request.game.players[p].status.alive && (request.game.players[p].status.role == "psychic"))
						}) || null

					// set data
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()
							set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
							set["events." + request.event.id + ".doers"]  = request.event.doers  = []

					// create queue
						var playerList = Object.keys(request.game.players)
						var queueEvent = createQueueEvent(request, {for: "execution-poll", author: request.session.id, target: request.post.value, doers: playerList.filter(function(p) { return ((request.game.players[p].id !== request.post.value) && (request.game.players[p].status.alive)) }) })
						set["events." + queueEvent.id] = queueEvent

					// create poll event
						for (var p in playerList) {
							if (request.game.players[playerList[p]].status.alive) {
								var pollEvent = createActionEvent(request, {type: "execution-poll", author: request.game.players[request.session.id].name, target: request.game.players[request.post.value].name, viewers: [playerList[p]], doers: [playerList[p]], queue: queueEvent.id})
								set["events." + pollEvent.id] = pollEvent

								if (playerList[p] == request.session.id) {
									myEvents.push(pollEvent)
								}
							}
						}

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
						main.storeData("games", {id: request.game.id, "events.id": request.event.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create an execution nomination..."})
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
						var author = queue.author
						var target = queue.target
						var voters = Object.keys(queue.results)
						var pro    = []
						var anti   = []

					// specials
						var clairvoyant = Object.keys(request.game.players).filter(function (p) { // special-clairvoyant
							return (request.game.players[p].status.alive && (p !== target) && (request.game.players[p].status.role == "clairvoyant"))
						}) || null

						var augur = Object.keys(request.game.players).filter(function (p) { // special-augur
							return (request.game.players[p].status.alive && (p !== target) && (request.game.players[p].status.role == "augur"))
						}) || null

					// determine pro and anti
						for (var v in voters) {
							if (queue.results[voters[v]] === true) {
								pro.push(voters[v])
							}
							else {
								anti.push(voters[v])
							}
						}

					// set info
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()

					// decision
						var decisionEvent = createStaticEvent(request, {type: "decision-complete", pro: pro.length, anti: anti.length})
						set["events." + decisionEvent.id] = decisionEvent
						myEvents.push(decisionEvent)

					// accepted?
						if (pro.length > anti.length) {
							var roleBefore = request.players[target].status.role
							set["players." + target + ".status.role"]  = request.players[target].status.role  = "ghost"
							set["players." + target + ".status.alive"] = request.players[target].status.alive = false

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
									if (["telepath", "augur", "medium", "psychic", "seer"].indexOf(roleBefore) !== -1) {
										var magic = "magic"
									}
									else {
										var magic = "not magic"
									}

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
						var goodAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive &&  request.game.players[p].good) })
						var evilAlive = Object.keys(request.game.players).filter(function(p) { return (request.game.players[p].status.alive && !request.game.players[p].good) })

						if (evilAlive == 0) {
							set["state.end"]     = request.game.state.end     = new Date().getTime()
							set["state.victory"] = request.game.state.victory = "good"

							var goodEvent = createStaticEvent(request, {type: "end-good"})
							set["events." + goodEvent.id] = goodEvent
							myEvents.push(goodEvent)
						}
						else if (goodAlive.length < evilAlive.length) {
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
					// specials
						var insomniac = Object.keys(request.game.players).filter(function (p) { // special-insomniac
							return (request.game.players[p].status.alive && (request.game.players[p].status.role == "insomniac"))
						}) || null

					// set data
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()
							set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
							set["events." + request.event.id + ".doers"]  = request.event.doers  = []

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

					// special-insomniac
						if (insomniac) {
							var insomniacEvent = createStaticEvent(request, {type: "special-insomniac", viewers: [insomniac], name: request.game.players[request.post.value].name})
							set["events." + insomniacEvent.id] = insomniacEvent
						}

					// update data
						main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
							if (!data) {
								callback({success: false, message: "Unable to create a murder nomination..."})
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
						var author = queue.author
						var target = queue.target
						var voters = Object.keys(queue.results)
						var pro    = []
						var anti   = []

					// determine pro and anti
						for (var v in voters) {
							if (queue.results[voters[v]] === true) {
								pro.push(voters[v])
							}
							else {
								anti.push(voters[v])
							}
						}

					// set info
						var myEvents = []
						var set = {}
							set.updated = new Date().getTime()

					// decision
						var decisionEvent = createStaticEvent(request, {type: "decision-complete", pro: pro.length, anti: anti.length})
						set["events." + decisionEvent.id] = decisionEvent
						myEvents.push(decisionEvent)

					// accepted?
						if (pro.length > anti.length) {
							set["state.killed"] = [target]

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
			if (["dream-name","dream-item","dream-color"].indexOf(request.event.type) == -1) {
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
						set["dreams." + request.session.id] = {
							target: request.post.value,
							item: null,
							color: null
						}
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []
						
						var dreamEvent = createActionEvent(request, {type: "dream-item"})
						set["events." + dreamEvent.id] = dreamEvent
						myEvents.push(dreamEvent)
					}
					if (request.event.type == "dream-item") {
						set["dreams." + request.session.id + ".item"] = request.post.value
						set["events." + request.event.id + ".answer"] = request.event.answer = request.post.value
						set["events." + request.event.id + ".doers"]  = request.event.doers = []

						var dreamEvent = createActionEvent(request, {type: "dream-color"})
						set["events." + dreamEvent.id] = dreamEvent
						myEvents.push(dreamEvent)
					}
					else if (request.event.type == "dream-color") {
						set["dreams." + request.session.id + ".color"] = request.post.value
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

						var sampleWake = Object.keys(request.game.events).find(function (e) { return ((request.game.events[e].day == request.session.state.day) && (request.game.events[e].type == "trigger-wake"))})
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
