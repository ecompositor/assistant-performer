/*
*  copyright 2012 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*  https://github.com/notator/assistant-performer/blob/master/License.md
*
*  jiAssistant.js
*  The JI_NAMESPACE.assistant namespace which defines the
*    Assistant() constructor.
*  
*/

JI_NAMESPACE.namespace('JI_NAMESPACE.assistant');

JI_NAMESPACE.assistant = (function (window)
{
    "use strict";
    // begin var
    var outputDevice,
        tracksControl,

    // midi input message types
        UNKNOWN = 0,
        ILLEGAL_INDEX = 1,
        END_OF_SEQUENCE = 2,
        AFTERTOUCH = 3, // from EWI breath controller or E-MU key pressure
        MODULATION_WHEEL = 4, // from EWI bite controller or E-MU modulation wheel
        PITCH_WHEEL = 5, // from EWI pitch bend controllers or E-MU pitch wheel
        NOTE_ON = 6,
        NOTE_OFF = 7,

        options, // performance options. This is the options object in jiAPControls.
        reportEndOfPerformance, // callback
        reportMsPosition, // callback

        mainSequence, // the sequence from which the sequences are made
        subsequences, // an array of subsequence. Each subsequence is a Sequence.

    // these variables are initialized by playSpan() and used by handleMidiIn() 
        startIndex = -1,
        endIndex = -1,
        currentIndex = -1, // the index of the currently playing subsequence (which will be stopped when a noteOn or noteOff arrives).
        nextIndex = -2, // the index of the subsequence which will be played when a noteOn msg arrives (initially != startIndex) 
        subsequenceStartNow = 0.0, // used only with the relative durations option
        pausedNow = 0.0, // used only with the relative durations option (the time at which the subsequence was paused).

        stopped = true,
        paused = false,

        currentLivePerformersKeyPitch = -1, // -1 means "no key depressed". This value is set when the live performer sends a noteOn
        subsequencesLengthMinusOne, // set by makeSubsequences()

    // makeSubsequences creates the private subsequences array inside the assistant.
    // This function is called when options.assistedPerformance === true and the Start button is clicked in the upper options panel.
    // See the comment to Sequence.getSubsequences().
        makeSubsequences = function (livePerformersTrackIndex, mainSequence)
        {
            subsequences = mainSequence.getSubsequences(livePerformersTrackIndex);
            subsequencesLengthMinusOne = subsequences.length - 1;
        },

        setState = function (state)
        {
            switch (state)
            {
                case "stopped":
                    // these variables are also set in playSpan() when the state is first set to "running"
                    startIndex = -1;
                    endIndex = -1; // the index of the (unplayed) end chord or rest or endBarline
                    currentIndex = -1;
                    nextIndex = -1;
                    subsequenceStartNow = 0.0; // used only with the relative durations option
                    pausedNow = 0.0; // used only with the relative durations option (the time at which the subsequence was paused).
                    stopped = true;
                    paused = false;
                    break;
                case "paused":
                    stopped = false;
                    paused = true;
                    break;
                case "running":
                    stopped = false;
                    paused = false;
                    break;
                default:
                    throw "Unknown sequencer state!";
            }
        },

    // Can only be called when paused is true.
        resume = function ()
        {
            if (paused === true)
            {
                if (options.assistantUsesAbsoluteDurations === false)
                {
                    subsequenceStartNow += (window.performance.webkitNow() - pausedNow);
                }
                subsequences[currentIndex].resume();
                setState("running");
            }
        },

    // Can only be called while running
    // (stopped === false && paused === false)
        pause = function ()
        {
            if (stopped === false && paused === false)
            {
                pausedNow = window.performance.webkitNow();
                subsequences[currentIndex].pause();
                setState("paused");
            }
            else
            {
                throw "Attempt to pause a stopped or paused sequence.";
            }
        },

        isStopped = function ()
        {
            return stopped === true;
        },

        isPaused = function ()
        {
            return paused === true;
        },

    // Can only be called while running or paused
    // (stopped === false)
        stop = function ()
        {
            if (stopped === false)
            {
                setState("stopped");

                if (options.assistantUsesAbsoluteDurations === false)
                {
                    // reset the subsequences (they have changed speed individually during the performance).
                    makeSubsequences(mainSequence, options);
                }

                reportEndOfPerformance();
            }
            else
            {
                throw "Attempt to stop a stopped performance.";
            }
        },

    // If options.assistedPerformance === true, this is where input MIDI messages arrive, and where processing is going to be done.
    // Uses 
    //  startIndex (= -1 when stopped),
    //  endIndex  (= -1 when stopped),
    //  currentIndex (= -1 when stopped) the index of the currently playing subsequence (which should be stopped when a noteOn or noteOff arrives).
    //  nextIndex (= -1 when stopped) the index of the subsequence which will be played when a noteOn msg arrives
        handleMidiIn = function (msg)
        {
            /* test code */
            //if (options.outputDevice)
            //{
            //    options.outputDevice.sendMIDIMessage(msg);
            //}

            var inputMsgType;

            // getInputMessageType returns one of the following constants:
            // UNKNOWN = 0, ILLEGAL_INDEX = 1, END_OF_SEQUENCE = 2, AFTERTOUCH = 3, MODULATION_WHEEL = 4, PITCH_WHEEL = 5, NOTE_ON = 6, NOTE_OFF = 7
            function getInputMessageType(msg)
            {
                var type = UNKNOWN;

                switch (msg.command)
                {
                    case 0xA0:
                        type = AFTERTOUCH;
                        break;
                    case 0xB0:
                        if (msg.data1 === 1)
                        {
                            type = MODULATION_WHEEL;
                        }
                        break;
                    case 0xE0:
                        type = PITCH_WHEEL;
                        break;
                    case 0x90:
                        type = NOTE_ON;
                        break;
                    case 0x80:
                        type = NOTE_OFF;
                        break;
                    default:
                        type = UNKNOWN;
                        break;
                }
                if (type === UNKNOWN)
                {
                    if (nextIndex === endIndex)
                    {
                        type = END_OF_SEQUENCE;
                    }
                    else if (nextIndex < 0 || nextIndex >= subsequences.length)
                    {
                        type = ILLEGAL_INDEX;
                    }
                }
                return type;
            }

            function stopCurrentlyPlayingSubsequence()
            {
                // currentIndex is the index of the currently playing subsequence
                // (which should be stopped when a noteOn or noteOff arrives).
                if (currentIndex >= 0 && subsequences[currentIndex].isStopped() === false)
                {
                    subsequences[currentIndex].stop();
                }
            }

            function reportEndOfSubsequence()
            {
                currentLivePerformersKeyPitch = -1; // handleNoteOff() does nothing until this value is reset (by handleNoteOn()).
            }

            function playNextSubsequence(msg, nextSubsequence, options)
            {
                var now = window.performance.webkitNow(), // in the time frame used by sequences
                    speed = options.speed;

                if (options.assistantUsesAbsoluteDurations === false)
                {
                    if (currentIndex > 0)
                    {
                        speed = (now - subsequenceStartNow) / subsequences[currentIndex - 1].totalMsDuration();
                        // pausedNow need not be set here. It is set (if at all) in pause().
                        nextSubsequence.changeSpeed(speed);
                    }
                    subsequenceStartNow = now; // used only with the relative durations option
                }
                // if options.assistantUsesAbsoluteDurations === true, the durations will already be correct in all subsequences.
                nextSubsequence.playSpan(outputDevice, 0, Number.MAX_VALUE, tracksControl, reportEndOfSubsequence, reportMsPosition);
            }

            function handleAftertouch(msg)
            {
                console.log("Aftertouch, value:", msg.data2.toString());
            }

            function handleModulationWheel(msg)
            {
                console.log("ModulationWheel, value:", msg.data2.toString());
            }

            function handlePitchWheel(msg)
            {
                console.log("PitchWheel, value:", msg.data2.toString());
            }

            function handleNoteOff(msg)
            {
                console.log("NoteOff, pitch:", msg.data1.toString(), " velocity:", msg.data2.toString());

                if (msg.data1 === currentLivePerformersKeyPitch)
                {
                    stopCurrentlyPlayingSubsequence();
                    while (nextIndex < subsequencesLengthMinusOne && subsequences[nextIndex].restSubsequence !== undefined)
                    {
                        playNextSubsequence(msg, subsequences[nextIndex], options);
                        currentIndex = nextIndex++;
                    }
                    if (nextIndex === subsequencesLengthMinusOne) // final barline
                    {
                        reportEndOfPerformance();
                    }
                }
            }

            function handleNoteOn(msg)
            {
                console.log("NoteOn, pitch:", msg.data1.toString(), " velocity:", msg.data2.toString());
                currentLivePerformersKeyPitch = msg.data1;

                if (msg.data2 > 0)
                {
                    stopCurrentlyPlayingSubsequence();

                    if (nextIndex === startIndex || subsequences[nextIndex].chordSubsequence !== undefined)
                    {
                        playNextSubsequence(msg, subsequences[nextIndex], options);
                        currentIndex = nextIndex++;
                    }
                    else // subsequences[nextIndex] is a performer's rest subsequence
                    {
                        if (subsequences[nextIndex].restSubsequence === undefined)
                        {
                            throw "Subsequence type error.";
                        }
                        while (nextIndex < subsequencesLengthMinusOne && subsequences[nextIndex].restSubsequence !== undefined)
                        {
                            playNextSubsequence(msg, subsequences[nextIndex], options);
                            currentIndex = nextIndex++;
                        }
                    }
                }
                else // velocity 0 is "noteOff"
                {
                    handleNoteOff(msg);
                }
            }

            inputMsgType = getInputMessageType(msg);

            switch (inputMsgType)
            {
                case UNKNOWN:
                    console.log("Unknown message type.");
                    break;
                case AFTERTOUCH: // EWI breath, EMU aftertouch
                    handleAftertouch(msg);
                    break;
                case MODULATION_WHEEL: // EWI bite, EMU modulation wheel
                    handleModulationWheel(msg);
                    break;
                case PITCH_WHEEL: // EWI pitch bend up/down controllers, EMU pitch wheel
                    handlePitchWheel(msg);
                    break;

            }

            if (inputMsgType === ILLEGAL_INDEX)
            {
                throw ("illegal index");
            }
            else if (inputMsgType === END_OF_SEQUENCE)
            {
                stop();
            }
            else if (inputMsgType === NOTE_ON)
            {
                handleNoteOn(msg);
            }
            else if (inputMsgType === NOTE_OFF)
            {
                handleNoteOff(msg);
            }
        },

    // This function is called when options.assistedPerformance === true and the Go button is clicked (in the performance controls).
    // If options.assistedPerformance === false, sequence.playSpan(...) is called instead.
        playSpan = function (outDevice, fromMs, toMs, svgTracksControl, reportEndOfSpan, reportMsPos)
        {
            function getIndex(subsequences, timestamp)
            {
                var i = 0,
                    nSubsequences = subsequences.length,
                    subsequence = subsequences[0];

                while (i < nSubsequences && subsequence.timestamp < timestamp)
                {
                    i++;
                    subsequence = subsequences[i];
                }
                return i;
            }

            setState("running");
            outputDevice = outDevice;
            tracksControl = svgTracksControl;
            startIndex = getIndex(subsequences, fromMs);
            endIndex = getIndex(subsequences, toMs); // the index of the (unplayed) end chord or rest or endBarline
            currentIndex = -1;
            nextIndex = startIndex;
            subsequenceStartNow = -1;
        },

    // creats an Assistant, complete with private subsequences
    // called when the Start button is clicked, and options.assistedPerformance === true
        Assistant = function (sequence, apControlOptions, reportEndOfWholePerformance, reportMillisecondPosition)
        {
            if (!(this instanceof Assistant))
            {
                return new Assistant(sequence, apControlOptions, reportEndOfWholePerformance, reportMillisecondPosition);
            }

            if (apControlOptions === undefined || apControlOptions.assistedPerformance !== true)
            {
                throw ("Error creating Assistant.");
            }

            setState("stopped");

            mainSequence = sequence;
            reportEndOfPerformance = reportEndOfWholePerformance;
            reportMsPosition = reportMillisecondPosition;
            options = apControlOptions;

            makeSubsequences(options.livePerformersTrackIndex, sequence);

            // Starts an assisted performance 
            this.playSpan = playSpan;

            // Receives and handles incoming midi messages
            this.handleMidiIn = handleMidiIn;

            // these are called by the performance controls
            this.pause = pause; // pause()        
            this.resume = resume; // resume()
            this.stop = stop; // stop()

            this.isStopped = isStopped; // isStopped()
            this.isPaused = isPaused; // isPaused()
        },


        publicAPI =
        {
            // empty Assistant constructor
            Assistant: Assistant
        };
    // end var

    return publicAPI;

} (window));