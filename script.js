// canvas initialization
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ensure canvas size
function resizeCanvas() {
    // get css dimensions
    const computedStyle = getComputedStyle(canvas);
    const cssWidth = parseFloat(computedStyle.width);
    const cssHeight = parseFloat(computedStyle.height);
  
    // update canvas dimensions
    canvas.width = cssWidth;
    canvas.height = cssHeight;
}

resizeCanvas();

// sound effects preparation
const BASE_SFX_PATH = 'sfx';
const sfx_name = ['wing', 'swooshing', 'point', 'hit', 'die'];

const sfx = {};

function preloadSFX(callback) {
    let loadedSFX = 0;
    const totalSFX = sfx_name.length;

    sfx_name.forEach(item => {
        // create sound object
        const audio = new Audio(`${BASE_SFX_PATH}/${item}.mp3`);

        // sound object playability verification
        audio.oncanplaythrough = () => {
            // assign the sound object under sfx object
            sfx[item] = audio;

            loadedSFX++;
            if (loadedSFX === totalSFX) {
                callback();
            }
        };
        audio.onerror = () => {
            console.error(`Failed to load SFX: ${BASE_SFX_PATH}/${item}.mp3`);
        };
    });
}

// images preparation
const BASE_IMG_PATH = 'img';
const img_name = ['logo', 'ready', 'over', 'tap', 'start', 'land', 'board', 'new',
                  ['bg', 2], ['pipe', 2], ['glitter', 3], ['bird0', 3], ['bird1', 3],
                  ['bird2', 3], ['medal', 4], ['small_num', 10], ['large_num', 10]];

const imgs = {};

function preloadImages(callback) {
    let loadedImages = 0;
    let totalImages = img_name.reduce((sum, item) => {
        if (Array.isArray(item)) {
            return sum + item[1];
        }
        return sum + 1;
    }, 0);

    img_name.forEach(item => {
        if (Array.isArray(item)) {
            // item is an array that contains image name and number
            const [key, count] = item;
            imgs[key] = [];
            for (let i = 0; i < count; i++) {
                const src = `${BASE_IMG_PATH}/${key}${i}.png`;
                loadSingleImage(src, key, callback, i);
            }
        } else {
            const src = `${BASE_IMG_PATH}/${item}.png`;
            loadSingleImage(src, item, callback);
        }
    });

    function loadSingleImage(src, key, callback, index = null) {
        // create image object
        const img = new Image();
        img.src = src;

        // image object displayability verification
        img.onload = () => {
            // assign the image object under imgs object
            if (index !== null) {
                imgs[key][index] = img;
            } else {
                imgs[key] = img;
            }

            loadedImages++;
            if (loadedImages === totalImages) callback();
        };
        img.onerror = () => console.error(`Failed to load image: ${src}`);
    }
}

// draw character
function locateObject(obj, offset_x_percent = 0, offset_y_percent = 0) {
    const obj_width = canvas.width * obj.width / 288;
    const obj_height = (obj.height / obj.width) * obj_width;
    const obj_x = (canvas.width - obj_width) / 2 - canvas.width * offset_x_percent;
    const obj_y = (canvas.height - obj_height) / 2 - canvas.height * offset_y_percent;
    return {obj_x, obj_y, obj_width, obj_height};
}

function drawObject(obj, offset_x_percent = 0, offset_y_percent = 0) {
    const {obj_x, obj_y, obj_width, obj_height} = locateObject(obj, offset_x_percent,
                                                               offset_y_percent);
    ctx.drawImage(obj, obj_x, obj_y, obj_width, obj_height);
}

