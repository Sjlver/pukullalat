/**
 * @license
 * 
 * The MIT License
 * Copyright (c) 2011 Jonas Wagner

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */


// ***************************************************************************
// Utility functions
var PlUtility = {
    // Generates exponentially distributed random variables.
    expRandom: function(rate) {
        return -Math.log(Math.random()) / rate;
    },

    // Generates normal-distributed random variables (with mean zero and
    // standard deviation one).
    normRandom: (function() {
        var storedValue = null;

        return function() {
            // uses the marsaglia polar method:
            // https://en.wikipedia.org/wiki/marsaglia_polar_method

            // Use left-over value from previous pair, if there is one
            if (storedValue !== null) {
                var result = storedValue;
                storedValue = null;
                return result;
            }

            // No cache... construct two new random vars
            var x, y, s;
            do {
                x = Math.random() * 2.0 - 1.0;
                y = Math.random() * 2.0 - 1.0;
                s = x*x + y*y;
            } while (s >= 1.0);
            if (s === 0) return 0;
            var factor = Math.sqrt(- 2.0 * Math.log(s) / s);
            storedValue = x * factor;
            return y * factor;
        };
    })(),

    // Makes an arbitrary actor blink
    addBlinkBehavior: function(actor, period) {
        period = ((typeof(period) != 'undefined') ? period : 300);

        var blinkOn = function() {
            actor.setVisible(true);
            actor.blinkBehaviorTimeout = setTimeout(blinkOff, period);
        };
        var blinkOff = function() {
            actor.setVisible(false);
            actor.blinkBehaviorTimeout = setTimeout(blinkOn, period);
        };
        var expirationListener = {
            actorLifeCycleEvent: function(actor, event_type, time) {
                if (event_type==='expired') {
                    PlUtility.removeBlinkBehavior(actor);
                }
            }
        };

        actor.addListener(expirationListener);
        blinkOn();
    },

    // Stops blinking again (use after addBlinkBehavior)
    removeBlinkBehavior: function(actor) {
        clearTimeout(actor.blinkBehaviorTimeout);
        delete actor.blinkBehaviorTimeout;
        actor.setVisible(true);
    },
};


// ***************************************************************************
// Global Pukul Lalat object, keeping track of all our vars
var pl = {
    WIDTH:  800,
    HEIGHT: 482,

    MOSKITO_GRACE_TIME: 3000,        // The first moskitos arrive after three seconds.
    MOSKITO_SPAWN_INTERVAL: 3000,    // Moskitos spawn every 3 seconds
    MOSKITO_SPAWN_STDEV: 700,        // Standard deviation of moskito spawn time
    MOSKITO_SPAWN_INCREASES: 90000,  // Difficulty increases by 1 every 90 secs
    MOSKITO_MOVE_INTERVAL: 700,      // Moskitos move every 700 milliseconds
    MOSKITO_MOVE_STDEV: 100,         // Standard deviation of moskito move time
    MOSKITO_MOVE_INCREASES: 200000,  // Difficulty increases by 1 every 200 seconds
    CHILD_MOVE_INTERVAL: 7000,       // Child moves every 7 seconds
    CHILD_MOVE_STDEV: 1000,          // Standard deviation of child move time
    CHILD_MOVE_INCREASES: 150000,    // Difficulty increases by 1 every 200 seconds
    CHILD_WATER_TIME: 4000,          // 4 seconds break after the child fell in the water
    CHILD_WATER_NOM: 3,              // Child water time is decreased by 1/3 after first bath
    CHILD_APPEAR_TIME: 25000,        // Child first appears after 25 seconds
    DEFAULT_HIGHSCORES: [            // High scores when the user never played before
        {name: 'ABC', score: 500},
        {name: 'DEF', score: 300},
        {name: 'GHI', score: 100},
    ],
};

/**
 * Creates a loading screen, that will be shown before the images are loaded.
 */
pl.createLoadingScene = function(director) {
    pl.loadingScene = director.createScene();
    pl.loadingActors = {};
    pl.loadingActors.border1Actor = new CAAT.Actor().
        setLocation((pl.WIDTH - 200) / 2.0, (pl.HEIGHT - 30) / 2.0).
        setSize(200, 30).
        setFillStyle('#000').
        enableEvents(false);
    pl.loadingScene.addChild(pl.loadingActors.border1Actor);
    pl.loadingActors.border2Actor = new CAAT.Actor().
        setLocation((pl.WIDTH - 200) / 2.0 + 3, (pl.HEIGHT - 30) / 2.0 + 3).
        setSize(194, 24).
        setFillStyle('#fff').
        enableEvents(false);
    pl.loadingScene.addChild(pl.loadingActors.border2Actor);
    pl.loadingActors.progressbarActor = new CAAT.Actor().
        setLocation((pl.WIDTH - 200) / 2.0 + 6, (pl.HEIGHT - 30) / 2.0 + 6).
        setSize(10, 18).
        setFillStyle('#000').
        enableEvents(false);
    pl.loadingScene.addChild(pl.loadingActors.progressbarActor);

    var loadingTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Loading...").
        setLocation(pl.WIDTH / 2.0 - 75, pl.HEIGHT / 2.0 - 60);
    pl.loadingScene.addChild(loadingTextActor);
    //console.log("Loading scene created.");
};

