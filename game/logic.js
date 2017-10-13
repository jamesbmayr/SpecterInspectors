/* modules */
	var main = require("../main/logic")
	module.exports = {}

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

/* launchGame */
	module.exports.launchGame = launchGame
	function launchGame(request, callback) {

	}

/* submitEvent */
	module.exports.submitEvent = submitEvent
	function submitEvent(request, callback) {
		// ???
		callback(null)
	}

/* createEvent */
	module.exports.createEvent = createEvent
	function createEvent(request, index) {
		// new event
			var event = {
				id: main.generateRandom(),
				‎created: new Date().getTime(),
				‎updated: new Date().getTime(),
				players: [],
				‎components: []
			}

		switch (index) {
			// pre-launch
				case "createPlayer":
					event.players = [request.session.id]
					event.components = [getComponent("start-welcome"), getComponent("setup-name"), getComponent("setup-shirt"), getComponent("setup-paints"), getComponent("setup-shoes"), getComponent("start-wait")]
					return event
				break

			// launch
				case "launchGame":
					var role = request.game.players[request.session.id].role
					event.players = Object.keys(request.game.players)
					event.components = [getComponent("start-welcome"), getComponent("start-inciting"), getComponent("start-role", [role, getRoleDescription(role)])]
				break

			// day

			// night

			// accusation

			// nomination

			// poll

			// dream

			// others
				default:
					return event
				break
		}
	}

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