// check if overlap
function isOverlap(rect0, rect1, rotationDegree0 = 0, rotationDegree1 = 0) {
    // Function to get the corners of a rotated rectangle
    function getRotatedCorners(x, y, width, height, degree) {
        const cx = x + width / 2; // Center X
        const cy = y + height / 2; // Center Y
        const rad = degree * (Math.PI / 180); // Convert degree to radians

        // Define corners relative to the center
        const corners = [
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
            { x: width / 2, y: height / 2 },
            { x: -width / 2, y: height / 2 }
        ];

        // Rotate and translate corners
        return corners.map(corner => ({
            x: cx + corner.x * Math.cos(rad) - corner.y * Math.sin(rad),
            y: cy + corner.x * Math.sin(rad) + corner.y * Math.cos(rad)
        }));
    }

    // Function to project a rectangle's corners onto an axis
    function projectOntoAxis(corners, axis) {
        return corners.map(corner => corner.x * axis.x + corner.y * axis.y);
    }

    // Check if there is a gap between projections
    function hasGap(projection1, projection2) {
        const min1 = Math.min(...projection1);
        const max1 = Math.max(...projection1);
        const min2 = Math.min(...projection2);
        const max2 = Math.max(...projection2);
        return max1 < min2 || max2 < min1;
    }

    // Get corners for both rectangles
    const corners0 = getRotatedCorners(rect0.obj_x, rect0.obj_y, rect0.obj_width, rect0.obj_height, rotationDegree0);
    const corners1 = getRotatedCorners(rect1.obj_x, rect1.obj_y, rect1.obj_width, rect1.obj_height, rotationDegree1);

    // Get edges (axes for projection) from corners
    const axes0 = corners0.map((corner, i) => {
        const nextCorner = corners0[(i + 1) % corners0.length];
        return { x: -(nextCorner.y - corner.y), y: nextCorner.x - corner.x };
    });
    const axes1 = corners1.map((corner, i) => {
        const nextCorner = corners1[(i + 1) % corners1.length];
        return { x: -(nextCorner.y - corner.y), y: nextCorner.x - corner.x };
    });

    // Check all axes for gaps
    const axes = [...axes0, ...axes1];
    for (const axis of axes) {
        const projection0 = projectOntoAxis(corners0, axis);
        const projection1 = projectOntoAxis(corners1, axis);
        if (hasGap(projection0, projection1)) {
            return false; // A gap means no collision
        }
    }

    return true; // No gaps found, so there is a collision
}

// set random background and random bird costume when stage changed
function randomCostume() {
    game_info.bg = Math.floor(Math.random() * 2);
    game_info.bird.costume = Math.floor(Math.random() * 3);
}

// demo bird animation
function demoBird(base_y = 0, range = 0.012, step = 0.00056) {
    if (game_info.bird.demo_direction_up) {
        game_info.bird.y += step * game_info.delta_time * 60;
        if (game_info.bird.y > base_y + range / 2) {
            game_info.bird.demo_direction_up = false;
            game_info.bird.y -= step * game_info.delta_time * 60;
        }
    } else {
        game_info.bird.y -= step * game_info.delta_time * 60;
        if (game_info.bird.y < base_y - range / 2) {
            game_info.bird.demo_direction_up = true;
            game_info.bird.y += step * game_info.delta_time * 60;
        }
    }
    game_info.bird.next_wing();
    drawObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
               game_info.bird.x, game_info.bird.y);
}

// draw score in gaming stage
function drawLargeScore() {
    const score = game_info.score.toString().split(''); 
    const digits_width_offset = [6, 5, 5, 4, 5, 5, 4, 4, 5, 5];
    const digits_width
    = score.map(item => locateObject(imgs.large_num[parseInt(item, 10)]).obj_width
                                     - digits_width_offset[parseInt(item, 10)]);

    const total_width = digits_width.reduce((sum, width) => sum + width, 0);
    let current_x = (canvas.width - total_width) / 2;

    score.forEach((digit, index) => {
        const digit_obj = imgs.large_num[parseInt(digit, 10)];
        const {obj_width, obj_height} = locateObject(digit_obj);

        ctx.drawImage(digit_obj, current_x, canvas.height * 0.115, obj_width,
                      obj_height);

        current_x += digits_width[index];
    });
}

function drawSmallScore(score = 0, y = 0) {
    const score_array = score.toString().split(''); 
    let position_x = -0.292;
    score_array.reverse().forEach((item, index, array) => {
        if (item === '1') position_x -= 0.006 + (index === 0? 0: 0.002);

        drawObject(imgs.small_num[parseInt(item, 10)], position_x, y);

        position_x += 0.058;
        if (index < array.length - 1 && item === '1') {
            if (array[index + 1] === '1') {
                position_x -= 0.006;
            } else {
                position_x -= 0.008;
            }
        }
    });
}