/* Creates all the image actors; they are used in several scenes. */
pl.createActors = function() {
    // Load image actors
    pl.imageActors = {};
    pl.handheldActors = new CAAT.ActorContainer().
        setBounds(0, 0, pl.WIDTH, pl.HEIGHT).
        enableEvents(true);
    pl.hudActors = new CAAT.ActorContainer().
        setBounds(212, 123, 368, 235).
        enableEvents(false);
    pl.bearActors = new CAAT.ActorContainer().
        setBounds(320, 200, 220, 154).
        enableEvents(true);
    pl.childActors = new CAAT.ActorContainer().
        setBounds(500, 150, 80, 200).
        enableEvents(false);
    pl.moskitoActors = new CAAT.ActorContainer().
        setBounds(220, 230, 160, 125).
        enableEvents(false);

    var images = [
        {id: 'pukullalat_handheld', x: 0, y: 0, container: pl.handheldActors},
        {id: 'panda_bear', x: 46, y: 0, container: pl.bearActors},
        {id: 'panda_happy', x: 76, y: 62, container: pl.bearActors},
        {id: 'panda_hmm', x: 76, y: 62, container: pl.bearActors},
        {id: 'panda_ouch', x: 76, y: 62, container: pl.bearActors},
        {id: 'panda_left_arm_high', x: 30, y: 30, container: pl.bearActors},
        {id: 'panda_left_arm_med', x: 12, y: 66, container: pl.bearActors},
        {id: 'panda_left_arm_low', x: 0, y: 100, container: pl.bearActors},
        {id: 'panda_right_arm_low', x: 165, y: 100, container: pl.bearActors},
        {id: 'panda_right_arm_med', x: 160, y: 70, container: pl.bearActors},
        {id: 'panda_right_arm_high', x: 155, y: 22, container: pl.bearActors},
        {id: 'panda_look_center', x: 68, y: 26, container: pl.bearActors},
        {id: 'panda_look_left', x: 68, y: 26, container: pl.bearActors},
        {id: 'panda_look_right', x: 68, y: 26, container: pl.bearActors},
        {id: 'panda_child1', x: 0, y: 0, container: pl.childActors},
        {id: 'panda_child2', x: 0, y: 40, container: pl.childActors},
        {id: 'panda_child3', x: 0, y: 80, container: pl.childActors},
        {id: 'panda_child4', x: 0, y: 150, container: pl.childActors},
        {id: 'moskito1', x: 0, y: 0, container: pl.moskitoActors},
        {id: 'moskito2', x: 32, y: 0, container: pl.moskitoActors},
        {id: 'moskito3', x: 64, y: 0, container: pl.moskitoActors},
        {id: 'moskito4', x: 96, y: 0, container: pl.moskitoActors},
        {id: 'moskito4_crash', x: 92, y: -8, container: pl.moskitoActors},
        {id: 'moskito5', x: 0, y: 40, container: pl.moskitoActors},
        {id: 'moskito6', x: 28, y: 40, container: pl.moskitoActors},
        {id: 'moskito7', x: 56, y: 40, container: pl.moskitoActors},
        {id: 'moskito8', x: 84, y: 40, container: pl.moskitoActors},
        {id: 'moskito8_crash', x: 74, y: 30, container: pl.moskitoActors},
        {id: 'moskito9', x: 0, y: 80, container: pl.moskitoActors},
        {id: 'moskito10', x: 25, y: 80, container: pl.moskitoActors},
        {id: 'moskito11', x: 50, y: 80, container: pl.moskitoActors},
        {id: 'moskito12', x: 75, y: 80, container: pl.moskitoActors},
        {id: 'moskito12_crash', x: 65, y: 70, container: pl.moskitoActors},
        {id: 'health_bar1', x: 10, y: 10, container: pl.hudActors},
        {id: 'health_bar2', x: 10, y: 10, container: pl.hudActors},
        {id: 'health_bar3', x: 10, y: 10, container: pl.hudActors},
    ];
    $(images).each(function(index, image) {
        var actor = new CAAT.Actor().
            setBackgroundImage(
                new CAAT.SpriteImage().
                    initialize(pl.director.getImage(image.id), 1, 1 ).
                    getRef(), true
            ).
            enableEvents(false).
            setLocation(image.x, image.y);
        image.container.addChild(actor);
        pl.imageActors[image.id] = actor;
    });

    pl.scoreActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setLocation(200, 22);
    pl.hudActors.addChild(pl.scoreActor);

    // Create buttons for finger control
    var buttons = [
        {key: 37, x: 600, y: 335},  // left
        {key: 38, x: 0,   y: 175},  // up
        {key: 39, x: 600, y: 175},  // right
        {key: 40, x: 0,   y: 335},  // down
    ];
    $.each(buttons, function(index, b) {
        var button = new CAAT.Actor().
            setBounds(b.x, b.y, 200, 150);
        button.mouseDown = function(mouseEvent) {
            //console.log("Mouse down on button " + b.key);
            if (mouseEvent.preventDefault) {
                mouseEvent.preventDefault();
            } else {
                mouseEvent.returnValue = false;
            }
            $(document).trigger(new $.Event("keydown", {keyCode: b.key}));
        };
        pl.handheldActors.addChild(button);
    });

    // Directly clicking on the desired arm position should also work...
    pl.imageActors.panda_left_arm_high.enableEvents(true);
    pl.imageActors.panda_left_arm_high.mouseDown = function(mouseEvent) {
        pl.bear.activeSide = BearActiveSide.left;
        pl.bear.armPos = BearArmPos.high;
    };
    pl.imageActors.panda_left_arm_med.enableEvents(true);
    pl.imageActors.panda_left_arm_med.mouseDown = function(mouseEvent) {
        pl.bear.activeSide = BearActiveSide.left;
        pl.bear.armPos = BearArmPos.med;
    };
    pl.imageActors.panda_left_arm_low.enableEvents(true);
    pl.imageActors.panda_left_arm_low.mouseDown = function(mouseEvent) {
        pl.bear.activeSide = BearActiveSide.left;
        pl.bear.armPos = BearArmPos.low;
    };
    pl.imageActors.panda_right_arm_high.enableEvents(true);
    pl.imageActors.panda_right_arm_high.mouseDown = function(mouseEvent) {
        if (pl.bear.activeSide == BearActiveSide.left) {
            if (pl.child.position != BearChildPos.water) {
                pl.bear.activeSide = BearActiveSide.right;
                pl.bear.armPos = BearArmPos.high;
                pl.bear.holdChild();
            }
        } else {
            // If we're already on the right side, we can push the child up one
            // step at a time
            if (pl.bear.armPos == BearArmPos.med && pl.child.position == BearChildPos.med) {
                pl.bear.armPos = BearArmPos.high;
                pl.bear.pushChild();
            } else if (pl.child.position == BearChildPos.high) {
                pl.bear.armPos = BearArmPos.high;
                pl.bear.holdChild();
            }
        }
    };
    pl.imageActors.panda_right_arm_med.enableEvents(true);
    pl.imageActors.panda_right_arm_med.mouseDown = function(mouseEvent) {
        if (pl.bear.activeSide == BearActiveSide.left) {
            if (pl.child.position != BearChildPos.water) {
                pl.bear.activeSide = BearActiveSide.right;
                pl.bear.armPos = BearArmPos.med;
                pl.bear.holdChild();
            }
        } else {
            // If we're already on the right side, we can push the child up one
            // step at a time
            if (pl.bear.armPos == BearArmPos.low && pl.child.position == BearChildPos.low) {
                pl.bear.armPos = BearArmPos.med;
                pl.bear.pushChild();
            } else if (pl.child.position <= BearChildPos.med) {
                pl.bear.armPos = BearArmPos.med;
                pl.bear.holdChild();
            }
        }
    };
    pl.imageActors.panda_right_arm_low.enableEvents(true);
    pl.imageActors.panda_right_arm_low.mouseDown = function(mouseEvent) {
        if (pl.child.position == BearChildPos.water) return;

        pl.bear.activeSide = BearActiveSide.right;
        pl.bear.armPos = BearArmPos.low;
        pl.bear.holdChild();
    };

    //console.log('Created actors.');
};

