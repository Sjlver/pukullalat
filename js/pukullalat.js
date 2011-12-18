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
    WIDTH:  320,
    HEIGHT: 240,

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
    var scene = director.createScene();

    pl.moskitos = Array();
    for (var row = 0; row < 3; ++row) {
        for (var col = 0; col < 4; ++col) {
            pl.moskitos[4*row + col] = new CAAT.ShapeActor().
                    setShape(CAAT.ShapeActor.prototype.SHAPE_CIRCLE).
                    setBounds(10+col*50, 10+row*70, 30, 30).
                    setFillStyle('#000').
                    setAlpha(0.1);
            scene.addChild(pl.moskitos[4*row + col]);
        }
    }
    pl.leftArms = Array();
    for (var row = 0; row < 3; ++row) {
        pl.leftArms[row] = new CAAT.ShapeActor().
                setShape(CAAT.ShapeActor.prototype.SHAPE_RECTANGLE).
                setBounds(180, 5+row*70, 10, 40).
                setFillStyle('#050').
                setAlpha(0.1);
        scene.addChild(pl.leftArms[row]);
    }
    console.log('Created actors.');

    pl.totalTime = 0;

    pl.leftArms[0].setAlpha(0.9);
    pl.leftArmPosition = 0;

    pl.activeMoskitos = new Array();
    pl.moskitoDue = 3000;  // Let the first moskito arrive after 3 seconds

    pl.score = 0;
    pl.totalMoskitos = 0;
    pl.nLives = 3;

    scene.onRenderStart = pl.update;
    console.log('Created main scene.');
};

// Keyboard handling
pl.keyListener = function(key, action, modifiers, originalKeyEvent) {
    //console.log("Key pressed: ", key, "action: ", action);
    if (action != 'down') return;

    if (key == 65) {
        // 'A' key
    } else if (key == 68) {
        // 'D' key
    } else if (key == 83) {
        // 'S' key
        if (pl.leftArmPosition < 2) {
            pl.leftArms[pl.leftArmPosition].setAlpha(0.1);
            pl.leftArmPosition += 1;
            pl.leftArms[pl.leftArmPosition].setAlpha(0.9);
        }
    } else if (key == 87) {
        // 'W' key
        if (pl.leftArmPosition > 0) {
            pl.leftArms[pl.leftArmPosition].setAlpha(0.1);
            pl.leftArmPosition -= 1;
            pl.leftArms[pl.leftArmPosition].setAlpha(0.9);
        }
    }
};

// Update game state
pl.update = function(sceneTime) {
    //console.log("update: ", sceneTime);
    pl.totalTime = sceneTime;

    // Add new moskito from time to time
    while(pl.totalTime > pl.moskitoDue) {
        pl.activeMoskitos.push( new Moskito() );
        ++pl.totalMoskitos;

        // Add a new moskito after 3000 +- 700 milliseconds
        pl.moskitoDue += 3000 + PlUtility.normRandom() * 700;
    }

    // Reset all moskito positions
    for (var m = 0; m < 12; ++m) {
        pl.moskitos[m].setAlpha(0.1);
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

    // Draw the active moskitos
    for (var m = 0; m < pl.activeMoskitos.length; ++m) {
        var cur = pl.activeMoskitos[m];
        pl.moskitos[4*cur.row + cur.col].setAlpha(0.9);
    }

    // Update page elements
    $('#display_total_moskitos').html(pl.totalMoskitos);
    $('#display_score').html(pl.score);
    $('#display_n_lives').html(pl.nLives);
}


// ***************************************************************************
// Moskitos
const MoskitoState = {
    ST_FLYING: 0,
    ST_BITING: 1,
    ST_DYING: 2,
    ST_DEAD: 3,
};
Object.freeze(MoskitoState);

Moskito = function() {
    this.row = Math.random()*3 >> 0;
    this.col = 0;
    this.moved = pl.totalTime;
    this.state = MoskitoState.ST_FLYING;
    console.log("Created a moskito:", this);
}

Moskito.prototype = {
    // Updates the position of this moskito
    // Returns true if the moskito is still alive
    update: function() {
        // FIXME: make this slightly poisson as well? Just a bit random...?
        while (pl.totalTime - this.moved > 700) {
            this.moved += 700;
            this.col += 1;
            if (this.col == 3) {
                // Is the moskito hit, or does it byte?
                if (pl.leftArmPosition == this.row) {
                    // Hit, moskito dies
                    this.state = MoskitoState.ST_DYING;
                    ++pl.score;
                } else {
                    // Moskito bytes
                    this.state = MoskitoState.ST_BITING;
                    --pl.nLives;
                }
            } else if (this.col >= 4) {
                this.state = MoskitoState.ST_DEAD;
                return false;
            }
        }
        return true;
    },
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
        ],
        function(counter, images) {
            console.log("loaded images: ", counter, images);
            director.setImagesCache(images);
            if (counter == 14) {
                pl.createMainScene(director);
            }
        }
    );
});
