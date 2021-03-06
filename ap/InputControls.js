﻿/*
 *  copyright 2012 James Ingram
 *  http://james-ingram-act-two.de/
 *
 *  Code licensed under MIT
 *  https://github.com/notator/assistant-performer/blob/master/License.md
 *
 *  ap/InputControls.js
 *  Public interface contains:
 *     InputControls(inputControlsNode) // Chord definition constructor. Reads the XML in the inputControlsNode. 
 *  
 */

/*jslint bitwise: false, nomen: false, plusplus: true, white: true */
/*global _AP: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

_AP.namespace('_AP.inputControls');

_AP.inputControls = (function ()
{
    "use strict";
    var
    // InputControls constructor
    // inputControls sets the performance options for a Seq, by individually overriding the current options in the Seq's Output Voice.
	// contains: 
    //		inputControls.noteOnKey -- possible values: "ignore", "transpose", "matchExactly" 
    //		inputControls.noteOnVel -- possible values: "ignore", "scale"  
    //		inputControls.noteOff -- possible values: "ignore", "stop", "stopNow", "fade", "shortFade"  
    //		inputControls.shortFade  -- only defined if noteOff is set to "shortfade". Possible values: an integer >= 0. 
    //		inputControls.pressure -- possible values: "ignore", "aftertouch", "channelPressure", "pitchWheel", "modulation", "volume", "pan"
    //									               "expression", "timbre", "brightness", "effects", "tremolo", "chorus", "celeste", "phaser"
    //		inputControls.pitchWheel -- possible values: same as pressure
    //		inputControls.modulation -- possible values: same as pressure
    //		inputControls.maxVolume -- only defined if one of the above controllers is set to "volume". Possible values: 0..127
    //		inputControls.minVolume -- only defined if one of the above controllers is set to "volume". Possible values: 0..127
    //		inputControls.speedOption -- possible values: "none", "noteOnKey", "noteOnVel", "pressure", "pitchWheel", "modulation"
    //		inputControls.maxSpeedPercent -- only defined if speedOption is not "none". Possible values: an integer > 100
	InputControls = function (inputControlsNode)
	{
		if (!(this instanceof InputControls))
		{
			return new InputControls(inputControlsNode);
		}

		var i, attr, attrLen;

		if(inputControlsNode === undefined || inputControlsNode === null)
		{
			// each InputHandler is initialized with this set of default options 
			this.noteOnKey = "ignore";
			this.noteOnVel = "ignore";
			this.noteOff = "ignore";
			this.pressure = "ignore";
			this.pitchWheel = "ignore";
			this.modulation = "ignore";
			this.speedOption = "none";
		}
		else
		{
			attrLen = inputControlsNode.attributes.length;

			for(i = 0; i < attrLen; ++i)
			{
				attr = inputControlsNode.attributes[i];
				switch(attr.name)
				{
					case "noteOnKey":
						this.noteOnKey = attr.value;
						break;
					case "noteOnVel":
						this.noteOnVel = attr.value;
						break;
					case "noteOff":
						this.noteOff = attr.value;
						break;
					case "shortFade":
						this.shortFade = parseInt(attr.value, 10);
						break;
					case "pressure":
						this.pressure = attr.value;
						break;
					case "pitchWheel":
						this.pitchWheel = attr.value;
						break;
					case "modulation":
						this.modulation = attr.value;
						break;
					case "maxVolume":
						this.maxVolume = parseInt(attr.value, 10);
						break;
					case "minVolume":
						this.minVolume = parseInt(attr.value, 10);
						break;
					case "speedOption":
						this.speedOption = attr.value;
						break;
					case "maxSpeedPercent":
						this.maxSpeedPercent = parseInt(attr.value, 10);
						break;
					default:
						throw (">>>>>>>>>> Illegal InputControls attribute <<<<<<<<<<");
				}
			}
		}
        return this;
    },

    // public API
    publicAPI =
    {
        // public InputControls(inputControlsNode) constructor.
        InputControls: InputControls
    };

	// Returns a new inputControls object that is the result of cascading
    // this inputControls object over the baseInputControls (which can be undefined)
    InputControls.prototype.getCascadeOver = function(baseInputControls)
    {
    	var rval = {};

    	console.assert(false, "This block of code has not been tested!");

    	if(this.noteOnKey !== undefined)
    	{
    		rval.noteOnKey = this.noteOnKey;
    	}
    	else if(baseInputControls !== undefined && baseInputControls.noteOnKey !== undefined)
    	{
    		rval.noteOnKey = baseInputControls.noteOnKey;
    	}

    	if(this.noteOnVel !== undefined)
    	{
    		rval.noteOnVel = this.noteOnVel;
    	}
    	else if(baseInputControls !== undefined && baseInputControls.noteOnVel !== undefined)
    	{
    		rval.noteOnVel = baseInputControls.noteOnVel;
    	}

    	if(this.noteOff !== undefined)
    	{
    		rval.noteOff = this.noteOff;
    	}
    	else if(baseInputControls !== undefined && baseInputControls.noteOff !== undefined)
    	{
    		rval.noteOff = baseInputControls.noteOff;
    	}

    	if(this.noteOff !== undefined)
    	{
    		rval.noteOff = this.noteOff;
    		if(rval.noteOff === "shortFade")
    		{
    			rval.shortFade = this.shortFade;
    		}
    	}
    	else if(baseInputControls !== undefined && baseInputControls.noteOff !== undefined)
    	{
    		rval.noteOff = baseInputControls.noteOff;
    		if(rval.noteOff === "shortFade")
    		{
    			rval.shortFade = baseInputControls.shortFade;
    		}
    	}

    	if(this.pressure !== undefined)
    	{
    		rval.pressure = this.pressure;
    		if(rval.pressure === "volume")
    		{
    			rval.maxVolume = this.maxVolume;
    			rval.minVolume = this.minVolume;
    		}
    	}
    	else if(baseInputControls !== undefined && baseInputControls.pressure !== undefined)
    	{
    		rval.pressure = baseInputControls.pressure;
    		if(rval.pressure === "volume")
    		{
    			rval.maxVolume = baseInputControls.maxVolume;
    			rval.minVolume = baseInputControls.minVolume;
    		}
    	}

    	if(this.pitchWheel !== undefined)
    	{
    		rval.pitchWheel = this.pitchWheel;
    		if(rval.pitchWheel === "volume")
    		{
    			rval.maxVolume = this.maxVolume;
    			rval.minVolume = this.minVolume;
    		}
    	}
    	else if(baseInputControls !== undefined && baseInputControls.pitchWheel !== undefined)
    	{
    		rval.pitchWheel = baseInputControls.pitchWheel;
    		if(rval.pitchWheel === "volume")
    		{
    			rval.maxVolume = baseInputControls.maxVolume;
    			rval.minVolume = baseInputControls.minVolume;
    		}
    	}

    	if(this.modulation !== undefined)
    	{
    		rval.modulation = this.modulation;
    		if(rval.modulation === "volume")
    		{
    			rval.maxVolume = this.maxVolume;
    			rval.minVolume = this.minVolume;
    		}
    	}
    	else if(baseInputControls !== undefined && baseInputControls.modulation !== undefined)
    	{
    		rval.modulation = baseInputControls.modulation;
    		if(rval.modulation === "volume")
    		{
    			rval.maxVolume = baseInputControls.maxVolume;
    			rval.minVolume = baseInputControls.minVolume;
    		}
    	}

    	if(this.speedOption !== undefined)
    	{
    		rval.speedOption = this.speedOption;
    		if(rval.speedOption !== "none")
    		{
    			rval.maxSpeedPercent = this.maxSpeedPercent;
    		}
    	}
    	else if(baseInputControls !== undefined && baseInputControls.speedOption !== undefined)
    	{
    		rval.speedOption = baseInputControls.speedOption;
    		if(rval.speedOption !== "none")
    		{
    			rval.maxSpeedPercent = baseInputControls.maxSpeedPercent;
    		}
    	}

    	return rval;
    };

    return publicAPI;

} ());