pl.addActorsToScene = function(actors, scene) {
    $.each(actors, function(index, actor) {
        if (actor.parent) {
            actor.parent.removeChild(actor);
        }
        scene.addChild(actor);
    });
};

/**
 * Creates the intro scene
 * @param director
 */
pl.createIntroScene = function(director) {
    pl.introScene = director.createScene();

    pl.addActorsToScene([pl.handheldActors], pl.introScene);

    var titleText = [
        {text: "Pukul Lalat", start: 0},
        {text: "Fuer mini Familie", start: 10000},
        {text: "Mit Dank fuer au", start: 15000},
        {text: "die guete Erinnerige", start: 20000},
        {text: "", start: 25000},
        {text: "Frohi Wiehnacht :)", start: 30000}];
    $.each(titleText, function(index, title) {
        var titleTextActor = new CAAT.TextActor().
            setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
            setText(title.text).
            calcTextSize(director).
            centerOn(400, 250).
            setAlpha(0.0);
        titleTextActor.addBehavior(new CAAT.AlphaBehavior().
            setFrameTime(title.start, 5500).
            setValues(0.0, 1.0).
            setInterpolator(new CAAT.Interpolator().createExponentialOutInterpolator(3, true))
        );
        pl.introScene.addChild(titleTextActor);
    });

    var introTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("WASD/Arrows => Play").
        calcTextSize(director).
        centerOn(400, 320);
    pl.introScene.addChild(introTextActor);

    // Replace key listener
    pl.introScene.activated = function() {
        //console.log("Intro scene activated");
        $(document).off('keydown');
        $(document).on('keydown', pl.introKeyListener);
    };
    //console.log('Created intro scene.');
};