// draw start page
function initPage(tran = 0) {
    // draw background
    drawObject(imgs.bg[game_info.bg]);

    // draw logo
    drawObject(imgs.logo, 0, 0.2);

    // draw demo bird
    demoBird();

    // draw start button
    drawObject(imgs.start, 0, -0.23 - 0.007 * tran);

    // draw land
    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// draw get ready page
function getReadyPage() {
    // draw background
    drawObject(imgs.bg[game_info.bg]);

    // draw score
    drawObject(imgs.large_num[0], -0.008, 0.35);

    // draw instructions
    drawObject(imgs.ready, 0, 0.15);
    drawObject(imgs.tap, 0, -0.075);

    // draw demo bird
    demoBird(-0.05);

    // draw land
    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// draw gaming page
function gamingPage(tran = 0, tran_frame = 0, tran_frame_interval = 30) {
    // draw background
    drawObject(imgs.bg[game_info.bg]);
    
    // transition
    if (tran === 1) {
        ctx.globalAlpha = 1 - tran_frame / tran_frame_interval;
        drawObject(imgs.ready, 0, 0.15);
        drawObject(imgs.tap, 0, -0.075);
        ctx.globalAlpha = 1;
    }

    // draw pipe
    game_info.pipe.move();
    drawObject(imgs.pipe[0], game_info.pipe.x0, game_info.pipe.y0 + game_info.pipe.gap);
    drawObject(imgs.pipe[1], game_info.pipe.x0, game_info.pipe.y0);
    drawObject(imgs.pipe[0], game_info.pipe.x1, game_info.pipe.y1 + game_info.pipe.gap);
    drawObject(imgs.pipe[1], game_info.pipe.x1, game_info.pipe.y1);

    // draw score
    drawLargeScore();

    // draw bird
    game_info.bird.fall();
    game_info.bird.move();

    if (game_info.bird.velocity > 0.008) {
        if (game_info.bird.degree < Math.PI / 2) game_info.bird.degree += 0.1;
        game_info.bird.wing = 1;
    } else {
        game_info.bird.next_wing();
        game_info.bird.degree += (-Math.PI / 10 - game_info.bird.degree) * 0.2;
    }

    ctx.save();
    const {obj_x, obj_y, obj_width, obj_height}
    = locateObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
                   game_info.bird.x, game_info.bird.y);
    ctx.translate(obj_x + obj_width / 2, obj_y + obj_height / 2);
    ctx.rotate(game_info.bird.degree);
    ctx.drawImage(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
                  -obj_width / 2, -obj_height / 2, obj_width, obj_height);
    ctx.restore();

    // draw land
    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);

    // check if bird collide with pipe
    const bird_rect = locateObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
                                   game_info.bird.x, game_info.bird.y);
    const pipe0_upper_rect = locateObject(imgs.pipe[0], game_info.pipe.x0, game_info.pipe.y0 + game_info.pipe.gap);
    const pipe0_lower_rect = locateObject(imgs.pipe[1], game_info.pipe.x0, game_info.pipe.y0);
    const pipe1_upper_rect = locateObject(imgs.pipe[0], game_info.pipe.x1, game_info.pipe.y1 + game_info.pipe.gap);
    const pipe1_lower_rect = locateObject(imgs.pipe[1], game_info.pipe.x1, game_info.pipe.y1);

    if (isOverlap(bird_rect, pipe0_upper_rect, game_info.bird.degree * (180 / Math.PI))
        || isOverlap(bird_rect, pipe0_lower_rect, game_info.bird.degree * (180 / Math.PI))
        || isOverlap(bird_rect, pipe1_upper_rect, game_info.bird.degree * (180 / Math.PI))
        || isOverlap(bird_rect, pipe1_lower_rect, game_info.bird.degree * (180 / Math.PI))) {
        gamingOver();
    }
}

