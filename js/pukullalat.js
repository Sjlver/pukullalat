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
            do {
                var x = Math.random() * 2.0 - 1.0;
                var y = Math.random() * 2.0 - 1.0;
                var s = x*x + y*y;
            } while (s >= 1.0);
            if (s == 0) return 0;
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
        }
        var blinkOff = function() {
            actor.setVisible(false);
            actor.blinkBehaviorTimeout = setTimeout(blinkOn, period);
        }
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
    CHILD_WATER_NOM: 3,              // child water time is decreased by 1/3 after first bath
    CHILD_APPEAR_TIME: 25000,        // child first appears after 25 seconds
};

/**
 * Creates a loading screen, that will be shown before the images are loaded.
 */
pl.createLoadingScene = function(director) {
    pl.loadingScene = director.createScene();
    pl.loadingActors = {};
    pl.loadingActors.borderActor = new CAAT.Actor().
        setLocation((pl.WIDTH - 200) / 2.0, (pl.HEIGHT - 30) / 2.0).
        setSize(200, 30).
        setFillStyle('#fff').
        setStrokeStyle('#000').
        enableEvents(false);
    pl.loadingScene.addChild(pl.loadingActors.borderActor);
    pl.loadingActors.progressbarActor = new CAAT.Actor().
        setLocation((pl.WIDTH - 200) / 2.0 + 6, (pl.HEIGHT - 30) / 2.0 + 6).
        setSize(10, 18).
        setFillStyle('#000').
        enableEvents(false);
    pl.loadingScene.addChild(pl.loadingActors.progressbarActor);
    pl.loadingTextActor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Loading...").
        setLocation(pl.WIDTH / 2.0 - 75, pl.HEIGHT / 2.0 - 60);
    pl.loadingScene.addChild(pl.loadingTextActor);
    console.log("Loading scene created.");
};