/**
 * Creates the main scene, with the handheld, bear, moskitos, ...
 * @param director
 */
pl.createMainScene = function(director) {
    pl.mainScene = director.createScene();

    pl.addActorsToScene(
        [pl.handheldActors, pl.hudActors, pl.childActors, pl.moskitoActors, pl.bearActors],
        pl.mainScene
    );

    pl.mainScene.onRenderStart = pl.update;
    pl.mainScene.activated = pl.initNewGame;
    //console.log('Created main scene.');
};

/* Initializes a new game */
pl.initNewGame = function() {
    pl.time = 0;

    pl.activeMoskitos = [];
    pl.moskitoDue = pl.MOSKITO_GRACE_TIME;  // Let the first moskito arrive after a while

    pl.score = 0;
    pl.totalMoskitos = 0;
    pl.nLives = 3;

    pl.bear = new Bear();
    pl.child = new BearChild();

    // Replace key listener
    $(document).off('keydown');
    $(document).on('keydown', pl.mainKeyListener);
};

/**
 * Creates the game over scene
 * @param director
 */
pl.createGameOverScene = function(director) {
    pl.gameOverScene = director.createScene();

    pl.addActorsToScene(
        [pl.handheldActors, pl.hudActors],
        pl.gameOverScene
    );

    var gameOverText1Actor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Game over...").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 - 20);
    pl.gameOverScene.addChild(gameOverText1Actor);
    var gameOverText2Actor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Your name:").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 + 30);
    pl.gameOverScene.addChild(gameOverText2Actor);

    pl.playerNameTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("___").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 + 60);
    pl.gameOverScene.addChild(pl.playerNameTextActor);
    pl.cursorTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("_  ").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 + 65);
    PlUtility.addBlinkBehavior(pl.cursorTextActor);
    pl.gameOverScene.addChild(pl.cursorTextActor);

    // Replace key listener
    pl.gameOverScene.activated = function() {
        //console.log("Game over scene activated");
        $(document).off('keydown');
        $(document).on('keydown', pl.gameOverKeyListener);
    };

    //console.log('Created game over scene.');
};

/**
 * High Score management
 */
pl.getHighScores = function() {
    return Cookies.getJSON('highscores') || pl.DEFAULT_HIGHSCORES;
};

pl.addHighScore = function(name, score) {
    console.assert(/^[A-Z]{3}$/.test(name), "Name should be three letters?");
    console.assert(0 <= score && score <= 99999, "Score should be 0 <= score <= 99999?");
    
    var scores = pl.getHighScores();
    scores.push({name: name, score: score});
    scores.sort(function(a, b) {
        if (a.score > b.score) {
            return -1;
        } else if (a.score == b.score) {
            return 0;
        } else {
            return 1;
        }
    });
    scores.length = 3;
    Cookies.set('highscores', scores);
    return scores;
};


/**
 * Creates the high score scene
 * @param director
 * @param data         the high score data to display
 */
pl.createHighscoreScene = function(director, data) {
    pl.highscoreScene = director.createScene();

    pl.addActorsToScene(
        [pl.handheldActors, pl.hudActors],
        pl.highscoreScene
    );

    var highscoreTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Highscores").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 - 20);
    pl.highscoreScene.addChild(highscoreTextActor);

    $.each(data, function(index, item) {
        var scoreTextActor = new CAAT.TextActor().
            setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
            setText(sprintf("%s  %05d", item.name, item.score)).
            setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 + 30 + 30 * index);
        if (item.name == pl.playerNameTextActor.text && item.score == pl.score) {
            PlUtility.addBlinkBehavior(scoreTextActor);
        }
        pl.highscoreScene.addChild(scoreTextActor);
    });

    // Remove key listener
    pl.highscoreScene.activated = function() {
        //console.log("Game over scene activated");
        $(document).off('keydown');
    };

    //console.log('Created highscore scene.');
};

// Keyboard handling in the intro scene
pl.introKeyListener = function(event) {
    //console.log("Intro key pressed: ", event);

    var keysToStart = [10, 13, 37, 38, 39, 40, 65, 68, 83, 87];
    if (!pl.mainScene && keysToStart.indexOf(event.keyCode) >= 0) {
        //console.log("Creating main scene...");
        pl.createMainScene(pl.director);
        pl.director.switchToNextScene(0, true, false);
    }
};

// Keyboard handling in the main scene
pl.mainKeyListener = function(event) {
    //console.log("Main key pressed: ", event);

    // Prevent scrolling for arrow keys
    if (37 <= event.keyCode && event.keyCode <= 40) {
        event.preventDefault();
    }

    if (event.keyCode == 65 || event.keyCode == 37) {
        // 'A' key
        pl.bear.activeSide = BearActiveSide.left;
    } else if (event.keyCode == 68 || event.keyCode == 39) {
        // 'D' key
        if (pl.child.position != BearChildPos.water) {
            pl.bear.activeSide = BearActiveSide.right;
            pl.bear.holdChild();
        }
    } else if (event.keyCode == 83 || event.keyCode == 40) {
        // 'S' key
        if (pl.bear.armPos < 2) {
            pl.bear.armPos += 1;
        }
    } else if (event.keyCode == 87 || event.keyCode == 38) {
        // 'W' key
        if (pl.bear.armPos > 0) {
            pl.bear.armPos -= 1;
        }
        if (pl.bear.activeSide == BearActiveSide.right) {
            pl.bear.pushChild();
        }
    }
};

