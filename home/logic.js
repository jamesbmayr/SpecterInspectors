/* modules */
	var main = require("../main/logic")

	module.exports = {}

/* createGame */
	module.exports.createGame = createGame
	function createGame(request, callback) {
		var game = {
			id: main.generateRandom(),
			created: new Date().getTime(),
			updated: new Date().getTime(),
			state: {
				locked: true,
				start:  false,
				end:    false,
				pause:  false,
				day:    0,
			},
			players: [createPlayer(request)],
			roles:   [],
			events:  [],
			chats: {
				killers:   [],
				ghosts:    [],
				telepaths: []
			}
		}

		main.storeData("games", null, game, {}, function (results) {
			callback({success: true, message: "created game", location: "../../game/" + game.id.substring(0,4)})
		})

	}

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
					var game = games[0]
					if (game.players.filter(function(p) { return p.id === request.session.id }).length > 0) {
						callback({success: false, message: "player has already joined this game"})
					}
					else {
						var player = createPlayer(request)
						main.storeData("games", {$where: "this.id.substring(0,4) === '" + gameCode + "'"}, { $push: {players: player}, $set: {updated: new Date().getTime()} }, {}, function (game) {
							callback({success: true, message: "joined game", location: "../../game/" + game.id.substring(0,4)})
						})
					}
				}
			})
		}
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
				good: true,
				role: "person",
			},
			notes: ""
		}

		return player
	}
