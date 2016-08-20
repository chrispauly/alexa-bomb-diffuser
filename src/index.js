/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

var APP_ID = undefined;

var SKILL_INDEX = "SkillLevel";
var DETONATE_INDEX = "DetonateColor";
var DIFFUSE_INDEX = "DiffuseColors";
var CHOSENCOLORS_INDEX = "ChosenColors";
var GAMESTATE_INDEX = "GameState"; 
var COLORS = ["red","blue","green","yellow"];
var ENDGAME_MESSAGE = "Thank you for playing!";
var GAME_STATES = ["newgame","ingame","playagain"]; 

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * BombDiffuser is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var BombDiffuser = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
BombDiffuser.prototype = Object.create(AlexaSkill.prototype);
BombDiffuser.prototype.constructor = BombDiffuser;

BombDiffuser.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("BombDiffuser onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
	session.attributes[GAMESTATE_INDEX] = GAME_STATES[0];
};

BombDiffuser.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("BombDiffuser onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    newGame(response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
BombDiffuser.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("BombDiffuser onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

BombDiffuser.prototype.intentHandlers = {
    "ChooseSkillLevel": function (intent, session, response) {
		if(session.attributes[GAMESTATE_INDEX] === GAME_STATES[2])
			playAgain(response);
		else
        	chooseSkillLevel(intent, session, response);
    },
	
	"CutWire": function (intent, session, response) {
		if(!(session.attributes && session.attributes[DETONATE_INDEX]))
			chooseSkillLevelHelp(session, response);
		else if(session.attributes[GAMESTATE_INDEX] === GAME_STATES[2])
			playAgain(response);
		else
			cutWire(intent, session, response);
    },
	
	"StartNewGame": function (intent, session, response) {
		var playAgain = (intent.slots.Yes && intent.slots.Yes.value);

		// If you don't say a valid color, you get set to this intent.
		// so, recover in here to go to the cutWire logic
		if(session.attributes[GAMESTATE_INDEX] === GAME_STATES[1])
			cutWire(intent, session, response);
		else if(session.attributes[GAMESTATE_INDEX] !== GAME_STATES[2])
			newGame(response);
		else if(playAgain)
			chooseSkillLevelHelp(session, response);
		else
			response.tell(ENDGAME_MESSAGE);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You must save the day!  Quickly, choose an available color of the wire to cut.", "What can I help you with?");
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        response.tell(ENDGAME_MESSAGE);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        response.tell(ENDGAME_MESSAGE);
    }
};

function chooseSkillLevelHelp(session, response) {
	session.attributes[GAMESTATE_INDEX] = GAME_STATES[0];
	response.ask("Choose a skill level: Easy, Confident, or Maniac",
				 "If you would like to quit, say stop.");
}

function newGame(response) {
	var speechOutput = "Welcome to Bomb Diffuser!  Your goal is to save the day.  "
	                 + "A bomb has been found with 4 different colored wires.  If you cut the wrong wire, the bomb will detonate.  "
					 + "Do you want to try the easy, confident, or the maniac game?";
	var helpOutput = "Your choices are Easy, Confident, or Maniac";
	response.ask(speechOutput, helpOutput);
}

function gameDescription(questionToAsk) {
	var speechOutput = "There are three skill levels to choose from: Easy, Confident, and Maniac.  "
					 + "Easy has two neutral wires and one diffuser wire, "
					 + "Confident has one neutral wire and two diffuser wires, "
					 + "Maniac has no neutral wires and three diffuser wires.  "
					 + "Cutting a neutral wire is always safe, but does not diffuse the bomb.  "
					 + "You need to cut all the diffuser wires without cutting the detonator wire.  "
					 + "If you cut the detonator wire, the bomb will explode.  ";
}

function chooseSkillLevel(intent, session, response) {
	// If response if valid, set the skill level, pick the colors, and start the game
	var skill = intent.slots.SkillLevel;
	var sessionAttributes = session.attributes;
	var colors = buildRandomColorArray();

	if(skill.value === "easy") {
		sessionAttributes[DIFFUSE_INDEX] = [colors[1]];
	} else if (skill.value === "confident") {
		sessionAttributes[DIFFUSE_INDEX] = [colors[1],colors[2]];
	} else if (skill.value === "maniac") {
		sessionAttributes[DIFFUSE_INDEX] = [colors[1],colors[2],colors[3]];
	} else {
		// Error, ask again to pick easy confident or maniac
		response.ask(speechOutput, helpOutput);
	}

	// Reset the chosencolors list
	sessionAttributes[CHOSENCOLORS_INDEX] = [];
	sessionAttributes[DETONATE_INDEX] = colors[0];
	session.attributes[GAMESTATE_INDEX] = GAME_STATES[1];
	response.ask("Which wire do you want to cut: " + cutWireOptions(sessionAttributes[CHOSENCOLORS_INDEX]));
}

function cutWireOptions(chosenColors) {
	var options = "";
	var orValue = COLORS.length - chosenColors.length;
	var optionCount = 0;

	for (i = 0; i < COLORS.length; i++) {
		if(chosenColors.indexOf(COLORS[i]) === -1) {
			options += COLORS[i];
			optionCount++;

			if(orValue > 1 && optionCount === (orValue-1))
				options += ", or ";
			else
				options += ", ";
		}
	}
	return options;
}

function cutWire(intent, session, response) {
	
	// Game play logic
	var sessionAttributes = session.attributes;

	// If you got in here without a color, give the options again
	if(!intent.slots.Color) {
		response.ask("You have to choose a wire that hasn't been cut.  Your options are: " 
		             + cutWireOptions(sessionAttributes[CHOSENCOLORS_INDEX]), 
					 "If you want to quit, just say stop.");
	}

	var selectedColor = intent.slots.Color.value;
	// Verify it's a valid color
	if(sessionAttributes[CHOSENCOLORS_INDEX].indexOf(selectedColor) !== -1) {
		response.ask("You already have cut the " + selectedColor 
		             + " wire.  The wires that haven't been cut are: " 
		             + cutWireOptions(sessionAttributes[CHOSENCOLORS_INDEX]), 
					 "If you want to quit, just say stop.");
	}

	// If color is detonate color, play detonate and ask to start new game
	if (selectedColor === sessionAttributes[DETONATE_INDEX]) {
		session.attributes[GAMESTATE_INDEX] = GAME_STATES[2];		
		response.ask({ 
			speech: "<speak>Uh oh, that was the wrong wire!"
			      + "<audio src='https://alexafiles.blob.core.windows.net/demo/explosion.mp3' />"
				  + "<break time=\".5s\" />Do you want to play again?</speak>",
        	type: AlexaSkill.speechOutputType.SSML
		});
	}
	else {
		sessionAttributes[CHOSENCOLORS_INDEX].push(selectedColor);
	}

	// If color is diffuse color, remove from list and see if you have any diffuses left, if not you won the game ask if they want to start a new game
	var diffused = true;
	for (i = 0; i < sessionAttributes[DIFFUSE_INDEX].length; i++) {
		if(sessionAttributes[CHOSENCOLORS_INDEX].indexOf(sessionAttributes[DIFFUSE_INDEX][i]) === -1)
			diffused = false;
	}

	if(diffused) {
		session.attributes[GAMESTATE_INDEX] = GAME_STATES[2];		
		response.ask({ 
			speech: "<speak>You saved the day!"
			      + "<audio src='https://alexafiles.blob.core.windows.net/demo/applause.mp3' />"
				  + "<break time=\"1s\" />Do you want to play again?</speak>",
        	type: AlexaSkill.speechOutputType.SSML
		});
	}
	else {
		var wireOptions = cutWireOptions(sessionAttributes[CHOSENCOLORS_INDEX]);
		response.ask("Hmmm, nothing happened.  Which wire do you want to cut next: " + wireOptions, "Your options are: " + wireOptions);
	}
}

function playAgain(response) {
	response.ask("Do you want to play again?  Please say yes or no.", "To quit just say stop.");
}

function buildRandomColorArray() {
	var randomColors = [];
	
	while(randomColors.length < COLORS.length) {
		var color = COLORS[Math.floor(Math.random() * COLORS.length)];
		if(randomColors.indexOf(color) === -1)
			randomColors.push(color);
	}
	return randomColors;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var bombDiffuser = new BombDiffuser();
    bombDiffuser.execute(event, context);
};

