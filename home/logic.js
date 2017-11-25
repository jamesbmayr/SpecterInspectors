/*** modules ***/
	var main = require("../main/logic")
	var game = require("../game/logic")
	module.exports = {}

/*** creates ***/
	/* createGame */
		module.exports.createGame = createGame
		function createGame(request, callback) {
			try {
				request.game = {
					id: main.generateRandom(),
					created: new Date().getTime(),
					updated: new Date().getTime(),
					state: {
						locked:  false,
						start:   false,
						end:     false,
						victory: false,
						pause:   false,
						day:     0,
						night:   false
					},
					temporary: {
						dreams: {},
						killed: [],
						killer: []
					},
					flavor: {
						ghost:     main.chooseRandom(["Petey McPeterson", "Gregorio the Great", "Archduke Ferdinand", "Princess Pomegranate", "Carol from HR", "Millie Miles", "Sam Pats", "Shmorko Jr.", "Anabel Lee", "Santa Claus", "Dudebro", "Vanessa Vines", "Robotron-9000", "Professor Z", "Dr. Rogers", "Gertrude Glarkenstein", "Li'l Bigs", "Mrs. Brinkley", "Paul", "NBA All-Star Jordan McDowell", "Captain Patchwork", "Lady Eliza", "Snuffles", "That Guy From That Party", "Old Man Jenkins", "Steve Stevens", "The Scientist", "Father O'Malley", "Madame LeChat", "Miss Francine"]),
						locale:    main.chooseRandom(["at a sunny California beach house", "on the great Canadian ski slopes", "deep in the uncharted jungles of Southeast Asia", "at a hotel on the floor of the Pacific Ocean", "aboard the International Space Station", "at a piano factory in Brooklyn", "at a world-famous amusement park in Floria", "on a Caribbean cruise", "at a cabin in the woods", "at someone's apartment", "in a secret underground bunker dating back to the Cold War", "at a boarded-up church on the outskirts of a small town in rural France", "at a multi-day technology expo in Las Vegas", "on a cross-continental train leaving from Beijing", "on a hippie commune in the mid-west", "at a seedy motel that somebody should have looked up online first", "on a broken-down ferry in the middle of Lake Erie", "beneath the open skies", "at the precipe", "on the floor of the Grand Canyon", "on a trans-Atlantic flight", "at the sky fortress of myth", "in a warehouse just outside of town", "on the fourth floor", "at your old stomping grounds", "on a decommissioned military base"]),
						rationale: main.chooseRandom(["for a business conference", "to stage an intervention", "for an intense study session", "for the solar eclipse", "to celebrate a birthday", "for an obscure, probably made-up holiday", "to discuss the elephant in the room", "for no particular reason", "to plan the overthrow of capitalism", "for a good time", "to record some original music", "for an arts and crafts marathon", "for the annual bird-watching festival", "to file your taxes", "to celebrate the end of the semester", "for a bizarre bachelor(ette) party", "out of scientific curiosity", "for a movie marathon", "in honor of your late great-grandmother", "at the suggestion of your overbearing parents", "because of THE RITUAL", "to catalogue the region's wildlife", "to rehearse", "to conduct experiments", "as you always do this time of year", "to survey the local populace", "to soak in the culture", "for a corporate retreat", "to get a taste of the high life", "as part of a challenge"])
					},
					players: {},
					events:  {},
					chats: {
						killer:   [],
						ghost:    [],
						telepath: []
					}
				}

				request.game.players[request.session.id] = createPlayer(request)
				request.game.players[request.session.id].status.creator = true
				
				var queueEvent = game.createQueueEvent(request, {author: "welcome"})
					request.game.events[queueEvent.id] = queueEvent
				var welcomeEvent = game.createActionEvent(request, {type: "setup-welcome", queue: queueEvent.id})
					request.game.events[welcomeEvent.id] = welcomeEvent

				main.storeData("games", null, request.game, {}, function (data) {
					callback({success: true, message: "Created the game!", location: "../../game/" + request.game.id.substring(0,4)})
				})
			}
			catch (error) {
				main.logError(error)
				callback({success: false, message: "unable to create game"})
			}
		}

	/* createPlayer */
		module.exports.createPlayer = createPlayer
		function createPlayer(request) {
			try {
				var player = {
					id: request.session.id,
					name: null,
					colors: {
						shirt: null,
						pants: null
					},
					status: {
						alive: true,
						good:  true,
						magic: false,
						role:  "person"
					},
					notes: ""
				}

				return player
			}
			catch (error) {
				main.logError(error)
				return false
			}
		}

/*** submits ***/
	/* joinGame */
		module.exports.joinGame = joinGame
		function joinGame(request, callback) {
			try {
				var gameCode = request.post.gameCode.replace(" ", "").trim().toLowerCase() || false

				if (!gameCode) {
					callback({success: false, message: "You're missing a game id!"})
				}
				else if (gameCode.length !== 4) {
					callback({success: false, message: "The game id must be 4 characters."})
				}
				else if (!main.isNumLet(gameCode)) {
					callback({success: false, message: "The game id must be letters and numbers only."})
				}
				else {
					main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + gameCode + "'"}, {$multi: true}, function (games) {
						if (!games) {
							callback({success: false, message: "The game id not found..."})
						}
						else if (Object.keys(games[0].players).length >= 25) {
							callback({success: false, message: "This game is maxed out!"})
						}
						else if (games[0].players[request.session.id]) {
							callback({success: true, message: "You've already joined this game.", location: "../../game/" + games[0].id.substring(0,4)})
						}
						else if (games[0].state.start) {
							callback({success: false, message: "This game has already started."})
						}
						else {
							request.game = games[0]
							var player = createPlayer(request)
							var queueID = Object.keys(request.game.events).find(function (e) { return (request.game.events[e].author == "welcome") })
							var queue = request.game.events[queueID]
								queue.doers.push(player.id)

							var set  = {}
								set.updated = new Date().getTime()
								set["players." + request.session.id] = player
								set["events." + queue.id + ".doers"] = queue.doers
							var welcomeEvent = game.createActionEvent(request, {type: "setup-welcome"})
								set["events." + welcomeEvent.id] = welcomeEvent

							main.storeData("games", {id: request.game.id}, {$set: set}, {}, function (data) {
								if (!data) {
									callback({success: false, message: "Unable to join this game."})
								}
								else {
									callback({success: true, message: "You joined the game!", location: "../../game/" + request.game.id.substring(0,4)})
								}
							})
						}
					})
				}
			}
			catch (error) {
				main.logError(error)
				callback({success: false, message: "unable to join game"})
			}
		}
