/*** modules ***/
	var main = require("../main/logic")
	var game = require("../game/logic")
	module.exports = {}

/*** creates ***/
	/* createGame */
		module.exports.createGame = createGame
		function createGame(request, callback) {
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
					dreams:  [],
					killed:  []
				},
				players: {},
				events:  [],
				chats: {
					killer:   [],
					ghost:    [],
					telepath: []
				}
			}

			request.game.players[request.session.id] = createPlayer(request)
			request.game.events.push(game.createQueueEvent(request))
			request.game.events.push(game.createActionEvent(request, {type: "setup-welcome", queue: request.game.events[0].id}))

			main.storeData("games", null, request.game, {}, function (results) {
				callback({success: true, message: "created game", location: "../../game/" + request.game.id.substring(0,4)})
			})
		}

	/* createPlayer */
		module.exports.createPlayer = createPlayer
		function createPlayer(request) {
			var player = {
				id: request.session.id,
				name: null,
				colors: {
					shirt: null,
					pants: null,
					shoes: null,
				},
				status: {
					alive: true,
					good:  true,
					role:  "person"
				},
				notes: ""
			}

			return player
		}

/*** submits ***/
	/* joinGame */
		module.exports.joinGame = joinGame
		function joinGame(request, callback) {
			var gameCode = request.post.gameCode.replace(" ", "").trim().toLowerCase() || false

			if (!gameCode) {
				callback({success: false, message: "missing game code"})
			}
			else if (gameCode.length !== 4) {
				callback({success: false, message: "game code must be 4 characters"})
			}
			else if (!main.isNumLet(gameCode)) {
				callback({success: false, message: "game code must be letters and numbers only"})
			}
			else {
				main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + gameCode + "'"}, {$multi: true}, function (games) {
					if (!games) {
						callback({success: false, message: "game code not found"})
					}
					else {
						request.game = games[0]
						if (request.game.players[request.session.id]) {
							callback({success: false, message: "player has already joined this game"})
						}
						else {
							var player = createPlayer(request)
							var queue = request.game.events[0].id
								queue.doers.push(player.id)

							var push = {}
								push["events"] = game.createActionEvent(request, {type: "setup-welcome"})
							var set  = {}
								set.updated = new Date().getTime()
								set["players." + request.session.id] = player
								set["events.$.doers"] = queue.doers

							main.storeData("games", {id: request.game.id, "events.id": queue.id}, {$set: set, $push: push}, {}, function (data) {
								callback({success: true, message: "joined game", location: "../../game/" + request.game.id.substring(0,4)})
							})
						}
					}
				})
			}
		}