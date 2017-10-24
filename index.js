/*** modules ***/
	var http = require("http")
	var fs   = require("fs")
	var qs   = require("querystring")
	var main = require("./main/logic")
	var home = require("./home/logic")
	var game = require("./game/logic")

/*** server ***/
	var port = main.getEnvironment("port")
	var server = http.createServer(handleRequest)
		server.listen(port, function (error) {
			if (error) {
				main.logError(error)
			}
			else {
				main.logStatus("listening on port " + port)
			}
		})

/*** handleRequest ***/
	function handleRequest(request, response) {
		// collect data
			var data = ""
			request.on("data", function (chunk) {
				data += chunk
			})
			request.on("end", parseRequest)

		/* parseRequest */
			function parseRequest() {
				request.get    = qs.parse(request.url.split("?")[1]) || {}
				request.path   = request.url.split("?")[0].split("/") || []
				request.url    = request.url.split("?")[0] || "/"
				request.post   = data ? JSON.parse(data) : {}
				request.cookie = request.headers.cookie ? qs.parse(request.headers.cookie.replace(/; /g, "&")) : {}
				request.ip     = request.headers["x-forwarded-for"] || request.connection.remoteAddress || request.socket.remoteAddress || request.connection.socket.remoteAddress

				main.logStatus((request.cookie.session || "new") + " @ " + request.ip + "\n[" + request.method + "] " + request.path.join("/") + "\n" + JSON.stringify(request.method == "GET" ? request.get : request.post))

				if ((/[.](ico|png|jpg|jpeg|gif|svg|pdf|txt|css|js)$/).test(request.url)) {
					routeRequest()
				}
				else {
					main.determineSession(request, routeRequest)
				}
			}

		/* routeRequest */
			function routeRequest() {
				// assets
					if (!request.session) {
						switch (true) {
							// logo
								case (/\/favicon[.]ico$/).test(request.url):
								case (/\/icon[.]png$/).test(request.url):
								case (/\/logo[.]png$/).test(request.url):
									try {
										response.writeHead(200, {"Content-Type": "image/png"});
										response.end(fs.readFileSync("./main/logo.png"), "binary");
									}
									catch (error) {_404(error)}
								break

							// banner
								case (/\/banner[.]png$/).test(request.url):
									try {
										response.writeHead(200, {"Content-Type": "image/png"});
										response.end(fs.readFileSync("./main/banner.png"), "binary");
									}
									catch (error) {_404(error)}
								break

							// stylesheet
								case (/\/stylesheet[.]css$/).test(request.url):
									try {
										response.writeHead(200, {"Content-Type": "text/css"});
										response.end( fs.readFileSync("./main/stylesheet.css") + "\n\n" + (fs.readFileSync("./" + request.path[1] + "/stylesheet.css") || "") )
									}
									catch (error) {_404(error)}
								break

							// script
								case (/\/script[.]js$/).test(request.url):
									try {
										response.writeHead(200, {"Content-Type": "text/javascript"});
										response.end( "window.onload = function() { \n" + fs.readFileSync("./main/script.js") + "\n\n" + (fs.readFileSync("./" + request.path[1] + "/script.js") || "") + "\n}" )
									}
									catch (error) {_404(error)}
								break

							// others
								default:
									_404()
								break
						}
					}
				
				// get
					else if (request.method == "GET") {
						response.writeHead(200, {
							"Set-Cookie": String( "session=" + request.session.id + "; expires=" + (new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 7)).toUTCString()) + "; path=/; domain=" + main.getEnvironment("domain") ),
							"Content-Type": "text/html; charset=utf-8"
						})

						switch(true) {
							// home
								case (/^\/$/).test(request.url):
									try {
										response.end(main.renderHTML(request, "./home/index.html"))
									}
									catch (error) {_404(error)}
								break

							// about
								case (/^\/about\/?$/).test(request.url):
									try {
										response.end(main.renderHTML(request, "./about/index.html"))
									}
									catch (error) {_404(error)}
								break

							// game
								case (/^\/game\/[0-9a-zA-Z_]*\/?$/).test(request.url):
									try {
										main.retrieveData("games", {$where: "this.id.substring(0,4) === '" + request.path[2].toLowerCase() + "'"}, {$multi: true}, function (games) {
											if (!games) {
												_302()
											}
											else if (Object.keys(games[0].players).indexOf(request.session.id) == -1) {
												_302()
											}
											else {
												request.game = games[0]
												response.end(main.renderHTML(request, "./game/index.html"))
											}
										})
									}
									catch (error) {_404(error)}
								break;

							// others
								default:
									_404()
								break;
						}
					}

				// post
					else if (request.method == "POST" && request.post.action !== undefined) {
						response.writeHead(200, {"Content-Type": "text/json"})

						switch (request.post.action) {
							// home
								case "createGame":
									try {
										home.createGame(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

								case "joinGame":
									try {
										home.joinGame(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

							// game
								case "fetchData":
									try {
										game.fetchData(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

								case "submitEvent":
									try {
										game.submitEvent(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

								case "submitNotes":
									try {
										game.submitNotes(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

								case "submitChat":
									try {
										game.submitChat(request, function (data) {
											response.end(JSON.stringify(data))
										})
									}
									catch (error) {_403(error)}
								break

							// others
								default:
									_403()
								break
						}
					}

				// others
					else {
						_403()
					}
			}

		/* _302 */
			function _302(data) {
				main.logStatus("redirecting to " + (data || "/"))
				var id = request.session ? request.session.id : 0
				response.writeHead(302, {
					"Set-Cookie": String( "session=" + id + "; expires=" + (new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 7)).toUTCString()) + "; path=/; domain=" + main.getEnvironment("domain") ),
					Location: data || "../../../../"
				})
				response.end()
			}

		/* _403 */
			function _403(data) {
				main.logError(data)
				var id = request.session ? request.session.id : 0
				response.writeHead(403, {
					"Set-Cookie": String( "session=" + id + "; expires=" + (new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 7)).toUTCString()) + "; path=/; domain=" + main.getEnvironment("domain") ),
					"Content-Type": "text/json"
				})
				response.end( JSON.stringify({success: false, error: data}) );
			}

		/* _404 */
			function _404(data) {
				main.logError(data)
				var id = request.session ? request.session.id : 0
				response.writeHead(404, {
					"Set-Cookie": String( "session=" + id + "; expires=" + (new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 7)).toUTCString()) + "; path=/; domain=" + main.getEnvironment("domain") ),
					"Content-Type": "text/html; charset=utf-8"
				})
				response.end(data || main.renderHTML(request, "./main/_404.html"));
			}
	}