/* Creates all the image actors; they are used in several scenes. */
pl.createActors = function() {
    // Load image actors
    pl.imageActors = {};
    pl.handheldActors = new CAAT.ActorContainer();
    pl.hudActors = new CAAT.ActorContainer().
        enableEvents(false);
    pl.bearActors = new CAAT.ActorContainer().
        setBounds(320, 200, 220, 154).
        enableEvents(false);
    pl.childActors = new CAAT.ActorContainer().
        enableEvents(false);
    pl.moskitoActors = new CAAT.ActorContainer().
        setBounds(220, 230, 160, 160).
        enableEvents(false);

    var images = [
        {id: 'pukullalat_handheld', x: 0, y: 0, container: pl.handheldActors},
        {id: 'panda_bear', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_happy', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_hmm', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_left_arm_high', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_left_arm_med', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_left_arm_low', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_right_arm_low', x: 0, y: -5, container: pl.bearActors},
        {id: 'panda_right_arm_med', x: 0, y: -10, container: pl.bearActors},
        {id: 'panda_right_arm_high', x: 0, y: -20, container: pl.bearActors},
        {id: 'panda_look_center', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_look_left', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_look_right', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_ouch', x: 0, y: 0, container: pl.bearActors},
        {id: 'panda_child1', x: 500, y: 150, container: pl.childActors},
        {id: 'panda_child2', x: 500, y: 190, container: pl.childActors},
        {id: 'panda_child3', x: 500, y: 230, container: pl.childActors},
        {id: 'panda_child4', x: 500, y: 300, container: pl.childActors},
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
        {id: 'health_bar1', x: 225, y: 135, container: pl.hudActors},
        {id: 'health_bar2', x: 225, y: 135, container: pl.hudActors},
        {id: 'health_bar3', x: 225, y: 135, container: pl.hudActors},
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
        setLocation(410, 145);
    pl.hudActors.addChild(pl.scoreActor);

    console.log('Created actors.');

};

/**
 * Creates the main scene, with the handheld, bear, moskitos, ...
 * @param director
 */
pl.createMainScene = function(director) {
    pl.mainScene = director.createScene();

    pl.mainScene.addChild(pl.handheldActors);
    pl.mainScene.addChild(pl.hudActors);
    pl.mainScene.addChild(pl.bearActors);
    pl.mainScene.addChild(pl.childActors);
    pl.mainScene.addChild(pl.moskitoActors);

    pl.mainScene.onRenderStart = pl.update;
    pl.mainScene.activated = pl.initNewGame;
    console.log('Created main scene.');
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
};

/**
 * Creates the game over scene
 * @param director
 */
pl.createGameOverScene = function(director) {
    pl.gameOverScene = director.createScene();

    pl.mainScene.removeChild(pl.handheldActors);
    pl.gameOverScene.addChild(pl.handheldActors);
    pl.mainScene.removeChild(pl.hudActors);
    pl.gameOverScene.addChild(pl.hudActors);

    pl.gameOverText1Actor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Game over...").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 - 20);
    pl.gameOverScene.addChild(pl.gameOverText1Actor);
    pl.gameOverText2Actor = new CAAT.TextActor().
        setFont('20px "DigitaldreamFatSkewRegular", "Comic Sans MS", cursive').
        setText("Your name:").
        setLocation(pl.WIDTH / 2.0 - 80, pl.HEIGHT / 2.0 + 30);
    pl.gameOverScene.addChild(pl.gameOverText2Actor);
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

    console.log('Created game over scene.');
};

// Keyboard handling in the main scene
pl.mainKeyListener = function(key, action, modifiers, originalKeyEvent) {
    if (!pl.mainScene || pl.mainScene.expired) return;

    //console.log("Key pressed: ", key, "action: ", action);
    if (action != 'down') return;

    if (key == 65) {
        // 'A' key
        pl.bear.activeSide = BearActiveSide.left;
    } else if (key == 68) {
        // 'D' key
        if (pl.child.position != BearChildPos.water) {
            pl.bear.activeSide = BearActiveSide.right;
            pl.bear.holdChild();
        }
    } else if (key == 83) {
        // 'S' key
        if (pl.bear.armPos < 2) {
            pl.bear.armPos += 1;
        }
    } else if (key == 87) {
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
pl.gameOverKeyListener = function(key, action, modifiers, originalKeyEvent) {
    if (!pl.gameOverScene || pl.gameOverScene.expired) return;

    //console.log("Key pressed: ", key, "action: ", action);
    if (action != 'down') return;

    if (key >= 65 && key <= 90) {
        var letter = String.fromCharCode(key);
        var index = pl.cursorTextActor.text.indexOf('_');
        pl.playerNameTextActor.setText(
            pl.playerNameTextActor.text.substring(0, index) +
            letter +
            pl.playerNameTextActor.text.substring(index + 1)
        );
        if (pl.cursorTextActor.text == '  _') {
            pl.cursorTextActor.setText('_  ');
        } else {
            pl.cursorTextActor.setText(
                ' ' + pl.cursorTextActor.text.substring(0, 2)
            );
        }
    } else if (key == 10 || key == 13) {
        alert ("Congrats, " + pl.playerNameTextActor.text + ", you scored " + pl.score);
        location.reload();
    }
};

// Update game state
pl.update = function(sceneTime) {
    //console.log("update: ", sceneTime);
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
    for (var m = 0; m < pl.activeMoskitos.length; ++m) {
        var cur = pl.activeMoskitos[m];
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
    for (var i = 1; i <= 3; ++i) {
        if (pl.nLives == i) {
            pl.imageActors['health_bar' + i].setAlpha(0.9);
        } else {
            pl.imageActors['health_bar' + i].setAlpha(0.0);
        }
    }

    // Draw the moskitos
    for (var m = 1; m <= 12; ++m) {
        pl.imageActors['moskito' + m].setAlpha(0.1);
    }
    pl.imageActors['moskito4_crash'].setAlpha(0.1);
    pl.imageActors['moskito8_crash'].setAlpha(0.1);
    pl.imageActors['moskito12_crash'].setAlpha(0.1);
    for (var m = 0; m < pl.activeMoskitos.length; ++m) {
        var cur = pl.activeMoskitos[m];
        pl.imageActors['moskito' + (4*cur.row + cur.col + 1)].setAlpha(0.9);
        if (cur.state == MoskitoState.dying) {
            pl.imageActors['moskito' + (4*cur.row + 4) + '_crash'].setAlpha(0.9);
        }
    }

    // Draw the bear
    pl.imageActors['panda_bear'].setAlpha(0.9);
    for (var i in BearFaceState) {
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
    pl.imageActors['panda_look_center'].setAlpha(
        (pl.bear.faceState == BearFaceState.ouch) ? 0.9 : 0.1
    );
    if (pl.bear.faceState == BearFaceState.ouch) {
        pl.imageActors['panda_look_center'].setAlpha(0.9);
        pl.imageActors['panda_look_left'].setAlpha(0.1);
        pl.imageActors['panda_look_right'].setAlpha(0.1);
    } else {
        pl.imageActors['panda_look_center'].setAlpha(0.1);
        if (pl.bear.activeSide == BearActiveSide.left) {
            pl.imageActors['panda_look_left'].setAlpha(0.9);
            pl.imageActors['panda_look_right'].setAlpha(0.1);
        } else {
            pl.imageActors['panda_look_left'].setAlpha(0.1);
            pl.imageActors['panda_look_right'].setAlpha(0.9);
        }
    }

    // Draw the child
    for (var i = 1; i <= 4; ++i) {
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
}

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
    pl.director.loop(60);
    pl.createLoadingScene(pl.director);

    CAAT.registerKeyListener(pl.mainKeyListener);
    CAAT.registerKeyListener(pl.gameOverKeyListener);

    new CAAT.ImagePreloader().loadImages(
        [
        {id:'pukullalat_handheld',  url:'data/pukullalat_handheld.png'},
        {id:'panda_bear',           url:'data/panda_bear.png'},
        {id:'panda_happy',          url:'data/panda_happy.png'},
        {id:'panda_hmm',            url:'data/panda_hmm.png'},
        {id:'panda_left_arm_high',  url:'data/panda_left_arm_high.png'},
        {id:'panda_left_arm_med',   url:'data/panda_left_arm_med.png'},
        {id:'panda_left_arm_low',   url:'data/panda_left_arm_low.png'},
        {id:'panda_right_arm_low',  url:'data/panda_right_arm_low.png'},
        {id:'panda_right_arm_med',  url:'data/panda_right_arm_med.png'},
        {id:'panda_right_arm_high', url:'data/panda_right_arm_high.png'},
        {id:'panda_look_center',    url:'data/panda_look_center.png'},
        {id:'panda_look_left',      url:'data/panda_look_left.png'},
        {id:'panda_look_right',     url:'data/panda_look_right.png'},
        {id:'panda_ouch',           url:'data/panda_ouch.png'},
        {id:'panda_child1',         url:'data/panda_child1.png'},
        {id:'panda_child2',         url:'data/panda_child2.png'},
        {id:'panda_child3',         url:'data/panda_child3.png'},
        {id:'panda_child4',         url:'data/panda_child4.png'},
        {id:'moskito1',             url:'data/moskito1.png'},
        {id:'moskito2',             url:'data/moskito2.png'},
        {id:'moskito3',             url:'data/moskito3.png'},
        {id:'moskito4',             url:'data/moskito4.png'},
        {id:'moskito4_crash',       url:'data/moskito4_crash.png'},
        {id:'moskito5',             url:'data/moskito5.png'},
        {id:'moskito6',             url:'data/moskito6.png'},
        {id:'moskito7',             url:'data/moskito7.png'},
        {id:'moskito8',             url:'data/moskito8.png'},
        {id:'moskito8_crash',       url:'data/moskito8_crash.png'},
        {id:'moskito9',             url:'data/moskito9.png'},
        {id:'moskito10',            url:'data/moskito10.png'},
        {id:'moskito11',            url:'data/moskito11.png'},
        {id:'moskito12',            url:'data/moskito12.png'},
        {id:'moskito12_crash',      url:'data/moskito12_crash.png'},
        {id:'health_bar1',          url:'data/health_bar1.png'},
        {id:'health_bar2',          url:'data/health_bar2.png'},
        {id:'health_bar3',          url:'data/health_bar3.png'},
        ],
        function(counter, images) {
            //console.log("loaded images: ", counter, images);
            pl.director.setImagesCache(images);
            pl.loadingActors.progressbarActor.setSize(10 + 178 * counter / 36.0, 18);
            if (counter == 36) {
                //setTimeout(function() {
                    pl.createActors();
                    pl.createMainScene(pl.director);
                    console.log("Main scene created.");
                    pl.director.switchToNextScene(2000, true, false);
                    //pl.createGameOverScene(pl.director);
                    //pl.director.switchToNextScene(2000, true, false);
                //}, 3000);
            }
        }
    );
});
