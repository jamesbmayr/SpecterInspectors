/* modules */
	var http     = require("http")
	var fs       = require("fs")
	var mongo    = require("mongodb").MongoClient
	var database = "mongodb://" + getEnvironment("database_username") + ":" + getEnvironment("database_password") + getEnvironment("database_url")

	module.exports = {}

/*** logs ***/
	/* logError */
		module.exports.logError = logError
		function logError(error) {
			console.log("\n*** ERROR @ " + new Date().toLocaleString() + " ***")
			console.log(" - " + error)
		}

	/* logStatus */
		module.exports.logStatus = logStatus
		function logStatus(status) {
			console.log("\n--- STATUS @ " + new Date().toLocaleString() + " ---")
			console.log(" - " + status)
		}

	/* logMessage */
		module.exports.logMessage = logMessage
		function logMessage(message) {
			console.log(" - " + new Date().toLocaleString() + ": " + message)
		}

/*** maps ***/
	/* getEnvironment */
		module.exports.getEnvironment = getEnvironment
		function getEnvironment(index) {
			if (process.env.DOMAIN !== undefined) {
				var environment = {
					port:              process.env.PORT,
					domain:            process.env.DOMAIN,
					database_username: process.env.MLABS_USERNAME,
					database_password: process.env.MLABS_PASSWORD,
					database_url:"@" + process.env.MLABS_URL
				}
			}
			else {
				var environment = {
					port:              3000,
					domain:            "localhost",
					database_username: "localhost",
					database_password: "",
					database_url:      "27017/ss"
				}
			}

			return environment[index]
		}

	/* getAsset */
		module.exports.getAsset = getAsset
		function getAsset(index) {
			switch (index) {

				case "logo":
					return "logo.png"
				break
				
				case "fonts":
					return "https://fonts.googleapis.com/css?family=Roboto|Pacifico"
				break

				case "meta":
					return '<meta charset="UTF-8"/>\
							<meta name="description" content="Specters and Suspects is a game of ghosts and guesses."/>\
							<meta name="keywords" content="game,ghost,guess,mystery,deduction,bluffing,team,deception"/>\
							<meta name="author" content="James Mayr"/>\
							<meta property="og:title" content="Specters and Suspects: a game of ghosts and guesses"/>\
							<meta property="og:url" content="https://www.spectersandsuspects.com"/>\
							<meta property="og:description" content="Specters and Suspects is a game of ghosts and guesses."/>\
							<meta property="og:image" content="https://www.spectersandsuspects.com/banner.png"/>'
				break

				default:
					return null
				break

			}
		}

/*** checks ***/
	/* isReserved */
		module.exports.isReserved = isReserved
		function isReserved(string) {
			var reservations = ["home","welcome","admin","test","feedback","help","preferences","settings","data","database",
				"signup","signin","signout","login","logout","verify","validate","verification","validation","verified","validated",
				"user","users","game","games","tutorial","tutorials","statistic","statistics","guest","guests","example","examples",
				"create","new","delete","read","start","go","all"]

			return (reservations.indexOf(string.toLowerCase().replace(/\s/g,"")) > -1)
		}

	/* isNumLet */
		module.exports.isNumLet = isNumLet
		function isNumLet(string) {
			return (/^[a-z0-9A-Z_\s]+$/).test(string)
		}

	/* isBot */
		module.exports.isBot = isBot
		function isBot(agent) {
			switch (true) {
				case (agent.indexOf("Googlebot") !== -1):
					return "Googlebot"
				break
			
				case (agent.indexOf("Google Domains") !== -1):
					return "Google Domains"
				break
			
				case (agent.indexOf("Google Favicon") !== -1):
					return "Google Favicon"
				break
			
				case (agent.indexOf("https://developers.google.com/+/web/snippet/") !== -1):
					return "Google+ Snippet"
				break
			
				case (agent.indexOf("IDBot") !== -1):
					return "IDBot"
				break
			
				case (agent.indexOf("Baiduspider") !== -1):
					return "Baiduspider"
				break
			
				case (agent.indexOf("facebook") !== -1):
					return "Facebook"
				break

				default:
					return null
				break
			}
		}