// Keyboard handling in the game over scene
pl.gameOverKeyListener = (function() {

    // Some helper functions to manage the player name
    function getLetter() {
        var index = pl.cursorTextActor.text.indexOf('_');
        return pl.playerNameTextActor.text.charAt(index);
    }
    function setLetter(letter) {
        var index = pl.cursorTextActor.text.indexOf('_');
        pl.playerNameTextActor.setText(
            pl.playerNameTextActor.text.substring(0, index) +
            letter +
            pl.playerNameTextActor.text.substring(index + 1)
        );
    }
    function moveCursor(offset) {
        var index = pl.cursorTextActor.text.indexOf('_');
        index = (index + offset) % 3;
        if (index < 0) { index += 3; }
        var chars = [' ', ' ', ' '];
        chars[index] = '_';
        pl.cursorTextActor.setText(chars.join(''));
    }

    return function(event) {
        //console.log("GameOver key pressed: ", event);

        // Prevent scrolling for arrow keys
        if (37 <= event.keyCode && event.keyCode <= 40) {
            event.preventDefault();
        }

        var letter;
        if (event.keyCode >= 65 && event.keyCode <= 90) {
            letter = String.fromCharCode(event.keyCode);
            setLetter(letter);
            moveCursor(1);
        } else if (event.keyCode == 8 ||  event.keyCode == 37) {
            // left arrow or backspace
            moveCursor(-1);
        } else if (event.keyCode == 39) {
            // right arrow
            moveCursor(1);
            if (pl.playerNameTextActor.text.indexOf('_') < 0) {
                // Move right and all filled out... this means we quit,
                // because presumably this is a mobile device and the user has
                // no enter key.
                pl.endGame();
            }
        } else if (event.keyCode == 40) {
            // down arrow
            letter = getLetter();
            if (letter == '_') {
                setLetter('A');
            } else if (letter == 'Z') {
                setLetter('_');
            } else {
                setLetter(String.fromCharCode(letter.charCodeAt(0) + 1));
            }
        } else if (event.keyCode == 38) {
            // up arrow
            letter = getLetter();
            if (letter == '_') {
                setLetter('Z');
            } else if (letter == 'A') {
                setLetter('_');
            } else {
                setLetter(String.fromCharCode(letter.charCodeAt(0) - 1));
            }
        } else if (event.keyCode == 10 || event.keyCode == 13) {
            // Enter key
            if (pl.playerNameTextActor.text.indexOf('_') < 0) {
                pl.endGame();
            }
        }
    };
})();

