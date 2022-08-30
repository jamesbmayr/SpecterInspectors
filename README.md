# Specter Inspectors

a game of ghosts and guesses: https://jamesmayr.com/specterinspectors

<pre style='line-height: 0.5; text-align: center'>
      --------      
    //        \\    
   //          \\   
  ||     __     ||  
  ||    /  \    ||  
  ||    \  /    ||  
  ||     ||     ||  
  ||     ||     ||  
  ||     ||     ||  
  || __      __ ||  
  ||/  \    /  \||  
  |/    \__/    \|   
</pre>
<hr>

# Gameplay


## Requirements

• 5-25 players

• 1 smartphone/computer each

• 30-60 minutes



## Setup

• One player creates a game using the "new" button.

• All other players join using the 4-letter gamecode and the "join" button.

• Each player inputs a name and some clothing color info.

• On launch, each player will be given a secret special role. (2/3 good, 1/3 evil) (1/2 of the good and 1/2 of the evil get special abilities) 



## Sections

• *Story*: This is where the story takes place, including all narrative and interactive events.

• *Notes*: Players can type personal notes throughout the game to keep track of everything that happens.

• *Chats*: Certain roles, like killers and ghosts, are able to communicate in secret with others using this tab.



## Events

• *day*: Each day, players learn if anyone was murdered the night before, and they see what dreams they had. All living players can talk openly at this time.

• *execution*: Living players can accuse one another of being a murderer - this prompts a poll, and if a majority approve, the accused is put to death.

• *night*: At night, players "go to sleep" and are not allowed to speak out loud.

• *murder*: Killers can select any living player to be murdered - they must unanimously agree on a target.

• *dream*: Dead players come back as ghosts, who cannot talk, but can send "dreams" - clues about the killers based on their clothing colors.

• *random*: All other players must respond to a few random prompts before progressing - this ensures that player roles remain secret.



## Roles

• *person*: good, not magic; no special ability

• *illusionist*: good, not magic; escapes from murder on first attempt

• *healer*: good, magic; immediately resurrects murdered players every night

• *augur*: good, magic; learns allegiance of each executed player

• *clairvoyant*: good, magic; learns if a player was magic (upon execution or murder)

• *medium*: good, magic; sees name of ghost sending each dream received

• *seer*: good, magic; sees all ghost dreams every night

• *immortal*: good, magic; cannot be murdered at night

• *insomniac*: good, not magic; sees names of murder nomination targets, but cannot receive dreams

• *psychic*: good, magic; learns if allegiance of accused and accuser matches during each execution nomination

• *empath*: good, magic; one random vote is switched to match this player's during each poll

• *telepath*: good, magic; can chat with the other telepath during the day

• *watchkeeper*: good, not magic; prevents murder of others each night, but reveals identity

• *detective*: good, not magic; learns allegiance of one random player every night


• *killer*: evil, not magic; can chat with other evil players at night

• *dreamsnatcher*: evil, magic; sees all ghost dreams every night

• *obscurer*: evil, magic; when poll results are revealed, names will be hidden

• *cheater*: evil, not magic; one random vote is switched to match this player's during each poll

• *spellcaster*: evil, magic; unknown to player ghosts



## Ending

• *good*: all evil players are dead

• *evil*: # evil players alive >= # good players alive



<hr>

# App Structure

<pre>
|- package.json
|- index.js (handleRequest, parseRequest, routeRequest, _302, _403, _404)
|
|- /node-modules/
|   |- mongo
|
|- /data/db/
|   |- sessions
|   |- games
|
|- /main/
|   |- logic.js (logError, logStatus, logMessage, getEnvironment, getAsset, isReserved, isNumLet, isBot, renderHTML, generateRandom, chooseRandom, sortRandom, locateIP, sanitizeString, determineSession, retrieveData, storeData)
|   |- stylesheet.css
|   |- script.js (isNumLet, isEmail, sanitizeString, displayError, buildGhosts, animateGhosts, sendPost)
|   |
|   |- banner.png
|   |- logo.png
|   |- logo.svg
|   |- _404.html
|
|- / (home)
|   |- logic.js (createGame, createPlayer, joinGame)
|   |- index.html
|   |- stylesheet.css
|   |- script.js (createGame, joinGame)
|
|- /about/
|   |- index.html
|   |- stylesheet.css
|   |- script.js (submitFeedback)
|
|- /game/
    |- logic.js (fetchData, submitChat, submitNotes, submitEvent, createStaticEvent, createActionEvent, createQueueEvent, getRoleDescription, checkQueue, setupPlayer, launchGame, createDay, createNight, executePlayer, murderPlayer, setupDream, setupRandom)
    |- index.html
    |- stylesheet.css
    |- script.js (scrollToNewest, startTouch, moveTouch, slideContainer, submitNotes, submitChat, submitEvent, buildChat, buildEvent, disableEvent, enableEvent, localizeTimes, fetchData)
</pre>