function gamingOver() {
    game_info.pause_loop = true;
    game_info.stage = 'game_over';

    sfx.hit.currentTime = 0;
    sfx.hit.play();

    let frame = 0;
    let frame_interval = 10;

    function whiteFlashFadeOut() {
        if (frame <= frame_interval) {
            gameOverPage(1, frame, frame_interval);
            frame += game_info.delta_time * 60;
            requestAnimationFrame(whiteFlashFadeOut);
        } else {
            game_info.bird.wing = 1;

            function birdFall() {
                if (game_info.bird.y > -0.26 || game_info.bird.degree < Math.PI / 2) {
                    gameOverPage(2);
                    requestAnimationFrame(birdFall);
                } else {
                    sfx.swooshing.currentTime = 0;
                    sfx.swooshing.play();

                    frame = 0;
                    frame_interval = 20;

                    function gameOverFadeIn() {
                        if (frame <= frame_interval) {
                            gameOverPage(3, frame, frame_interval);
                            frame += game_info.delta_time * 60;
                            requestAnimationFrame(gameOverFadeIn);
                        } else {
                            setTimeout(() => {
                                sfx.swooshing.currentTime = 0;
                                sfx.swooshing.play();

                                frame = 0;
                                frame_interval = 40;

                                function scoreBoardFlyIn() {
                                    if (frame <= frame_interval) {
                                        gameOverPage(4, frame, frame_interval);
                                        frame += game_info.delta_time * 60;
                                        requestAnimationFrame(scoreBoardFlyIn);
                                    } else {
                                        frame = 0;
                                        frame_interval = 20;

                                        function scoreAnimation() {
                                            if (frame <= frame_interval) {
                                                gameOverPage(5, frame, frame_interval);
                                                frame += game_info.delta_time * 60;
                                                requestAnimationFrame(scoreAnimation);
                                            } else {
                                                if (game_info.score > game_info.best_score) {
                                                    game_info.break_record = true;
                                                    game_info.best_score = game_info.score;
                                                    localStorage.setItem('best_score', game_info.best_score);
                                                }
                                                game_info.pause_loop = false;
                                                gameLoop();
                                            }
                                        }
                                        scoreAnimation();
                                    }
                                }
                                scoreBoardFlyIn();
                            }, 500);
                        }
                    }
                    gameOverFadeIn();
                }
            }

            if (game_info.bird.y > -0.26) {
                sfx.die.currentTime = 0;
                sfx.die.play();
            }

            birdFall();
        }
    }
    whiteFlashFadeOut();
}