/*** tools ***/		
	/* renderHTML */
		module.exports.renderHTML = renderHTML
		function renderHTML(request, file) {
			var html = {}
				html.original = fs.readFileSync(file).toString()
				html.array = html.original.split(/<script\snode>|<\/script>node>/gi)

			for (html.count = 1; html.count < html.array.length; html.count += 2) {
				try {
					html.temp = eval(html.array[html.count])
				}
				catch (error) {
					html.temp = ""
					logError("<sn>" + Math.ceil(html.count / 2) + "</sn>\n" + error)
				}
				html.array[html.count] = html.temp
			}

			return html.array.join("")
		}

	/* generateRandom */
		module.exports.generateRandom = generateRandom
		function generateRandom(set, length) {
			set = set || "0123456789abcdefghijklmnopqrstuvwxyz"
			length = length || 32
			
			var output = ""
			for (var i = 0; i < length; i++) {
				output += (set[Math.floor(Math.random() * set.length)])
			}

			if ((/[a-zA-Z]/).test(set)) {
				while (!(/[a-zA-Z]/).test(output[0])) {
					output = (set[Math.floor(Math.random() * set.length)]) + output.substring(1)
				}
			}

			return output
		}

	/* getIP */
		module.exports.getIP = getIP
		function getIP(id, ip) {
			if (ip && ip.length >= 7) {
				try {
					var apiRequest = http.request({
						method: "POST",
						host: "www.ip-api.com",
						path: "/json/" + (ip || null),
					}, function (apiResponse) {
						var data = "";
						apiResponse.on("data", function (chunk) {
							data += chunk;
						});
						apiResponse.on("end", function() {
							data = JSON.parse(data);
							var activity = {
								time:    new Date().getTime(),
								org:     data.org || null,
								isp:     data.isp || null,
								city:    data.city || null,
								state:   data.regionName || null,
								country: data.country || null
							}

							storeData("sessions", {id: id}, {$push: {activity: activity}, $set: {"info.org": data.org, "info.isp": data.isp, "info.city": data.city, "info.state": data.regionName, "info.country": data.country, updated: new Date().getTime()}}, {}, function (data) {
								logMessage("ip located")
							})
						})
					})
					
					apiRequest.write("")
					apiRequest.end()
				}
				catch (error) {
					logError(error)
				}
			}
		}

