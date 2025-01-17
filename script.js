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
        const audio = new Audio(`${BASE_SFX_PATH}/${item}.ogg`);

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
            console.error(`Failed to load SFX: ${BASE_SFX_PATH}/${item}.ogg`);
        };
    });
}

// images preparation
const BASE_IMG_PATH = 'img';
const img_name = ['logo', 'ready', 'over', 'tap', 'start', 'land', 'board', 'new',
                  ['bg', 2], ['pipe', 2], ['glitter', 3], ['bird0', 3], ['bird1', 3],
                  ['bird2', 3], ['medal', 4], ['small_num', 10], ['large_num', 10]];

const imgs = {};
let loadedImages = 0;
let totalImages = img_name.reduce((sum, item) => {
    if (Array.isArray(item)) {
        return sum + item[1];
    }
    return sum + 1;
}, 0);

function preloadImages(callback) {
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

// set random background and random bird costume when stage changed
function randomCostume() {
    game_info.bg = Math.floor(Math.random() * 2);
    game_info.bird.costume = Math.floor(Math.random() * 3);
}

// demo bird animation
function demoBird(base_y = 0, range = 0.012, step = 0.00056) {
    if (game_info.bird.demo_direction_up) {
        game_info.bird.y += step;
        if (game_info.bird.y > base_y + range / 2) {
            game_info.bird.demo_direction_up = false;
            game_info.bird.y -= step;
        }
    } else {
        game_info.bird.y -= step;
        if (game_info.bird.y < base_y - range / 2) {
            game_info.bird.demo_direction_up = true;
            game_info.bird.y += step;
        }
    }
    game_info.bird.next_wing();
    drawObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing],
               game_info.bird.x, game_info.bird.y);
}

// draw start page
function initPage(tran = 0) {
    drawObject(imgs.bg[game_info.bg]);
    drawObject(imgs.logo, 0, 0.2);
    demoBird();
    drawObject(imgs.start, 0, -0.23 - 0.007 * tran);

    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// draw get ready page
function getReadyPage() {
    drawObject(imgs.bg[game_info.bg]);
    drawObject(imgs.large_num[0], 0, 0.35);
    drawObject(imgs.ready, 0, 0.15);
    drawObject(imgs.tap, 0, -0.075);
    demoBird(-0.05);

    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

function gamingPage(tran = 0, tran_frame = 0, tran_frame_interval = 30) {
    drawObject(imgs.bg[game_info.bg]);

    game_info.pipe.move();
    drawObject(imgs.pipe[0], game_info.pipe.x0, game_info.pipe.y0 + 0.8);
    drawObject(imgs.pipe[1], game_info.pipe.x0, game_info.pipe.y0);
    drawObject(imgs.pipe[0], game_info.pipe.x1, game_info.pipe.y1 + 0.8);
    drawObject(imgs.pipe[1], game_info.pipe.x1, game_info.pipe.y1);

    drawObject(imgs.large_num[0], 0, 0.35);
    if (tran === 1) {
        ctx.globalAlpha = 1 - tran_frame / tran_frame_interval;
        drawObject(imgs.ready, 0, 0.15);
        drawObject(imgs.tap, 0, -0.075);
        ctx.globalAlpha = 1;
    }

    game_info.bird.fall();
    game_info.bird.move();

    if (game_info.bird.velocity > 0.008) {
        game_info.bird.degree += (Math.PI / 2 - game_info.bird.degree) * 0.1;
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

    game_info.land.move();
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// game loop
function gameLoop() {
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
            break;
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }

    if (!game_info.pause_loop) requestAnimationFrame(gameLoop);
}

// game info initialization
let game_info = {
    pause_loop: false,
    stage: 'init',
    score: 0,
    best_score: 0,
    bg: 0,
    bird: {
        // physic properties
        x: 0,
        y: 0,
        degree: 0,
        velocity: 0,
        max_velocity: 0.02,
        acceleration: 0.0006,
        flap_force: -0.0048,
        fly() {
            this.velocity = this.flap_force - this.acceleration * 10;

            sfx.wing.currentTime = 0;
            sfx.wing.play();
        },
        fall() {
            this.velocity += this.acceleration;

            if (this.velocity > this.max_velocity) {
                this.velocity = this.max_velocity;
            }
        },
        move() {
            this.y -= this.velocity;

            if (this.y < -0.26) {
                this.y = -0.26;
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
            this.frame++;
        },

        // demo bird property
        demo_direction_up: true
    },
    pipe: {
        x0: -1.59,
        x1: -2.19,
        y0: 0,
        y1: 0,
        move() {
            this.x0 += 0.007;
            this.x1 += 0.007;
            if (this.x0 >= 0.59) {
                this.x0 = -0.59;
                this.y0 = -0.51 + Math.random() * 0.33;
            }
            if (this.x1 >= 0.59) {
                this.x1 = -0.59;
                this.y1 = -0.51 + Math.random() * 0.33;
            }
        }
    },
    land: {
        x0: 0,
        x1: -1.083,
        move() {
            this.x0 += 0.007;
            this.x1 += 0.007;
            if (this.x0 >= 1.083) this.x0 = -1.083;
            if (this.x1 >= 1.083) this.x1 = -1.083;
        }
    }
};

// detect interactive event
canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale_x = canvas.width / rect.width;
    const scale_y = canvas.height / rect.height;

    const mouse_x = (event.clientX - rect.left) * scale_x;
    const mouse_y = (event.clientY - rect.top) * scale_y;

    switch (game_info.stage) {
        case 'init':
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
                        initPage(1);
                        ctx.fillStyle = `rgba(0, 0, 0, ${frame / frame_interval})`;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        frame++;
                        requestAnimationFrame(pageFadeOut);
                    } else {
                        randomCostume();
                        game_info.bird.x = 0.19;
                        game_info.bird.y = -0.03;
                        game_info.stage = 'get_ready';

                        function pageFadeIn() {
                            if (frame <= frame_interval * 2) {
                                getReadyPage();
                                ctx.fillStyle = `rgba(0, 0, 0, ${2 - frame / frame_interval})`;
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                frame++;
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
        case 'get_ready':
            if (!game_info.pause_loop) {
                game_info.pause_loop = true;

                game_info.bird.frame_interval = 3;
                game_info.pipe.y0 = -0.51 + Math.random() * 0.33;
                game_info.pipe.y1 = -0.51 + Math.random() * 0.33;
                game_info.stage = 'gaming';
                game_info.bird.fly();

                let frame = 0;
                const frame_interval = 30;

                function elementFadeOut() {
                    if (frame <= frame_interval) {
                        gamingPage(1, frame, frame_interval);
                        frame++;
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
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }
});

// game preparation
preloadSFX(() => {
    console.log('Sound Effects Loaded')
    preloadImages(() => {
        console.log('Images Loaded');
        // game start
        randomCostume();
        gameLoop();
    });
});