// Update game state
pl.update = function(sceneTime) {
    //console.log("update: ", sceneTime);
    var i, m, cur;

    pl.time = sceneTime;

    // Add new moskito from time to time
    while(pl.time > pl.moskitoDue) {
        pl.activeMoskitos.push( new Moskito() );
        ++pl.totalMoskitos;

        // Add a new moskito
        pl.moskitoDue += Moskito.spawnInterval();
    }

    // Move moskitos
    var survivingMoskitos = [];
    for (m = 0; m < pl.activeMoskitos.length; ++m) {
        cur = pl.activeMoskitos[m];
        if (cur.update()) {
            // Moskito survived
            survivingMoskitos.push(pl.activeMoskitos[m]);
        }
    }
    pl.activeMoskitos = survivingMoskitos;

    // Update the bear and the child
    pl.bear.update();
    pl.child.update();

    // Draw the heads-up display
    for (i = 1; i <= 3; ++i) {
        if (pl.nLives == i) {
            pl.imageActors['health_bar' + i].setAlpha(0.9);
        } else {
            pl.imageActors['health_bar' + i].setAlpha(0.0);
        }
    }

    // Draw the moskitos
    for (m = 1; m <= 12; ++m) {
        pl.imageActors['moskito' + m].setAlpha(0.1);
    }
    pl.imageActors.moskito4_crash.setAlpha(0.1);
    pl.imageActors.moskito8_crash.setAlpha(0.1);
    pl.imageActors.moskito12_crash.setAlpha(0.1);
    for (m = 0; m < pl.activeMoskitos.length; ++m) {
        cur = pl.activeMoskitos[m];
        pl.imageActors['moskito' + (4*cur.row + cur.col + 1)].setAlpha(0.9);
        if (cur.state == MoskitoState.dying) {
            pl.imageActors['moskito' + (4*cur.row + 4) + '_crash'].setAlpha(0.9);
        }
    }

    // Draw the bear
    pl.imageActors.panda_bear.setAlpha(0.9);
    for (i in BearFaceState) {
        if (pl.bear.faceState == BearFaceState[i]) {
            pl.imageActors['panda_' + i].setAlpha(0.9);
        } else {
            pl.imageActors['panda_' + i].setAlpha(0.1);
        }
    }
    $.each(['left', 'right'], function(i, direction) {
        $.each(['high', 'med', 'low'], function(j, height) {
            if (pl.bear.activeSide == BearActiveSide[direction] &&
                pl.bear.armPos == BearArmPos[height]) {
                pl.imageActors['panda_' + direction + '_arm_' + height].setAlpha(0.9);
            } else {
                pl.imageActors['panda_' + direction + '_arm_' + height].setAlpha(0.1);
            }
        });
    });
    pl.imageActors.panda_look_center.setAlpha(
        (pl.bear.faceState == BearFaceState.ouch) ? 0.9 : 0.1
    );
    if (pl.bear.faceState == BearFaceState.ouch) {
        pl.imageActors.panda_look_center.setAlpha(0.9);
        pl.imageActors.panda_look_left.setAlpha(0.1);
        pl.imageActors.panda_look_right.setAlpha(0.1);
    } else {
        pl.imageActors.panda_look_center.setAlpha(0.1);
        if (pl.bear.activeSide == BearActiveSide.left) {
            pl.imageActors.panda_look_left.setAlpha(0.9);
            pl.imageActors.panda_look_right.setAlpha(0.1);
        } else {
            pl.imageActors.panda_look_left.setAlpha(0.1);
            pl.imageActors.panda_look_right.setAlpha(0.9);
        }
    }

    // Draw the child
    for (i = 1; i <= 4; ++i) {
        pl.imageActors['panda_child' + i].setAlpha(0.1);
    }
    if (pl.child.active) {
        if (pl.child.position != BearChildPos.low) {
            pl.imageActors['panda_child' + pl.child.position].setAlpha(0.9);
        } else {
            // Blink three times shortly before falling
            var fraction = (pl.time - pl.child.lastMove) / (pl.child.moveDue - pl.child.lastMove);
            if ((fraction <= 6.0/12) ||
                (7.0/12 < fraction && fraction <= 8.0/12) ||
                (9.0/12 < fraction && fraction <= 10.0/12) ||
                (11.0/12 < fraction)) {
                pl.imageActors['panda_child' + pl.child.position].setAlpha(0.9);
            }
        }
    }

    // Update page elements
    pl.scoreActor.setText(
        sprintf("%05d", pl.score)
    );
};

pl.loseLife = function() {
    --pl.nLives;
    if (pl.nLives <= 0) {
        pl.createGameOverScene(pl.director);
        pl.director.switchToNextScene(2000, true, false);
        return;
    }

    //console.log("Losing a live...");
    var shake = new CAAT.ScaleBehavior().
        setFrameTime(pl.time, 500).
        setValues(1.0, 1.1, 1.0, 1.1).
        setInterpolator(
            new CAAT.Interpolator().createElasticInInterpolator(1.0, 0.2, true)
        ).
        addListener({behaviorExpired: function() {
            pl.bear.faceState = BearFaceState.happy;
        }});
    //console.log("Created shake behavior: ", shake);
    pl.bearActors.addBehavior(shake);
    pl.bear.faceState = BearFaceState.ouch;

    // Remove existing moskitos
    pl.activeMoskitos = [];
    pl.moskitoDue = pl.time + pl.MOSKITO_GRACE_TIME;
};

pl.endGame = function() {
    var scores = pl.addHighScore(pl.playerNameTextActor.text, pl.score);
    pl.createHighscoreScene(pl.director, scores);
    pl.director.switchToNextScene(2000, true, false);
};


// ***************************************************************************
// The bear
/* const */ BearActiveSide = {
    left: 0,
    right: 1,
};
/* Object.freeze(BearActiveSide); */
/* const */ BearFaceState = {
    happy: 0,
    hmm: 1,
    ouch: 2,
};
/* Object.freeze(BearFaceState); */
/* const */ BearArmPos = {
    high: 0,
    med: 1,
    low: 2,
};
/* Object.freeze(BearArmPos); */

Bear = function() {
    this.faceState = BearFaceState.happy;
    this.activeSide = BearActiveSide.left;
    this.armPos = BearArmPos.med;
    //console.log("Created a bear:", this);
};

Bear.prototype = {
    // Updates the state of this bear, depending on the moskitos
    update: function() {
        var that = this;

        if (that.faceState != BearFaceState.ouch) {
            that.faceState = BearFaceState.happy;
            $.each(pl.activeMoskitos, function(i, m) {
                if (m.state == MoskitoState.biting) {
                    that.faceState = BearFaceState.hmm;
                }
            });
            if (pl.child.position == BearChildPos.low &&
                    (pl.time - pl.child.lastMove) / (pl.child.moveDue - pl.child.lastMove) > 0.5 &&
                    that.activeSide != BearActiveSide.right) {
                that.faceState = BearFaceState.hmm;    
            }
        }

        if (that.activeSide == BearActiveSide.right &&
                that.armPos == pl.child.position - 1) {
            pl.child.hold();
        }
    },

    // This holds the child when the bear changes the active side to right
    holdChild: function() {
        if (this.armPos < pl.child.position - 1) {
            this.armPos = pl.child.position - 1;
        }
        if (this.armPos == pl.child.position - 1) {
            pl.child.hold();
        }
    },

    // Pushes the child up one step
    pushChild: function() {
        if (this.armPos < pl.child.position - 1) {
            pl.child.push();
        }
    },

};