/*** database ***/
	/* getSession */
		module.exports.getSession = getSession
		function getSession(request, callback) {
			var activity = {
				time: new Date().getTime(),
				url:  request.url,
				post: request.post ? request.post.action : null
			}

			if (!request.cookie.session || request.cookie.session == null) {
				request.session = {
					id: generateRandom(),
					created: new Date().getTime(),
					updated: new Date().getTime(),
					info: {
						"ip":         request.ip,
						"user-agent": request.headers["user-agent"],
						"language":   request.headers["accept-language"],
						name:         isBot(request.headers["user-agent"]),
						org:          null,
						isp:          null,
						city:         null,
						state:        null,
						country:      null,
					},
					activity: [
						activity,
						{
							time:         new Date().getTime(),
							"ip":         request.ip,
							"user-agent": request.headers["user-agent"],
							"language":   request.headers["accept-language"],
						}
					]
				}

				storeData("sessions", null, request.session, {}, function (results) {
					getIP(request.session.id, request.ip)
					callback()
				})
			}
			else {
				storeData("sessions", {id: request.cookie.session}, {$push: {activity: activity}, $set: {updated: new Date().getTime()}}, {}, function (result) {
					if (!result) {
						request.cookie.session = false
						getSession(request, callback) //try again
					}
					else if (result.info.ip !== request.ip) { //new location
						request.session = result

						var activity = {
							time:         new Date().getTime(),
							"ip":         request.ip,
							"user-agent": request.headers["user-agent"],
							"language":   request.headers["accept-language"],
						}

						storeData("sessions", {id: result.id}, {$push: {activity: activity}, $set: {"info.ip": request.ip, "info.user-agent": request.headers["user-agent"], "info.accept-language": request.headers["accept-language"], updated: new Date().getTime()}}, {}, function (result) {
							getIP(request.session.id, request.ip)
							callback()
						})
					}
					else {
						request.session = result
						callback()
					}
				})
			}
		}

	/* retrieveData */
		module.exports.retrieveData = retrieveData
		function retrieveData(collection, query, options, callback) {
			if (arguments.length !== 4) {
				logError("retrieve error: " + JSON.stringify(arguments))
			}

			//options
				var projection = options["$projection"] || {}
				var sample = options["$sample"] || false
				var project = options["$project"] || false
				var multi = options["$multi"] || false
				var sort = options["$sort"] || {created: -1}
				var limit = options["$limit"] || 100

			mongo.connect(database, function(error, db) {
				if (error) {
					logError(error)
					callback(null)
				}

			//aggregate with $match and $sample
				else if (sample) {
					logMessage("aggregate: " + collection + ": " + JSON.stringify([{$match: query}, {$sample: sample}]))
					db.collection(collection).aggregate([{$match: query}, {$sample: sample}]).sort(sort).limit(limit).maxTimeMS(1000).toArray(function (error, resultArray) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							if (resultArray.length === 0) {
								resultArray = null
							}
							callback(resultArray)
						}
						db.close()
					})
				}

			//aggregate with $match and $project
				else if (project) {
					logMessage("aggregate: " + collection + ": " + JSON.stringify([{$match: query}, {$project: project}]))
					db.collection(collection).aggregate([{$match: query}, {$project: project}, {$sort: sort}, {$limit: limit}]).maxTimeMS(1000).toArray(function (error, resultArray) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							if (resultArray.length === 0) {
								resultArray = null
							}
							callback(resultArray)
						}
						db.close()
					})
				}

			//findOne
				else if (!multi) {
					logMessage("findOne: " + collection + ": " + JSON.stringify(query))
					db.collection(collection).findOne(query, projection, function (error, result) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							callback(result)
						}
						db.close()
					})
				}

			//find
				else if (multi) {
					logMessage("find: " + collection + ": " + JSON.stringify(query))
					db.collection(collection).find(query, projection).sort(sort).limit(limit).maxTimeMS(1000).toArray(function (error, resultArray) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							if (resultArray.length === 0) {
								resultArray = null
							}
							callback(resultArray)
						}
						db.close()
					})
				}

			})
		}

	/* storeData */
		module.exports.storeData = storeData
		function storeData(collection, filter, data, options, callback) {
			if (arguments.length !== 5) {
				logError("store error: " + JSON.stringify(arguments))
			}

			//options
				var projection = options["$projection"] || {}
				var upsert = options["$upsert"] || false
				var multi = options["$multi"] || false
				var sort = options["$sort"] || {created: -1}
				var limit = options["$limit"] || 100

			mongo.connect(database, function(error, db) {
				if (error) {
					logError(error)
					callback(null)
				}

			//insert
				else if ((filter === null) && (data !== null)) {
					logMessage("insert: " + collection + ":\n" + JSON.stringify(data))
					db.collection(collection).insert(data, function (error, result) {
						if (error) {
							logError(error)
							callback(false)
						}
						else {
							callback(result.nInserted)
						}
						db.close()
					})
				}

			//findOneAndUpdate
				else if ((filter !== null) && (data !== null) && (!multi)) {
					logMessage("findOneAndUpdate: " + collection + ": " + JSON.stringify(filter) + ":\n" + JSON.stringify(data))
					db.collection(collection).findOneAndUpdate(filter, data, {returnOriginal: false, upsert: upsert, sort: sort, projection: projection}, function (error, result) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							callback(result.value)
						}
						db.close()
					})
				}

			//update, then find
				else if ((filter !== null) && (data !== null) && (multi)) {
					logMessage("update: " + collection + ": " + JSON.stringify(filter) + ":\n" + JSON.stringify(data))
					db.collection(collection).update(filter, data, {upsert: upsert, multi: true}, function (error, result) {
						if (error) {
							logError(error)
							callback(null)
						}
						else {
							db.collection(collection).find(filter, projection).sort(sort).limit(limit).maxTimeMS(1000).toArray(function (error, resultArray) {
								if (error) {
									logError(error)
									callback(null)
								}
								else {
									if (resultArray.length === 0) {
										resultArray = null
									}
									callback(resultArray)
								}
								db.close()
							})
						}
					})
				}

			//remove
				else if ((filter !== null) && (data === null)) {
					if (multi) { multi = true }

					logMessage("remove: " + collection + ": " + JSON.stringify(filter))
					db.collection(collection).remove(filter, !multi, function (error, result) {
						if (error) {
							logError(error)
							callback(false)
						}
						else {
							callback(result.nRemoved)
						}
						db.close()
					})
				}

			})
		}