/* getComponent */
	module.exports.getComponent = getComponent
	function getComponent(index, options) {
		switch (index) {
			// start
				case "start-welcome":
					return {
						content: main.chooseRandom(["Welcome to Specter Inspectors: the game of ghosts and guesses!", "The game is afoot!", "Boo!", "Here we go!", "Testing, testing, 1, 2, check.", "Hey! How's it going?", "Are you ready for some Specter Inspectors? I know I am.", "I suspect you're expecting Specter Inspectors to connect... You suspect correctly.", "I don't know about you, but I'm very excited for this game.", "SPECTER INSPECTORS will now commence..."]),
						input: "buttons",
						options: ["got it"]
					}
				break

				case "start-inciting":
					return {
						content: "Our story begins... You and your friends have gathered together, but as it turns out, some of you are murderers. That's right - your good friend " + main.chooseRandom(["Petey McPeterson", "Gregorio the Great", "Archduke Ferdinand", "Princess Pomegranate", "Carol from HR", "Millie Miles", "Sam Pats", "Shmorko Jr.", "Anabel Lee", "Santa Claus", "Dudebro", "Vanessa Vines", "Robotron-9000", "Professor Z", "Dr. Rogers", "Gertrude Glarkenstein", "Li'l Bigs", "Mrs. Brinkley", "Paul"]) + " is dead. Now you have to figure out who the killers are... before they get you too!",
						input: "buttons",
						options: ["got it"]
					}
				break

				case "start-role":
					return {
						content: "In this game, your role will be a " + options[0] ". What does that mean? " + options[1],
						input: "buttons",
						options: ["got it"],
					}
				break

				case "start-random":
					return {
						content: main.chooseRandom(["To ensure other players don't know who you are, we ask you pointless questions.", "This is just so no one knows your role.", "To make it so no one know's who's who, we have to make you click random buttons.", "This next part is so nobody can figure out your role.", "This data's not going anywhere - it's just so other players don't know what your role is.", "It's important that you look like you're doing something, even if you're not.", "Gotta make sure nobody knows your role.", "We have to keep up the ruse that you could be any player.", "Just to make sure nobody knows what role you have..."]),
						input: "buttons",
						options: ["got it"]
					}
				break

				case "start-wait":
					return {
						content: main.chooseRandom(["Great. Nothing to do now but wait for everybody else.", "All right, hold tight while we wait for your friends.", "Cool - just waiting on some other responses now.", "Awesome! Now we're just waiting on everyone else.", "Aaaaand now we wait for the others."]),
						input: null,
						options: null,
					}
				break

			// story
				case "story-day":
					return {
						content: main.chooseRandom(["The sun is rising over the hills.", "A new dawn rises.", "It's the start of a brand new day.", "The next day has begun.", "Goooooood morning!", "The story continues with a new day.", "Day phase, activated.", "The next day has commenced.", "Let us begin a new day.", "Here we go: another day."]),
						input: "buttons",
						options: ["done for the day"]
					}
				break

				case "story-night":
					return {
						content: main.chooseRandom(["And the sun sets on that day... night time!", "Here comes the night.", "Darkness falls.", "A new night begins.", "As light fades from the sky, the night is upon us.", "Thus begins another night.", "The night is now.", "And now? Night.", "What's next? Oh, right... night time.", "Here we go with another night."]),
						input: null,
						options: null
					}
				break

				case "story-decision":
					return {
						content: main.chooseRandom(["The decision is " + options[0] + " for, " + options[1] + " against.", "Yea: " + options[0] + ". Nay: " + options[1] + ".", options[0] + " said yes, " + options[1] + " said no.", "The results: " + options[0] + " think yes, " + options[1] + " think no.", "How many for? " + options[0] + ". How many against? " + options[1] + ".", "All those in favor: " + options[0] + ". All those opposed: " + options[1] + "."]),
						input: null,
						options: null
					}
				break

				case "story-murder":
					return {
						content: main.chooseRandom(["It's a murder! " + options[0] + " is dead!", "You awake to find " + options[0] + " is no longer with us.", "It seems that " + options[0] + " was killed in the middle of the night.", "Oh no! " + options[0] + " is dead!", "Sadly, " + options[0] + " has passed on from this world.", "And the next ghost is: " + options[0] + ".", "Well, can't say we didn't see this coming. " + options[0] + " is dead.", "They got another one! " + options[0] + " has been murdered!"]),
						input: null,
						options: null
					}
				break

				case "story-execution":
					return {
						content: main.chooseRandom(["The people have spoken! " + options[0] + " is found guilty!", "Off with their head! " + options[0] + " is done.", "Well, " + options[0] + ", it seems your fate is sealed.", "That's that. " + options[0] + " shall be executed!", "The group agrees: " + options[0] + " should be sentenced to death.", "Sorry, " + options[0] + ", but your time has come.", "Well, can't say we didn't see this coming. " + options[0] + " is executed by the group.", "So we agree, then? " + options[0] + " shall die!"]),
						input: null,
						options: null
					}
				break

				case "story-ghost":
					return {
						content: main.chooseRandom(["Well... these things happen, sometimes. Welcome to the afterlife. On the bright side - now you can chat with other ghosts.", "Not sure how to break it to you... but uh... you're a ghost now. At least there's the ghost chat!", "You have shed your mortal skin and ascended into a higher plane of existence - complete with a new chat room!", "This is phase 2: ghost time. Check out the ghost chat!", "Sorry about your death and everything - but try the new ghost chat!", "Whelp, you're dead. But you're not done playing - get in on the ghost chat!"]),
						input: null,
						options: null
					}
				break

			// end
				case "end-victory":
					return {
						content: main.chooseRandom(["And with that, the good guys win!", "The winners are... the good guys!", "Congratulations, Team Good - you did it!", "And for once, the murderers don't get away with it!", "That's a wrap! Great job, not-evil people!", "Victory goes to the good ones!"]),
						input: "links",
						options: ["play again"]
					}
				break

				case "end-defeat":
					return {
						content: main.chooseRandom(["And that's the game. Well done, you villanous scum!", "Game over - better luck next time, good team.", "The murderers emerge victorious.", "It just wasn't enough - you can't stop these killers!", "The bad guys are victorious! Thanks for playing!", "And that's another win for evil."]),
						input: "links",
						options: ["play again"]
					}
				break

			// setup
				case "setup-name":
					return {
						content: main.chooseRandom(["What's your name?", "Can we get a name for you?", "So, who exactly is playing, here?", "Let us begin. Who are you?", "We're gonna get started - first, we'll need a name."]),
						input: "text",
						options: (/^[a-zA-Z0-9\s]{1,16}$/gi)
					}
				break

				case "setup-shirt":
					return {
						content: main.chooseRandom(["In this game, we're gonna need to know what color shirt you're wearing.", "And can I ask what color shirt you've got on?", "This might be a weird question, but, uh... what color is your shirt?", "All right. Can you tell me what color shirt you've got?", "Next thing, believe it or not, is your shirt color."]),
						input: "select",
						options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
					}
				break

				case "setup-pants":
					return {
						content: main.chooseRandom(["We'll also need to know your pants color.", "And what about your pants?", "Trust me, this is important: what color are your pants?", "Great. And can you tell me what color pants you've got?", "Now I'm gonna need to get the color of your pants."]),
						input: "select",
						options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
					}
				break

				case "setup-shoes":
					return {
						content: main.chooseRandom(["Last one, I promise: what color shoes do you have on?", "And your shoes - what color are they?", "What about those shoes?", "Thanks! Now I just need to know about your shoes.", "And to finish up: shoes?"]),
						input: "select",
						options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
					}
				break

			// execution
				case "execution-nomination":
					return {
						content: main.chooseRandom(["Who do you want to point the finger at?", "Who dunnit?", "Who is the killer?", "Who do you blame?", "Somebody's gotta pay for this. But who?", "Who is responsible for this atrocity?", "Someone did it - but who?", "Who should we execute?", "One of us is the killer... but which one of us?", "Who deserves to be executed?"]),
						input: "select",
						options: options
					}
				break

				case "execution-poll":
					return {
						content: main.chooseRandom(["An accusation has been made! " + options[0] + " blames " + options[1] "; do you agree?", "What's this? " + options[0] + " is pointing the finger at " + options[1] + "! What do you think?", "Looks like " + options[0] + " thinks " + options[1] + " is to blame - do you concur?", "Well, " + options[0] + " has accused " + options[1] + ". Shall we commence the execution?", "Accusation! " + options[0] + " accuses " + options[1] + " of murder! What say you?"]),
						input: "buttons",
						options: ["guilty", "not guilty"]
					}
				break

			// murder
				case "murder-nomination":
					return {
						content: main.chooseRandom(["Who do you want to kill tonight?", "Whose turn is it to die?", "Who should we murder?", "Who do you want to off tonight?", "Somebody's gonna die... but who?", "Who is the next victim?", "Someone has seconds to live - but who?", "Who should we do away with?", "One of these people is a murder victim... but which?", "Who deserves to be executed?"]),
						input: "select",
						options: options
					}
				break

				case "murder-poll":
					return {
						content: main.chooseRandom([options[0] + " has nominated " + options[1] + " to die - what's your take?", "It would appear " + options[0] + " is ready to murder " + options[1] + "... are you?", "Now " + options[0] + " wants to kill " + options[1] + ". Do you?", "Do you agree with " + options[0] + " in murdering " + options[1] + "?", "Should we listen to " + options[0] + " and kill off " + options[1] + "?"]),
						input: "buttons",
						options: ["murder", "don't murder"]
					}
				break

			// dream
				case "dream-name":
					return {
						content: main.chooseRandom(["Who do you want to give a dream to tonight?", "Whose turn is it to dream?", "Who should have a dream now?", "Who do you want to send a dream to?", "Somebody's gonna dream... but who?", "Who is the next dreamer?", "Someone is about to have a dream - but who?", "Whose perfect night of sleep should we interrupt?", "One of these people is about to have a strange dream - but which one?", "Who needs to get this dream?"]),
						input: "select",
						options: options
					}
				break
				case "dream-clothing":
					return {
						content: main.chooseRandom(["And what should they dream about?", "What's the dream gonna be about?", "What's the focus of this dream?", "What does this dream involve?", "What should the dream include?", "Next, pick an article of clothing:", "Select the relevant item:", "What's the core component of this dream?", "And what do they see in this dream?", "Pick a piece of clothing..."]),
						input: "select",
						options: ["shirt", "pants", "shoes"]
					}
				break
				case "dream-color":
					return {
						content: main.chooseRandom(["And what color?", "What color is that?", "Pick a hue:", "Let's determine the color:", "Let's make this more colorful:", "Finally, the color:", "Color it in!", "Send them a hue too...", "Select the right color:", "Let's add a little detail:"]),
						input: "select",
						options: ["red","orange","yellow","green","blue","purple","brown","white","gray","black"]
					}
				break

			// specials

			// random
				case "random-select":
					return {
						content: main.chooseRandom(["While you're waiting, what's your favorite?", "What's the best?", "Also, we're doing a survey:", "If you had to choose one (and you do), what would you choose?", "So...", "Take your time deciding:", "Which of these is the good one?", "So many options, so little significance:", "What's the worst?"]),
						input: "select",
						options: main.chooseRandom([["red","orange","yellow","green","blue","purple","brown","white","gray","black"], ["shirt", "pants", "shoes"], options, ["earth", "wind", "fire", "water"], ["spring", "summer", "autumn", "winter"], ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], [0,1,2,3,4,5,6,7,8,9], ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"], ["north", "east", "west", "south"], ["up", "right", "left", "down"], ["rock", "paper", "scissors"], ["africa", "antarctica", "asia", "australia", "europe", "north america", "south america"]])
					}
				break

				case "random-buttons":
					return {
						content: main.chooseRandom(["While you're waiting, which is better?", "So uh... click a random button.", "The eternal dilemma...", "What do you like better?", "Which do you prefer?", "Left or right?", "Quick question:", "Just doing a survey here..."])
						input: "buttons",
						options: main.chooseRandom([["yes", "no"], ["cats", "dogs"], ["right", "left"], ["0", "1"], ["a", "b"], ["circles", "squares"], ["ghosts", "ghouls"], ["detectives", "inspectors"], ["mystery", "horror"], ["chocolate", "vanilla"], ["cookies", "cake"], ["rock-n-roll", "classical"], ["night", "day"], ["ocean", "mountains"], ["urban", "rural"], ["music", "science"], ["buttons", "dropdowns"], ["light", "dark"], ["rain", "sun"], ["scifi", "fantasy"]])
					}
				break

				case "random-text":
					return {
						content: main.chooseRandom(["Type any word you want:", "Go ahead and type a word.", "What's a word you particularly enjoy?", "So, tell me what you had for breakfast.", "What's the farthest you've ever been from home?", "Name a country. Any country.", "What's the best flavor of ice cream?", "If you could be anything, what would it be?", "What's your favorite type of cloud?", "Enter a number. Any number.", "Type your favorite letter.", "Time to button mash. (Letters and numbers only.)"]),
						input: "text",
						options: (/^[a-zA-Z0-9\s]*$/gi)
					}
				break

			// others
				default:
					return {
						content: "",
						input: null,
						options: null
					}
				break

		}
	}