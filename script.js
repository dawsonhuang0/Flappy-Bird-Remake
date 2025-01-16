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
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
});

// images initialization
const BASE_PATH = 'img';
const img_path = ['logo', 'ready', 'over', 'tap', 'start', 'land', 'pipe', 'board',
                  'new', ['bg', 2], ['glitter', 3], ['bird0', 3], ['bird1', 3],
                  ['bird2', 3], ['medal', 4], ['small_num', 10], ['large_num', 10]];

const imgs = {};
let totalImages = 0;
let loadedImages = 0;

function preloadImages(callback) {
    img_path.forEach(item => {
        if (Array.isArray(item)) {
            const [key, count] = item;
            imgs[key] = [];
            for (let i = 0; i < count; i++) {
                const src = `${BASE_PATH}/${key}${i}.png`;
                loadSingleImage(src, key, callback, i);
            }
        } else {
            const src = `${BASE_PATH}/${item}.png`;
            loadSingleImage(src, item, callback);
        }
    });

    function loadSingleImage(src, key, callback, index = null) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            if (index !== null) {
                imgs[key][index] = img;
            } else {
                imgs[key] = img;
            }
            loadedImages++;
            if (loadedImages === totalImages) callback();
        };
        img.onerror = () => console.error(`Failed to load image: ${src}`);
        totalImages++;
    }
}

function checkAllImagesLoaded(callback) {
    if (loadedImages === totalImages) {
        console.log('All Images Are Loaded');
        callback();
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
    if (game_info.stage !== game_info.prev_stage) {
        game_info.bg = Math.floor(Math.random() * 2);
        game_info.bird.costume = Math.floor(Math.random() * 3);
        game_info.prev_stage = game_info.stage;
    }
}

// demo bird animation
function demoBird(base_y = 0, range = 0.012, step = 0.00056) {
    if (game_info.bird.direction_up) {
        game_info.bird.y += step;
        if (game_info.bird.y > base_y + range / 2) {
            game_info.bird.direction_up = false;
            game_info.bird.y -= step;
        }
    } else {
        game_info.bird.y -= step;
        if (game_info.bird.y < base_y - range / 2) {
            game_info.bird.direction_up = true;
            game_info.bird.y += step;
        }
    }

    game_info.bird.next_wing();
}

// draw start page
function initPage(tran = 0) {
    demoBird();
    game_info.land.move();
    drawObject(imgs.bg[game_info.bg]);
    drawObject(imgs.logo, 0, 0.2);
    drawObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing], game_info.bird.x,
         game_info.bird.y);
    drawObject(imgs.start, 0, -0.23 - 0.007 * tran);
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// draw get ready page
function getReadyPage() {
    demoBird(-0.05);
    game_info.land.move();
    drawObject(imgs.bg[game_info.bg]);
    drawObject(imgs.large_num[0], 0, 0.3);
    drawObject(imgs.ready, 0, 0.13);
    drawObject(imgs.tap, 0, -0.075);
    drawObject(imgs[`bird${game_info.bird.costume}`][game_info.bird.wing], game_info.bird.x,
         game_info.bird.y);
    drawObject(imgs.land, game_info.land.x0, -0.391);
    drawObject(imgs.land, game_info.land.x1, -0.391);
}

// game loop
function gameLoop() {
    // get random costume and random background
    if (game_info.stage !== 'gaming') randomCostume();

    // clear last frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (game_info.stage) {
        case 'init':
            initPage();
            break;
        case 'get_ready':
            getReadyPage();
            break;
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }

    requestAnimationFrame(gameLoop);
}

// game info initialization
let game_info = {
    stage: 'init',
    prev_stage: '',
    score: 0,
    best_score: 0,
    bg: 0,
    bird: {
        x: 0,
        y: 0,
        direction_up: true,
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
        }
    },
    land: {
        x0: 0,
        x1: -1.083,
        frame: 0,
        frame_interval: 1,
        move() {
            if (this.frame >= this.frame_interval) {
                this.x0 += 0.007;
                this.x1 += 0.007;
                if (this.x0 >= 1.083) this.x0 = -1.083;
                if (this.x1 >= 1.083) this.x1 = -1.083;
                this.frame = 0;
            }
            this.frame++;
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
            if ((start_x <= mouse_x && mouse_x <= start_x + start_width)
                && (start_y <= mouse_y && mouse_y <= start_y + start_height)) {
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
                            }
                        }
                        pageFadeIn();
                    }
                }
                pageFadeOut();
            }
            break;
        case 'get_ready':
            break;
        default:
            console.error(`ERROR: Unknown game stage: ${game_info.stage}`);
    }
});

// game start
preloadImages(() => {
    randomCostume();
    gameLoop();
});