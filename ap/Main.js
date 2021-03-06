/*
 *  copyright 2012 James Ingram
 *  http://james-ingram-act-two.de/
 *
 *  Code licensed under MIT
 *  https://github.com/notator/assistant-performer/blob/master/License.md
 *
 *  ap/Main.js
 *  Chris Wilson's ap/WebMIDIAPI.js has been included as a script in
 *  ../assistantPerformer.html, so the Web MIDI API is available.
 *  When browsers implement the Web MIDI API natively, the code in
 *  ap/WebMIDIAPI.js is ignored (does nothing). In this function,
 *  1. The midiAccess object is first retrieved by calling
 *       window.navigator.requestMIDIAccess(onSuccessCallback, onErrorCallback);
 *  2. onSuccessCallback calls _AP.controls.init(midiAccess) which saves the
 *     midiAccess object and sets the contents of the device selector menus in
 *     the Assistant Performer's user interface.
 */

/*jslint bitwise: false, nomen: false, plusplus: true, white: true */
/*global _AP: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

window.addEventListener("load", function (window)
{
    "use strict";

    var
    onSuccessCallback = function (midiAccess)
    {
        // Save the midiAccess object and set
        // the contents of the device selector menus.
        _AP.controls.init(midiAccess);
    },
    onErrorCallback = function (error)
    {
        throw "Error: Unable to set midiAccess. Error code:".concat(error.code);
    };

    navigator.requestMIDIAccess().then(onSuccessCallback, onErrorCallback);

}, false);


