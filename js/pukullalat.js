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
};


// ***************************************************************************
// Global Pukul Lalat object, keeping track of all our vars
var pl = {
    WIDTH:  800,
    HEIGHT: 482,

    MOSKITO_SPAWN_INTERVAL: 3000,    // Moskitos spawn every 3 seconds
    MOSKITO_SPAWN_STDEV: 700,        // Standard deviation of moskito spawn time
    MOSKITO_SPAWN_INCREASES: 90000,  // Difficulty increases by 1 every 90 secs
    MOSKITO_MOVE_INTERVAL: 700,      // Moskitos move every 700 seconds
    MOSKITO_MOVE_STDEV: 100,         // Standard deviation of moskito move time
    MOSKITO_MOVE_INCREASES: 200000,  // Difficulty increases by 1 every 200 seconds
};

/**
 * Creates a loading screen, that will be shown before the images are loaded.
 */
pl.createLoadingScene = function(director) {
    //TODO
}

/**
 * Creates the main scene, with the handheld, bear, moskitos, ...
 * @param director
 */
pl.createMainScene = function(director) {
    pl.mainScene = director.createScene();

    // Helper function to create image actors
    function createImageActor(id) {
        return new CAAT.Actor().
            setBackgroundImage(
                new CAAT.SpriteImage().
                    initialize(director.getImage(id), 1, 1 ).
                    getRef(), true
            ).
            enableEvents(false);
    }

    // Load image actors
    pl.mainActors = {};
    var images = [
        {id: 'pukullalat_handheld', x: 0, y: 0},
        {id: 'panda_bear', x: 320, y: 200},
        {id: 'panda_happy', x: 320, y: 200},
        {id: 'panda_hmm', x: 320, y: 200},
        {id: 'panda_left_arm_high', x: 320, y: 200},
        {id: 'panda_left_arm_med', x: 320, y: 200},
        {id: 'panda_left_arm_low', x: 320, y: 200},
        {id: 'panda_right_arm_low', x: 320, y: 195},
        {id: 'panda_right_arm_med', x: 320, y: 190},
        {id: 'panda_right_arm_high', x: 320, y: 180},
        {id: 'panda_look_center', x: 320, y: 200},
        {id: 'panda_look_left', x: 320, y: 200},
        {id: 'panda_look_right', x: 320, y: 200},
        {id: 'panda_ouch', x: 320, y: 200},
        {id: 'panda_child1', x: 500, y: 150},
        {id: 'panda_child2', x: 500, y: 190},
        {id: 'panda_child3', x: 500, y: 230},
        {id: 'panda_child4', x: 500, y: 300},
    ];
    $(images).each(function(index, image) {
        var actor = createImageActor(image.id).
            setLocation(image.x, image.y);
        pl.mainScene.addChild(actor);
        pl.mainActors[image.id] = actor;
    });

    pl.moskitos = Array();
    for (var row = 0; row < 3; ++row) {
        for (var col = 0; col < 4; ++col) {
            pl.moskitos[4*row + col] = new CAAT.ShapeActor().
                    setShape(CAAT.ShapeActor.prototype.SHAPE_CIRCLE).
                    setBounds(220+col*30, 230+row*40, 20, 20).
                    setFillStyle('#000').
                    setAlpha(0.1);
            pl.mainScene.addChild(pl.moskitos[4*row + col]);
        }
    }
    pl.bear = new Bear();
    console.log('Created actors.');

    pl.time = 0;

    pl.activeMoskitos = new Array();
    pl.moskitoDue = 3000;  // Let the first moskito arrive after 3 seconds

    pl.score = 0;
    pl.totalMoskitos = 0;
    pl.nLives = 3;

    pl.mainScene.onRenderStart = pl.update;
    console.log('Created main scene.');
};

