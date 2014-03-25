﻿/*
 *  copyright 2012 James Ingram
 *  http://james-ingram-act-two.de/
 *
 *  Code licensed under MIT
 *  https://github.com/notator/assistant-performer/blob/master/License.md
 *
 *  ap/ChordDef.js
 *  Public interface contains:
 *     ChordDef(chordDefNode) // Chord definition constructor. Reads the XML in the chordDefNode. 
 *  
 */

/*jslint bitwise: false, nomen: false, plusplus: true, white: true */

_AP.namespace('_AP.chordDef');

_AP.chordDef = (function ()
{
    "use strict";
    var
    // The argument is a string containing a list of integers separated by single spaces
    // This function returns the corresponding array of numbers.
    numberArray = function (numberList)
    {
        var stringArray = numberList.split(' '),
            len = stringArray.length,
            numArray = [],
            i;

        for (i = 0; i < len; ++i)
        {
            numArray.push(parseInt(stringArray[i], 10));
        }
        return numArray;
    },

    chordAttributes = function (chordDefNode)
    {
        var a,
            attributes = {},
            attributesLength = chordDefNode.attributes.length,
            i;

        attributes.repeatMoments = true; // default value
        attributes.hasChordOff = true; // default value

        for (i = 0; i < attributesLength; ++i)
        {
            a = chordDefNode.attributes[i];

            // console.log(a.name + " = " + a.value);

            switch (a.name)
            {
                case "id":
                    attributes.id = a.value; // a string
                    break;
                case "volume":
                    attributes.volume = parseInt(a.value, 10);
                    break;
                case "repeatMoments":
                    if(a.value === "0")
                    {
                        attributes.repeatMoments = false;
                    }
                    // if repeatMoments is undefined, it is true
                    break;
                case "hasChordOff":
                    if(a.value === "0")
                    {
                        attributes.hasChordOff = false;
                    }
                    // if hasChordOff is undefined, it is true
                    break;
                case "pitchWheelDeviation":
                    attributes.pitchWheelDeviation = parseInt(a.value, 10);
                    break;
                case "minBasicChordMsDuration":
                    attributes.minBasicChordMsDuration = parseInt(a.value, 10);
                    break;
                default:
                    throw (">>>>>>>>>> Illegal midiChord attribute  <<<<<<<<<<");
            }
        }
        // the following attributes can be undefined
        //  volume
        //  hasChordOff (true by default)
        //  pitchWheelDeviation (default is 2 or unchanged)
        //  minBasicChordMsDuration (default is 1 millisecond)
        if (attributes.id === undefined)
        {
            throw ("Error: chords must have an id!");
        }

        return attributes;
    },

    basicChordsArray = function (chordDefNode)
    {
        var basicChordsDef = chordDefNode.firstElementChild,
            basicChordDef = basicChordsDef.firstElementChild,
            basicChrdsArray = [];

        function getBasicChord(basicChordDef)
        {
            var attr,
                basicChord = {},
                attributesLength = basicChordDef.attributes.length,
                i;

            for (i = 0; i < attributesLength; ++i)
            {
                attr = basicChordDef.attributes[i];
                // console.log(attr.name + " = " + attr.value);
                switch (attr.name)
                {
                    case "msDuration":
                        basicChord.msDuration = parseInt(attr.value, 10);
                        break;
                    case "bank":
                        basicChord.bank = parseInt(attr.value, 10);
                        break;
                    case "patch":
                        basicChord.patch = parseInt(attr.value, 10);
                        break;
                    case "hasChordOff":
                        if (attr.value === "0")
                        {
                            basicChord.hasChordOff = false;
                        }
                        // is true if undefined
                        break;
                    case "notes":
                        basicChord.notes = [];
                        basicChord.notes = numberArray(attr.value);
                        break;
                    case "velocities":
                        basicChord.velocities = [];
                        basicChord.velocities = numberArray(attr.value);
                        break;
                    default:
                        throw (">>>>>>>>>> Illegal basicChord attribute <<<<<<<<<<");
                }
            }

            // the following properties can be undefined:
            //    bank;
            //    patch;
            //    hasChordOff -- if undefined, is true
            if (basicChord.msDuration === undefined
            || basicChord.notes === undefined
            || basicChord.velocities === undefined)
            {
                throw ("Error: all basic chords must have msDuration, notes and velocities");
            }

            if (basicChord.notes.length !== basicChord.velocities.length)
            {
                throw ("Error: basic chord must have the same number of notes and velocities");
            }

            return basicChord;
        }

        while (basicChordDef)
        {
            try
            {
                basicChrdsArray.push(getBasicChord(basicChordDef));
                basicChordDef = basicChordDef.nextElementSibling;
            }
            catch (ex)
            {
                console.log(ex);
            }
        }
        return basicChrdsArray;
    },

    // Any and all of the returned sliders properties can be undefined
    sliders = function (chordDefNode)
    {
        var sliders = {},
            attr,
            attributesLength,
            slidersDef = chordDefNode.lastElementChild,
            i;

        if (slidersDef !== null)
        {
            attributesLength = slidersDef.attributes.length;
            for (i = 0; i < attributesLength; ++i)
            {
                attr = slidersDef.attributes[i];
                // console.log(attr.name + " = " + attr.value);

                switch (attr.name)
                {
                    case "pitchWheel":
                        sliders.pitchWheel = [];
                        sliders.pitchWheel = numberArray(attr.value);
                        break;
                    case "pan":
                        sliders.pan = [];
                        sliders.pan = numberArray(attr.value);
                        break;
                    case "modulationWheel":
                        sliders.modulationWheel = [];
                        sliders.modulationWheel = numberArray(attr.value);
                        break;
                    case "expressionSlider":
                        sliders.expressionSlider = [];
                        sliders.expressionSlider = numberArray(attr.value);
                        break;
                    default:
                        throw (">>>>>>>>>> Illegal slider <<<<<<<<<<");
                }
            }
        }
        return sliders;
    },

    // ChordDef constructor
    // The chord contains the chordDef information from the XML in a form that is easier to program with.
    // The ChordDef has the following fields:
    //    chord.attributes
    //    chord.basicChordsArray[]
    //    chord.sliders
    //
    // chord.attributes can be:
    //       chord.attributes.id (compulsory string)
    //       chord.attributes.volume (optional int)
    //       chord.attributes.hasChordOff (optional boolean)
    //       chord.attributes.pitchWheelDeviation (optional int)
    //       chord.attributes.minBasicChordMsDuration (optional int)
    //
    // Each basicChord in the chord.basicChordsArray[] has the following fields:
    //       basicChord.msDuration (compulsory int)
    //       basicChord.bank (optional int)
    //       basicChord.patch (optional int -- compulsory, if bank is defined)
    //       basicChord.hasChordOff (optional boolean -- true if undefined)
    //       basicChord.notes[] (compulsory int array)
    //       basicChord.velocities (compulsory int array -- notes and velocities have the same length)
    //
    // chord.sliders (which are all either undefined, or numberArrays) can be:
    //       chord.sliders.pitchWheel[]
    //       chord.sliders.pan[]
    //       chord.sliders.modulationWheel[];
    //       chord.sliders.expressionSlider[];
    ChordDef = function (chordDefNode)
    {
        if (!(this instanceof ChordDef))
        {
            return new ChordDef(chordDefNode);
        }

        this.attributes = chordAttributes(chordDefNode);
        this.basicChordsArray = basicChordsArray(chordDefNode);
        this.sliders = sliders(chordDefNode);

        return this;
    },

    // public API
    publicAPI =
    {
        // public ChordDef(chordDefNode) constructor.
        ChordDef: ChordDef
    };

    return publicAPI;

} ());