// draw game over page
function gameOverPage(tran = 0, tran_frame = 0, tran_frame_interval = 30) {
    // draw background
    drawObject(imgs.bg[game_info.bg]);

    // draw pipe
    drawObject(imgs.pipe[0], game_info.pipe.x0, game_info.pipe.y0 + game_info.pipe.gap);
    drawObject(imgs.pipe[1], game_info.pipe.x0, game_info.pipe.y0);
    drawObject(imgs.pipe[0], game_info.pipe.x1, game_info.pipe.y1 + game_info.pipe.gap);
    drawObject(imgs.pipe[1], game_info.pipe.x1, game_info.pipe.y1);

    // ensure bird is facing down while on the ground
    if (tran === 1) {
        // draw score
        drawLargeScore();

        if (game_info.bird.y === -0.26 && game_info.bird.degree < Math.PI / 2) {
            if (game_info.bird.degree < Math.PI / 2) {
                game_info.bird.degree += 0.1;
            } else {
                game_info.bird.degree = Math.PI / 2;
            }
        }
    }

    // bird falling onto the ground
    if (tran === 2) {
        // draw score
        drawLargeScore();

        game_info.bird.fall();
        game_info.bird.move();

        if (game_info.bird.degree < Math.PI / 2) {
            game_info.bird.degree += 0.1;
        } else {
            game_info.bird.degree = Math.PI / 2;
        }
    }

    // draw bird
    ctx.save();
    const {obj_x, obj_y, obj_width, obj_height}
    = locateObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
                   game_info.bird.x, game_info.bird.y);
    ctx.translate(obj_x + obj_width / 2, obj_y + obj_height / 2);
    ctx.rotate(game_info.bird.degree);
    ctx.drawImage(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
                  -obj_width / 2, -obj_height / 2, obj_width, obj_height);
    ctx.restore();

    // draw game over
    if (tran === 0 || tran === 4 || tran === 5 || tran === 6) drawObject(imgs.over, 0, 0.2);
    if (tran === 3) {
        const half_frame_ratio = tran_frame / (tran_frame_interval / 2);
        const is_HFR_over_1 = half_frame_ratio > 1;
        ctx.globalAlpha = is_HFR_over_1? 1: half_frame_ratio;
        drawObject(imgs.over, 0, 0.2 + 0.02 * (is_HFR_over_1? 2 - half_frame_ratio:
                                              half_frame_ratio));
        ctx.globalAlpha = 1;
    }

    // draw start button
    if (tran === 0) drawObject(imgs.start, 0, -0.23);
    if (tran === 6) drawObject(imgs.start, 0, -0.237);

    // draw land
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);

    // draw score board
    if (tran === 0 || tran === 5 || tran === 6) drawObject(imgs.board);
    if (tran === 4) {
        const progress = Math.min(tran_frame / tran_frame_interval, 1);
        drawObject(imgs.board, 0, -Math.pow(1 - progress, 3));
    }

    // draw medal
    if ((tran === 0 || tran === 6) && game_info.score >= 10) {
        const level = game_info.score < 20? 0:
                      game_info.score < 30? 1:
                      game_info.score < 40? 2: 3;
        drawObject(imgs.medal[level], 0.226, -0.01);

        // draw glitter
        drawObject(imgs.glitter[game_info.glitter.costume], game_info.glitter.x, game_info.glitter.y);

        game_info.glitter.next_glitter();

        if (game_info.glitter.costume < 0 && !(game_info.glitter.is_costume_increasing)) {
            game_info.glitter.x = 0.13 + Math.random() * 0.19;
            game_info.glitter.y = 0.044 - Math.random() * 0.105;
            game_info.glitter.costume = 0;
            game_info.glitter.is_costume_increasing = true;
        }
    }

    // draw score
    if (tran === 4) {
        const progress = Math.min(tran_frame / tran_frame_interval, 1);
        drawSmallScore(0, -Math.pow(1 - progress, 3) + 0.03);
        drawSmallScore(game_info.best_score, -Math.pow(1 - progress, 3) - 0.052);
    }
    if (tran === 5) {
        drawSmallScore(Math.floor(game_info.score * tran_frame / tran_frame_interval), 0.03);
        drawSmallScore(game_info.best_score, -0.052);
    }
    if (tran === 0 || tran === 6) {
        drawSmallScore(game_info.score, 0.03);
        if (game_info.break_record) drawObject(imgs.new, -0.134, -0.012);
        drawSmallScore(game_info.best_score, -0.052);
    }

    // draw white flash
    if (tran === 1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - tran_frame / tran_frame_interval})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// game loop
function gameLoop(timestamp) {
    // ensure 60 FPS
    if (!game_info.last_timestamp) game_info.last_timestamp = timestamp;
    game_info.delta_time = (timestamp - game_info.last_timestamp) / 1000 || 1 / 60;
    game_info.last_timestamp = timestamp;

    // clear last frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (game_info.stage) {
        case 'init':
            initPage();
            break;
        case 'get_ready':
            getReadyPage();
            break;
        case 'gaming':
            gamingPage();
            break;
        case 'game_over':
            gameOverPage();
            break;
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }

    if (!game_info.pause_loop) requestAnimationFrame(gameLoop);
}