// ***************************************************************************
// The bear child
/* const */ BearChildPos = {
    high: 1,
    med: 2,
    low: 3,
    water: 4,
};
/* Object.freeze(BearChildPos); */

BearChild = function() {
    this.position = BearChildPos.high;
    this.active = false;
    this.lastMove = 0;
    this.moveDue = 0;
    this.nBaths = 0;
    //console.log("Created a bear child:", this);
};

BearChild.prototype = {
    // Computes the time to the next move, based on the current difficulty
    moveInterval: function() {
        // At the beginning of the game, this is pl.CHILD_MOVE_INTERVAL
        // Each pl.CHILD_MOVE_INCREASES, it gets divided by one more
        return (pl.CHILD_MOVE_INTERVAL + PlUtility.normRandom() * pl.CHILD_MOVE_STDEV) /
            (pl.time + pl.CHILD_MOVE_INCREASES) * pl.CHILD_MOVE_INCREASES;
    },

    // Computes the time that the bear child spends in the water
    waterTime: function() {
        // This is pl.CHILD_WATER_TIME in the beginning, and gets a bit smaller
        // on each bath.
        return (pl.CHILD_WATER_TIME * pl.CHILD_WATER_NOM) / (this.nBaths + pl.CHILD_WATER_NOM);
    },

    // Update the state of the bear child...
    update: function() {
        if (!this.active && pl.time >= pl.CHILD_APPEAR_TIME) {
            this.active = true;
            this.lastMove = pl.time;
            this.moveDue = pl.time + this.moveInterval();
            //console.log("Activated the bear child: ", this);
        }

        if (this.active) {
            while (pl.time > this.moveDue) {
                ++this.position;
                this.lastMove = this.moveDue;
                if (this.position > BearChildPos.water) {
                    this.position = BearChildPos.high;
                    this.moveDue += this.moveInterval();
                } else if (this.position == BearChildPos.water) {
                    pl.loseLife();
                    this.moveDue += this.waterTime();
                } else {
                    this.moveDue += this.moveInterval();
                }
                //console.log("Moved the bear child: ", this);
            }
        }
    },

    // Called by the bear when it holds the child
    hold: function() {
        this.lastMove = pl.time;
        this.moveDue = pl.time + this.moveInterval();
        //console.log("Child is being held: ", this);
    },

    // Called by the bear when it pushes the child up
    push: function() {
        --this.position;
        ++pl.score;
        this.lastMove = pl.time;
        this.moveDue = pl.time + this.moveInterval();
        //console.log("Child is being pushed: ", this);
    },
};

// ***************************************************************************
// Moskitos
/* const */ MoskitoState = {
    flying: 0,
    biting: 1,
    dying: 2,
    dead: 3,
};
/* Object.freeze(MoskitoState); */

Moskito = function() {
    this.row = Math.random()*3 >> 0;
    this.col = 0;
    this.moveDue = pl.time + this.moveInterval();
    this.state = MoskitoState.flying;
    //console.log("Created a moskito:", this);
};

Moskito.prototype = {
    // Computes the time to the next move, based on the current difficulty
    moveInterval: function() {
        // At the beginning of the game, this is pl.MOSKITO_MOVE_INTERVAL
        // Each pl.MOSKITO_MOVE_INCREASES, it gets divided by one more
        return (pl.MOSKITO_MOVE_INTERVAL + PlUtility.normRandom() * pl.MOSKITO_MOVE_STDEV) /
            (pl.time + pl.MOSKITO_MOVE_INCREASES) * pl.MOSKITO_MOVE_INCREASES;
    },

    // Updates the position of this moskito
    // Returns true if the moskito is still alive
    update: function() {
        while (pl.time > this.moveDue) {
            this.moveDue += this.moveInterval();
            this.col += 1;
            if (this.col == 3) {
                this.state = MoskitoState.biting;
            } else if (this.col >= 4) {
                if (this.state == MoskitoState.biting) {
                    pl.loseLife();
                }
                this.state = MoskitoState.dead;
                return false;
            }
        }

        // Is the moskito hit?
        if (this.col == 3 && pl.bear.armPos == this.row && pl.bear.activeSide == BearActiveSide.left) {
            // Hit, moskito dies
            if (this.state != MoskitoState.dying) {
                this.state = MoskitoState.dying;
                ++pl.score;
            }
        }

        return true;
    },
};

// Computes the time to the next spawn, based on the current difficulty
Moskito.spawnInterval = function() {
    // At the beginning of the game, this is pl.MOSKITO_SPAWN_INTERVAL
    // Each pl.MOSKITO_SPAWN_INCREASES, it gets divided by one more
    return (pl.MOSKITO_SPAWN_INTERVAL + PlUtility.normRandom() * pl.MOSKITO_SPAWN_STDEV) /
        (pl.time + pl.MOSKITO_SPAWN_INCREASES) * pl.MOSKITO_SPAWN_INCREASES;
};