// Keyboard handling
pl.keyListener = function(key, action, modifiers, originalKeyEvent) {
    //console.log("Key pressed: ", key, "action: ", action);
    if (action != 'down') return;

    if (key == 65) {
        // 'A' key
        pl.bear.activeSide = BearActiveSide.left;
    } else if (key == 68) {
        // 'D' key
        pl.bear.activeSide = BearActiveSide.right;
        // TODO: change height if child is too low.
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
    move_moskitos_loop: for (var m = 0; m < pl.activeMoskitos.length; ++m) {
        var cur = pl.activeMoskitos[m];
        if (!cur.update()) {
                // remove the moskito
                pl.activeMoskitos[m] = pl.activeMoskitos[pl.activeMoskitos.length - 1];
                pl.activeMoskitos.pop();
                --m;
                continue move_moskitos_loop;
        }
    }

    // Update the bear
    pl.bear.update();

    // Draw the moskitos
    for (var m = 0; m < 12; ++m) {
        pl.moskitos[m].setAlpha(0.1);
    }
    for (var m = 0; m < pl.activeMoskitos.length; ++m) {
        var cur = pl.activeMoskitos[m];
        pl.moskitos[4*cur.row + cur.col].setAlpha(0.9);
    }

    // Draw the bear
    pl.mainActors['panda_bear'].setAlpha(0.9);
    for (var i in BearFaceState) {
        if (pl.bear.faceState == BearFaceState[i]) {
            pl.mainActors['panda_' + i].setAlpha(0.9);
        } else {
            pl.mainActors['panda_' + i].setAlpha(0.1);
        }
    }
    $.each(['left', 'right'], function(i, direction) {
        $.each(['high', 'med', 'low'], function(j, height) {
            if (pl.bear.activeSide == BearActiveSide[direction] &&
                pl.bear.armPos == BearArmPos[height]) {
                pl.mainActors['panda_' + direction + '_arm_' + height].setAlpha(0.9);
            } else {
                pl.mainActors['panda_' + direction + '_arm_' + height].setAlpha(0.1);
            }
        });
    });
    pl.mainActors['panda_look_center'].setAlpha(
        (pl.bear.faceState == BearFaceState.ouch) ? 0.9 : 0.1
    );
    if (pl.bear.faceState == BearFaceState.ouch) {
        pl.mainActors['panda_look_center'].setAlpha(0.9);
        pl.mainActors['panda_look_left'].setAlpha(0.1);
        pl.mainActors['panda_look_right'].setAlpha(0.1);
    } else {
        pl.mainActors['panda_look_center'].setAlpha(0.1);
        if (pl.bear.activeSide == BearActiveSide.left) {
            pl.mainActors['panda_look_left'].setAlpha(0.9);
            pl.mainActors['panda_look_right'].setAlpha(0.1);
        } else {
            pl.mainActors['panda_look_left'].setAlpha(0.1);
            pl.mainActors['panda_look_right'].setAlpha(0.9);
        }
    }

    // Update page elements
    $('#display_total_moskitos').html(pl.totalMoskitos);
    $('#display_score').html(pl.score);
    $('#display_n_lives').html(pl.nLives);
}


// ***************************************************************************
// The bear
const BearActiveSide = {
    left: 0,
    right: 1,
};
Object.freeze(BearActiveSide);
const BearFaceState = {
    happy: 0,
    hmm: 1,
    ouch: 2,
};
Object.freeze(BearFaceState);
const BearArmPos = {
    high: 0,
    med: 1,
    low: 2,
};
Object.freeze(BearArmPos);

Bear = function() {
    this.faceState = BearFaceState.happy;
    this.activeSide = BearActiveSide.left;
    this.armPos = BearArmPos.med;
    console.log("Created a bear:", this);
}

Bear.prototype = {
    // Updates the state of this bear, depending on the moskitos
    // TODO: update depending on child position, too
    update: function() {
        var that = this;
        that.faceState = BearFaceState.happy;
        $.each(pl.activeMoskitos, function(i, m) {
            if (m.col == 2 && (that.armPos != m.row || that.activeSide != BearActiveSide.left)) {
                //console.log("Setting state to hmm: ", that, m);
                that.faceState = BearFaceState.hmm;
            } else if (m.state == MoskitoState.biting) {
                //console.log("Setting state to ouch: ", that, m);
                that.faceState = BearFaceState.ouch;
            }
        });
    }
};

// ***************************************************************************
// Moskitos
const MoskitoState = {
    flying: 0,
    biting: 1,
    dying: 2,
    dead: 3,
};
Object.freeze(MoskitoState);

Moskito = function() {
    this.row = Math.random()*3 >> 0;
    this.col = 0;
    this.moveDue = pl.time + this.moveInterval();
    this.state = MoskitoState.flying;
    console.log("Created a moskito:", this);
}

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
                // Is the moskito hit, or does it byte?
                if (pl.bear.armPos == this.row && pl.bear.activeSide == BearActiveSide.left) {
                    // Hit, moskito dies
                    this.state = MoskitoState.dying;
                    ++pl.score;
                } else {
                    // Moskito bytes
                    this.state = MoskitoState.biting;
                    --pl.nLives;
                }
            } else if (this.col >= 4) {
                this.state = MoskitoState.dead;
                return false;
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
    var director = new CAAT.Director().initialize(
        pl.WIDTH,
        pl.HEIGHT
    );
    console.log("Initialized Director: ", director);
    $('#the_canvas')[0].appendChild(director.canvas);
    director.loop(60);
    pl.createLoadingScene(director);

    CAAT.registerKeyListener(pl.keyListener);

    new CAAT.ImagePreloader().loadImages(
        [
        {id:'pukullalat_handheld',  url:'../data/pukullalat_handheld.png'},
        {id:'panda_bear',           url:'../data/panda_bear.png'},
        {id:'panda_happy',          url:'../data/panda_happy.png'},
        {id:'panda_hmm',            url:'../data/panda_hmm.png'},
        {id:'panda_left_arm_high',  url:'../data/panda_left_arm_high.png'},
        {id:'panda_left_arm_med',   url:'../data/panda_left_arm_med.png'},
        {id:'panda_left_arm_low',   url:'../data/panda_left_arm_low.png'},
        {id:'panda_right_arm_low',  url:'../data/panda_right_arm_low.png'},
        {id:'panda_right_arm_med',  url:'../data/panda_right_arm_med.png'},
        {id:'panda_right_arm_high', url:'../data/panda_right_arm_high.png'},
        {id:'panda_look_center',    url:'../data/panda_look_center.png'},
        {id:'panda_look_left',      url:'../data/panda_look_left.png'},
        {id:'panda_look_right',     url:'../data/panda_look_right.png'},
        {id:'panda_ouch',           url:'../data/panda_ouch.png'},
        {id:'panda_child1',         url:'../data/panda_child1.png'},
        {id:'panda_child2',         url:'../data/panda_child2.png'},
        {id:'panda_child3',         url:'../data/panda_child3.png'},
        {id:'panda_child4',         url:'../data/panda_child4.png'},
        ],
        function(counter, images) {
            console.log("loaded images: ", counter, images);
            director.setImagesCache(images);
            if (counter == 18) {
                pl.createMainScene(director);
            }
        }
    );
});