// game info initialization
let game_info = {
    // refresh rate properties
    last_timestamp: 0,
    delta_time: 0,

    // basic properties
    pause_loop: false,
    stage: 'init',
    score: 0,
    best_score: 0,
    break_record: false,
    bg: 0,
    bird: {
        // physic properties
        x: 0,
        y: 0,
        degree: 0,
        velocity: 0,
        max_velocity: 0.02,
        acceleration: 0.0006,
        fly() {
            this.velocity = -0.0108 * game_info.delta_time * 60;

            sfx.wing.currentTime = 0;
            sfx.wing.play();
        },
        fall() {
            this.velocity += this.acceleration * game_info.delta_time * 60;

            if (this.velocity > this.max_velocity) {
                this.velocity = this.max_velocity;
            }
        },
        move() {
            this.y -= this.velocity;

            if (this.y < -0.26) {
                this.y = -0.26;
                if (game_info.stage === 'gaming') {
                    gamingOver();
                }
            } else if (this.y > 0.52) {
                this.y = 0.52;
            }
        },

        // appearance
        costume: 0,
        wing: 0,
        backward_wing: false,
        frame: 0,
        frame_interval: 7,
        next_wing() {
            if (this.frame >= this.frame_interval) {
                if (this.backward_wing) {
                    this.wing--;
                    if (this.wing <= 0) {
                        this.backward_wing = false;
                    }
                } else {
                    this.wing++;
                    if (this.wing >= 2) {
                        this.backward_wing = true;
                    }
                }
                this.frame = 0;
            }
            this.frame += game_info.delta_time * 60;
        },

        // demo bird property
        demo_direction_up: true
    },
    pipe: {
        x0: -1.59,
        x1: -2.19,
        y0: 0,
        y1: 0,
        score0: 1,
        score1: 1,
        gap: 0.82,
        move() {
            this.x0 += 0.007 * game_info.delta_time * 60;
            this.x1 += 0.007 * game_info.delta_time * 60;
            if (this.x0 >= 0.59) {
                this.x0 = -0.59;
                this.y0 = -0.51 + Math.random() * (this.gap - 0.51);
                this.score0 = 1;
            }
            if (this.x1 >= 0.59) {
                this.x1 = -0.59;
                this.y1 = -0.51 + Math.random() * (this.gap - 0.51);
                this.score1 = 1;
            }

            if (this.x0 > 0.19 && this.score0 > 0) {
                game_info.score += this.score0;
                this.score0 = 0;
                sfx.point.currentTime = 0;
                sfx.point.play();
            }
            if (this.x1 > 0.19 && this.score1 > 0) {
                game_info.score += this.score1;
                this.score1 = 0;
                sfx.point.currentTime = 0;
                sfx.point.play();
            }
        }
    },
    land: {
        x0: 0,
        x1: -1.083,
        move() {
            this.x0 += 0.007 * game_info.delta_time * 60;
            this.x1 += 0.007 * game_info.delta_time * 60;
            if (this.x0 >= 1.083) this.x0 = -1.083;
            if (this.x1 >= 1.083) this.x1 = -1.083;
        }
    },
    glitter: {
        x: 0,
        y: 0,
        costume: 0,
        is_costume_increasing: false,
        frame: 0,
        frame_interval: 5,
        next_glitter() {
            if (this.frame >= this.frame_interval) {
                if (this.is_costume_increasing) {
                    this.costume++;
                    if (this.costume >= 2) {
                        this.is_costume_increasing = false;
                    }
                } else {
                    this.costume--;
                }
                this.frame = 0;
            }
            this.frame += game_info.delta_time * 60;
        }
    }
};