// ***************************************************************************
// CAAT initialization code
$(document).ready(function() {
    /**
     * create a director.
     */
    pl.director = new CAAT.Director().initialize(
        pl.WIDTH,
        pl.HEIGHT
    );
    //console.log("Initialized Director: ", pl.director);
    $('#the_canvas')[0].appendChild(pl.director.canvas);

    // Resize to full screen size (for mobile devices that have zooming disabled)
    if (window.innerWidth < pl.WIDTH || window.innerHeight < pl.HEIGHT) {
        var factorX = window.innerWidth / pl.WIDTH;
        var factorY = window.innerHeight / pl.HEIGHT;
        var factor = ((factorX < factorY) ? factorX : factorY);
        pl.director.setScaleAnchored(factor, factor, 0, 0);
    }

    pl.director.loop(60);
    pl.createLoadingScene(pl.director);

    new CAAT.ImagePreloader().loadImages(
        [
        {id:'pukullalat_handheld',  url:'/pukullalat/assets/images/pukullalat_handheld.png'},
        {id:'panda_bear',           url:'/pukullalat/assets/images/panda_bear.png'},
        {id:'panda_happy',          url:'/pukullalat/assets/images/panda_happy.png'},
        {id:'panda_hmm',            url:'/pukullalat/assets/images/panda_hmm.png'},
        {id:'panda_left_arm_high',  url:'/pukullalat/assets/images/panda_left_arm_high.png'},
        {id:'panda_left_arm_med',   url:'/pukullalat/assets/images/panda_left_arm_med.png'},
        {id:'panda_left_arm_low',   url:'/pukullalat/assets/images/panda_left_arm_low.png'},
        {id:'panda_right_arm_low',  url:'/pukullalat/assets/images/panda_right_arm_low.png'},
        {id:'panda_right_arm_med',  url:'/pukullalat/assets/images/panda_right_arm_med.png'},
        {id:'panda_right_arm_high', url:'/pukullalat/assets/images/panda_right_arm_high.png'},
        {id:'panda_look_center',    url:'/pukullalat/assets/images/panda_look_center.png'},
        {id:'panda_look_left',      url:'/pukullalat/assets/images/panda_look_left.png'},
        {id:'panda_look_right',     url:'/pukullalat/assets/images/panda_look_right.png'},
        {id:'panda_ouch',           url:'/pukullalat/assets/images/panda_ouch.png'},
        {id:'panda_child1',         url:'/pukullalat/assets/images/panda_child1.png'},
        {id:'panda_child2',         url:'/pukullalat/assets/images/panda_child2.png'},
        {id:'panda_child3',         url:'/pukullalat/assets/images/panda_child3.png'},
        {id:'panda_child4',         url:'/pukullalat/assets/images/panda_child4.png'},
        {id:'moskito1',             url:'/pukullalat/assets/images/moskito1.png'},
        {id:'moskito2',             url:'/pukullalat/assets/images/moskito2.png'},
        {id:'moskito3',             url:'/pukullalat/assets/images/moskito3.png'},
        {id:'moskito4',             url:'/pukullalat/assets/images/moskito4.png'},
        {id:'moskito4_crash',       url:'/pukullalat/assets/images/moskito4_crash.png'},
        {id:'moskito5',             url:'/pukullalat/assets/images/moskito5.png'},
        {id:'moskito6',             url:'/pukullalat/assets/images/moskito6.png'},
        {id:'moskito7',             url:'/pukullalat/assets/images/moskito7.png'},
        {id:'moskito8',             url:'/pukullalat/assets/images/moskito8.png'},
        {id:'moskito8_crash',       url:'/pukullalat/assets/images/moskito8_crash.png'},
        {id:'moskito9',             url:'/pukullalat/assets/images/moskito9.png'},
        {id:'moskito10',            url:'/pukullalat/assets/images/moskito10.png'},
        {id:'moskito11',            url:'/pukullalat/assets/images/moskito11.png'},
        {id:'moskito12',            url:'/pukullalat/assets/images/moskito12.png'},
        {id:'moskito12_crash',      url:'/pukullalat/assets/images/moskito12_crash.png'},
        {id:'health_bar1',          url:'/pukullalat/assets/images/health_bar1.png'},
        {id:'health_bar2',          url:'/pukullalat/assets/images/health_bar2.png'},
        {id:'health_bar3',          url:'/pukullalat/assets/images/health_bar3.png'},
        ],
        function(counter, images) {
            //console.log("loaded images: ", counter, images);
            pl.director.setImagesCache(images);
            pl.loadingActors.progressbarActor.setSize(10 + 178 * counter / 36.0, 18);
            if (counter == 36) {
                pl.createActors();
                pl.createIntroScene(pl.director);
                //console.log("Intro scene created.");
                pl.director.switchToNextScene(2000, true, false);
            }
        }
    );
});
