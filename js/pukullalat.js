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

CAAT.modules.initialization= CAAT.modules.initialization || {};

CAAT.modules.initialization.init= function( width, height, runHere, imagesURL, onEndLoading )   {

    /**
     * infere whether runhere is on a DIV, canvas, or none at all.
     * If none at all, just append the created canvas to the document.
     */
    var isCanvas= false;
    var canvascontainer= document.getElementById(runHere);

    if ( canvascontainer ) {
        if ( canvascontainer instanceof HTMLDivElement ) {
            isCanvas= false;
        } else if ( canvascontainer instanceof HTMLCanvasElement ) {
            isCanvas= true;
        } else {
            canvascontainer= document.body;
        }
    } else {
        canvascontainer= document.createElement('div');
        document.body.appendChild(canvascontainer);
    }
    
    /**
     * create a director.
     */
    var director = new CAAT.Director().
            initialize(
                width||800,
                height||600,
                isCanvas?canvascontainer:undefined)
            ;

    if ( !isCanvas ) {
        canvascontainer.appendChild( director.canvas );
    }

    /**
     * Load splash images. It is supossed the splash has some images.
     */
    new CAAT.ImagePreloader().loadImages(
        imagesURL,
        function on_load( counter, images ) {

            if ( counter==images.length ) {

                director.emptyScenes();
                director.setImagesCache(images);

                onEndLoading(director);

                /**
                 * Change this sentence's parameters to play with different entering-scene
                 * curtains.
                 * just perform a director.setScene(0) to play first director's scene.
                 */
                director.easeIn(
                        0,
                        CAAT.Scene.prototype.EASE_SCALE,
                        2000,
                        false,
                        CAAT.Actor.prototype.ANCHOR_CENTER,
                        new CAAT.Interpolator().createElasticOutInterpolator(2.5, .4) );

                CAAT.loop(60);

            }
        }
    );
};


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


// Global Pukul Lalat object, keeping track of all our vars
var pl = {};

(function() {

    /**
     * This function will be called to let you define new scenes that will be
     * shown after the splash screen.
     * @param director
     */
    function createScenes(director) {
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

        pl.totalTime = 0;

        pl.leftArms[0].setAlpha(0.9);
        pl.activeLeftArm = 0;

        pl.activeMoskitos = new Array();
        pl.moskitoDue = 3000;  // Let the first moskito arrive after 3 seconds

        director.onRenderStart = function(directorTime) {
            //console.log("onRenderStart: ", directorTime, pl.totalTime);
            pl.totalTime += directorTime;

            // Add new moskito from time to time
            while(pl.totalTime > pl.moskitoDue) {
                pl.activeMoskitos.push( {row: Math.random()*3 >> 0, col:0, moved: pl.totalTime} );
                console.log("Added a moskito:", pl.activeMoskitos[pl.activeMoskitos.length - 1]);

                // Add a new fly after 3000 +- 700 milliseconds
                pl.moskitoDue += 3000 + PlUtility.normRandom() * 700;
            }

            // Reset all moskito positions
            for (var m = 0; m < 12; ++m) {
                pl.moskitos[m].setAlpha(0.1);
            }

            // Move moskitos
            // FIXME: make this slightly poisson as well? Just a bit random...?
            move_moskitos_loop: for (var m = 0; m < pl.activeMoskitos.length; ++m) {
                var cur = pl.activeMoskitos[m];

                while (pl.totalTime - cur.moved > 700) {
                    cur.moved += 700;
                    cur.col += 1;
                    if (cur.col >= 4) {
                        // For the moment, we just remove the moskito
                        pl.activeMoskitos[m] = pl.activeMoskitos[pl.activeMoskitos.length - 1];
                        pl.activeMoskitos.pop();
                        --m;
                        continue move_moskitos_loop;
                    }
                }
            }

            // Draw the active moskitos
            for (var m = 0; m < pl.activeMoskitos.length; ++m) {
                var cur = pl.activeMoskitos[m];
                pl.moskitos[4*cur.row + cur.col].setAlpha(0.9);
            }
        }
    };

    /**
     * Start it all up when the document is ready.
     * Change for your favorite frameworks initialization code.
     */
    window.addEventListener(
            'load',
            function() {
                CAAT.modules.initialization.init(
                    /* canvas will be 640x480 pixels */
                        640, 480,

                    /* and will be added to our canvas div. set an id of a canvas or div element */
                        'the_canvas',

                    /*
                     load these images and set them up for non splash scenes.
                     image elements must be of the form:
                     {id:'<unique string id>',    url:'<url to image>'}

                     No images can be set too.
                     */
                        [
                        ],

                     /*
                        onEndSplash callback function.
                        Create your scenes on this method.
                      */
                     createScenes

                        );

                CAAT.registerKeyListener(function(key, action, modifiers, originalKeyEvent) {
                    //alert("Key pressed: " + key + "\naction = " + action);
                    if (action != 'down') return;

                    if (key == 65) {
                        // 'A' key
                    } else if (key == 68) {
                        // 'D' key
                    } else if (key == 83) {
                        // 'S' key
                        if (pl.activeLeftArm < 2) {
                            pl.leftArms[pl.activeLeftArm].setAlpha(0.1);
                            pl.activeLeftArm += 1;
                            pl.leftArms[pl.activeLeftArm].setAlpha(0.9);
                        }
                    } else if (key == 87) {
                        // 'W' key
                        if (pl.activeLeftArm > 0) {
                            pl.leftArms[pl.activeLeftArm].setAlpha(0.1);
                            pl.activeLeftArm -= 1;
                            pl.leftArms[pl.activeLeftArm].setAlpha(0.9);
                        }
                    }
                });
            },
            false);
})();