// detect interactive event
function initPageInteraction(event) {
    const rect = canvas.getBoundingClientRect();
    const scale_x = canvas.width / rect.width;
    const scale_y = canvas.height / rect.height;

    const mouse_x = (event.clientX - rect.left) * scale_x;
    const mouse_y = (event.clientY - rect.top) * scale_y;

    if (game_info.stage === 'init') {
        const start_width = canvas.width * imgs.start.width / 288;
        const start_height = (imgs.start.height / imgs.start.width) * start_width;
        const start_x = (canvas.width - start_width) / 2;
        const start_y = (canvas.height - start_height) / 2 + canvas.height * 0.23;

        if (!game_info.pause_loop
            && (start_x <= mouse_x && mouse_x <= start_x + start_width)
            && (start_y <= mouse_y && mouse_y <= start_y + start_height)) {
            game_info.pause_loop = true;
            game_info.stage = 'get_ready';

            sfx.swooshing.currentTime = 0;
            sfx.swooshing.play();

            let frame = 0;
            const frame_interval = 20;

            function pageFadeOut() {
                if (frame <= frame_interval) {
                    initPage(1);
                    ctx.fillStyle = `rgba(0, 0, 0, ${frame / frame_interval})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    frame += game_info.delta_time * 60;
                    requestAnimationFrame(pageFadeOut);
                } else {
                    randomCostume();
                    game_info.bird.x = 0.19;
                    game_info.bird.y = -0.05;

                    function pageFadeIn() {
                        if (frame <= frame_interval * 2) {
                            getReadyPage();
                            ctx.fillStyle = `rgba(0, 0, 0, ${2 - frame / frame_interval})`;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            frame += game_info.delta_time * 60;
                            requestAnimationFrame(pageFadeIn);
                        } else {
                            canvas.removeEventListener('mousedown', initPageInteraction);
                            canvas.addEventListener('pointerdown', otherInteraction);
                            game_info.pause_loop = false;
                            gameLoop();
                        }
                    }
                    pageFadeIn();
                }
            }
            pageFadeOut();
        }
    } else {
        console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }
}

function otherInteraction(event) {
    const rect = canvas.getBoundingClientRect();
    const scale_x = canvas.width / rect.width;
    const scale_y = canvas.height / rect.height;

    const mouse_x = (event.clientX - rect.left) * scale_x;
    const mouse_y = (event.clientY - rect.top) * scale_y;

    switch (game_info.stage) {
        case 'get_ready':
            if (!game_info.pause_loop) {
                game_info.pause_loop = true;
                game_info.stage = 'gaming';

                game_info.bird.frame_interval = 3;
                game_info.pipe.y0 = -0.51 + Math.random() * 0.31;
                game_info.pipe.y1 = -0.51 + Math.random() * 0.31;
                game_info.bird.fly();

                let frame = 0;
                const frame_interval = 30;

                function elementFadeOut() {
                    if (frame <= frame_interval) {
                        gamingPage(1, frame, frame_interval);
                        frame += game_info.delta_time * 60;
                        requestAnimationFrame(elementFadeOut);
                    } else {
                        game_info.pause_loop = false;
                        gameLoop();
                    }
                }
                elementFadeOut();
            }
            break;
        case 'gaming':
            game_info.bird.fly();
            break;
        case 'game_over':
            const start_width = canvas.width * imgs.start.width / 288;
            const start_height = (imgs.start.height / imgs.start.width) * start_width;
            const start_x = (canvas.width - start_width) / 2;
            const start_y = (canvas.height - start_height) / 2 + canvas.height * 0.23;

            if (!game_info.pause_loop
                && (start_x <= mouse_x && mouse_x <= start_x + start_width)
                && (start_y <= mouse_y && mouse_y <= start_y + start_height)) {
                game_info.pause_loop = true;

                sfx.swooshing.currentTime = 0;
                sfx.swooshing.play();

                let frame = 0;
                const frame_interval = 20;

                function pageFadeOut() {
                    if (frame <= frame_interval) {
                        gameOverPage(6);
                        ctx.fillStyle = `rgba(0, 0, 0, ${frame / frame_interval})`;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        frame += game_info.delta_time * 60;
                        requestAnimationFrame(pageFadeOut);
                    } else {
                        randomCostume();
                        game_info.score = 0;
                        game_info.break_record = false;
                        game_info.bird.x = 0.19;
                        game_info.bird.y = -0.05;
                        game_info.bird.degree = 0,
                        game_info.bird.velocity = 0,
                        game_info.bird.frame_interval = 7;
                        game_info.pipe.x0 = -1.59;
                        game_info.pipe.x1 = -2.19;
                        game_info.pipe.score0 = 1;
                        game_info.pipe.score1 = 1;
                        game_info.stage = 'get_ready';
    
                        function pageFadeIn() {
                            if (frame <= frame_interval * 2) {
                                getReadyPage();
                                ctx.fillStyle = `rgba(0, 0, 0, ${2 - frame / frame_interval})`;
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                frame += game_info.delta_time * 60;
                                requestAnimationFrame(pageFadeIn);
                            } else {
                                game_info.pause_loop = false;
                                gameLoop();
                            }
                        }
                        pageFadeIn();
                    }
                }
                pageFadeOut();
            }
            break;
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }
}

// game preparation
preloadSFX(() => {
    console.log('Sound Effects Loaded')
    preloadImages(() => {
        console.log('Images Loaded');
        canvas.addEventListener('mousedown', initPageInteraction);

        // fetch best score if exist in local storage
        if (localStorage.getItem('best_score') === null) {
            localStorage.setItem('best_score', 0);
        } else {
            game_info.best_score = parseInt(localStorage.getItem('best_score'), 10);
        }
        
        // game start
        randomCostume();
        gameLoop();
    });
});