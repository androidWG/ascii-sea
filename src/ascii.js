export class AsciiDotsBackground {
    constructor(options = {}) {
        // Configuration
        this.targetFps = options.targetFps || 30;
        this.backgroundColor = options.backgroundColor || '#1a1a1a'; // Dark background
        this.textColor = options.textColor || '200, 200, 200'; // Light gray text
        this.density = options.density || 1;
        this.animationSpeed = options.animationSpeed || 0.75;
        this.removeWaveLine = options.removeWaveLine !== undefined ? options.removeWaveLine : false;
        this.influenceSize = options.influenceSize || 200;
        this.influence = options.influenceStrength || 0.5;
        this.minInfluence = options.minInfluence || 0;
        this.menuHoverDuration = options.menuHoverDuration || 800; // Time in ms for full reveal
        this.menuInfluenceStrength = options.menuInfluenceStrength || 5; // Max influence strength
        this.border = options.border !== undefined ? options.border : true;
        this.borderSize = options.borderSize !== undefined ? options.borderSize : 100;
        this.rippleSpacing = 20; // Min pixels between ripples while dragging
        this.menuRandStrength = 50;
        this.menuMargin = {x: 50, y: 20};
        this.opacity = options.opacity !== undefined ? options.opacity : 0.75;

        // Canvas and container setup
        this.container = document.getElementById('ascii-background');
        this.clickContainer = document.documentElement;
        this.canvas = document.getElementById('ascii-canvas');
        this.noise = new Noise(Math.random());
        this.ctx = this.canvas.getContext('2d');
        this.isTouch = matchMedia('(hover: none)').matches

        // State
        this.start = undefined;
        this.mouse = {x: 0, y: 0, isDown: false, goneTime: -1};
        this.time = 0;
        this.clickWaves = [];
        this.lastRipplePos = null;

        // Startup
        this.startupDuration = options.startupDuration * 1000 || 2000; // Total animation time
        this.startupMaxDelay = this.startupDuration / 2 || 1000; // Max random delay per cell
        this.startupStart = Date.now();
        this.startupComplete = false;
        this.cellDelays = null; // Store random delay per cell

        // Influences
        this.menuItems = [];
        this.regions = [];

        this.CHARS = ' ⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠘⠨⠊⠋⠌⠍⠎⠏⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛⠜⠝⠞⠟⠡⠢⠣⠤⠥⠦⠧⠩⠪⠫⠬⠭⠮⠯⠱⠲⠳⠴⠵⠶⠷⠹⠺⠻⠼⠽⠾⠿';

        // Bind methods
        this.handleResize = this.handleResize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.animate = this.animate.bind(this);

        // Initialize
        this.init();
    }

    init() {
        // Set background color
        this.container.style.backgroundColor = this.backgroundColor;

        // Add event listeners
        window.addEventListener('resize', this.handleResize);
        this.clickContainer.addEventListener('mousemove', this.handleMouseMove);
        this.clickContainer.addEventListener('mousedown', this.handleMouseDown);
        this.clickContainer.addEventListener('mouseup', this.handleMouseUp);
        this.clickContainer.addEventListener('mouseleave', this.handleMouseLeave);
        this.clickContainer.addEventListener('mouseenter', this.handleMouseEnter);
        this.clickContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.clickContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.clickContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        window.onload = this.handleResize.bind(this);

        // Start animation
        this.animate();
    }

    createCharacterAtlas() {
        const cellSize = 16;
        const padding = 4; // Space between characters
        const paddedCellSize = cellSize + padding;
        const charsPerRow = 8;
        const rows = Math.ceil(this.CHARS.length / charsPerRow);
        const width = paddedCellSize * charsPerRow;
        const height = paddedCellSize * rows;

        let atlasCanvas, atlasCtx;
        if (typeof OffscreenCanvas === 'undefined') {
            atlasCanvas = document.createElement('canvas');
            atlasCanvas.width = width;
            atlasCanvas.height = height;
            atlasCtx = atlasCanvas.getContext('2d');
        } else {
            atlasCanvas = new OffscreenCanvas(width, height);
            atlasCtx = atlasCanvas.getContext('2d');
        }

        atlasCtx.font = `${cellSize}px monospace`;
        atlasCtx.textAlign = 'center';
        atlasCtx.textBaseline = 'middle';
        atlasCtx.fillStyle = `rgba(${this.textColor})`;

        this.charMap = [];

        this.CHARS.split('').forEach((char, i) => {
            const col = i % charsPerRow;
            const row = Math.floor(i / charsPerRow);
            // Draw centered in padded cell
            const x = col * paddedCellSize + paddedCellSize / 2;
            const y = row * paddedCellSize + paddedCellSize / 2;

            atlasCtx.fillText(char, x, y);

            // Source rect stays cellSize, no padding included
            this.charMap[i] = {
                sx: col * paddedCellSize + padding / 2,
                sy: row * paddedCellSize + padding / 2,
                sw: cellSize,
                sh: cellSize
            };
        });

        return atlasCanvas;
    }

    prepare() {
        // Update items that depend on DOM element rects
        this.menuItems = [];

        document.querySelectorAll('.menu-entry').forEach((item) => {
            const rect = item.getBoundingClientRect();
            this.menuItems.push({
                element: item,
                rect: rect,
                cleanBounds: {
                    left:   rect.left   - (this.menuRandStrength + this.menuMargin.x),  // max possible XMargin
                    right:  rect.right  + (this.menuRandStrength + this.menuMargin.x),
                    top:    rect.top    - (this.menuRandStrength + this.menuMargin.y),  // max possible YMargin
                    bottom: rect.bottom + (this.menuRandStrength + this.menuMargin.y),
                },
                state: 'none', // 'none', 'hovering', 'exiting'
                entered: null,
                exited: null,
                timeout: null
            });
        });

        this.updateRegions();

        // Set up text rendering
        let grid = this.calculateGrid();
        this.cellSize = grid.cellSize;
        this.cols = grid.cols;
        this.rows = grid.rows;
        this.cellDelays = new Float32Array(this.cols * this.rows).fill(-1);

        // Set up parallel canvas
        this.atlasCanvas = this.createCharacterAtlas();
    }

    updateRegions() {
        this.regions = [];

        const influenceElements = document.querySelectorAll("[data-influence]");
        for (const e of influenceElements) {
            this.regions.push({
                rect: e.getBoundingClientRect(),
                strength: e.dataset.influence,
                margin: e.dataset.influenceMargin
            })
        }
    }

    calculateGrid() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        const baseCellSize = 16;
        const dynamicDensity = Math.max(this.density / (this.scale * 1.5), this.density);
        const cellSize = Math.ceil(baseCellSize / dynamicDensity);
        console.debug(`Calculated cell size: ${cellSize}
        Density: ${dynamicDensity.toFixed(2)}`)

        const cols = Math.ceil(width / cellSize);
        const rows = Math.ceil(height / cellSize);

        return {cols, rows, cellSize};
    }

    handleResize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        const vmin = Math.min(window.innerWidth, window.innerHeight) / 850;
        this.scale = Math.max(Math.min(vmin,1),0.3);

        this.cellDelays = null; // prepare() will reallocate

        this.prepare();
    }

    handleHover() {
        this.menuItems.forEach((item) => {
            const isHovering = this.mouse.x >= item.rect.left && this.mouse.x <= item.rect.right &&
                this.mouse.y >= item.rect.top && this.mouse.y <= item.rect.bottom;

            if (isHovering) {
                switch (item.state) {
                    case 'none':
                        item.state = 'hovering';
                        item.entered = Date.now();
                        item.exited = null;

                        break;
                    case 'exiting':
                        item.state = 'hovering';
                        item.exited = null;
                        clearTimeout(item.timeout);
                        item.timeout = null;

                        break;
                }
            } else {
                switch (item.state) {
                    case 'hovering':
                        item.state = 'exiting';
                        item.exited = Date.now();
                        item.timeout = setTimeout(() => {
                            item.state = 'none';
                            item.exited = null;
                            item.entered = null;
                            item.timeout = null;

                        }, this.menuHoverDuration)
                        break;
                }
            }
        });
    }

    handleDragRipples() {
        if (this.mouse.isDown) {
            const x = this.mouse.x;
            const y = this.mouse.y;

            if (!this.lastRipplePos) {
                this.lastRipplePos = {x, y};
            }

            const dx = x - this.lastRipplePos.x;
            const dy = y - this.lastRipplePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const MAX_WAVES = 50;
            const threshold = 0.6;
            const fillRatio = Math.max(0, this.clickWaves.length - MAX_WAVES * threshold) / (MAX_WAVES * threshold);
            const aggressiveness = 14;
            const dynamicSpacing = this.rippleSpacing * (1 + fillRatio * aggressiveness); // up to 5x spacing at limit

            if (dynamicSpacing > this.rippleSpacing) {
                console.debug(`Capping ripple spacing to ${dynamicSpacing.toFixed(1)}
                Current waves: ${this.clickWaves.length}, fill ratio: ${(fillRatio * 100).toFixed(1)}%`);
            }

            if (dist >= dynamicSpacing) {
                this.clickWaves.push({
                    x, y,
                    time: Date.now(),
                    intensity: 1.0 // Lower than click intensity (2.5)
                });
                this.lastRipplePos = {x, y};
            }
        }
    }

    handleClickRipples(x, y) {
        this.clickWaves.push({
            x,
            y,
            time: Date.now(),
            intensity: 2.5 + Math.random() * 1.5
        });
    }

    handleMouseMove(e) {
        const activeElement = document.activeElement;
        if (activeElement.localName !== "body") return;

        const rect = this.clickContainer.getBoundingClientRect();

        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;

        this.handleDragRipples();
        this.handleHover();
    }

    handleMouseDown(e) {
        const activeElement = document.activeElement;
        console.log(activeElement.localName);
        if (activeElement.localName !== "body") return;

        this.mouse.isDown = true;

        const rect = this.clickContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.handleClickRipples(x, y);
    }

    handleMouseUp() {
        this.mouse.isDown = false;
        this.lastRipplePos = null; // Reset on release
    }

    handleMouseLeave() {
        if (!this.mouse) {
            return;
        }
        console.debug("Mouse left :(");
        this.mouse.goneTime = Date.now();
    }

    handleMouseEnter() {
        if (!this.mouse) {
            return;
        }
        console.debug("Mouse entered");
        this.mouse.goneTime = -1;
    }

    checkMenuItemTouch(touchX, touchY, e) {
        let flag = false;

        this.menuItems.forEach((item) => {
            const rect = item.rect;
            if (touchX >= rect.left && touchX <= rect.right && touchY >= rect.top && touchY <= rect.bottom) {
                flag = true;
            }
        });

        return flag;
    }

    handleTouchStart(e) {
        const touch = e.touches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (this.checkMenuItemTouch(touchX, touchY, e)) {
            console.debug("Cancelling touch");
            return;
        } else {
            e.preventDefault();
        }

        const rect = this.clickContainer.getBoundingClientRect();
        const x = touchX - rect.left;
        const y = touchY - rect.top;

        this.mouse.isDown = true;
        this.mouse.x = x;
        this.mouse.y = y;

        this.handleClickRipples(x, y);
    }

    handleTouchMove(e) {
        const touch = e.touches[0];

        const rect = this.clickContainer.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this.mouse.x = x;
        this.mouse.y = y;

        this.handleDragRipples();
        this.handleHover();
    }

    handleTouchEnd(e) {
        // e.preventDefault();
        this.mouse.isDown = false;
        this.lastRipplePos = null;
    }

    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    getWaveValue(x, y, time) {
        const wave1 = Math.sin(x * 0.05 + time * 0.5) * Math.cos(y * 0.06 - time * 0.3);
        const wave2 = Math.sin((x + y) * 0.04 + time * 0.7) * 0.8;
        const wave3 = Math.cos(x * 0.06 - y * 0.06 + time * 0.4) * 0.13;

        return (wave1 + wave2 + wave3) / 2;
    }

    getMenuHoverInfluence(x, y, currentTime, noise) {
        let influence = 0;

        this.menuItems.forEach((item) => {
            if (x < item.cleanBounds.left  || x > item.cleanBounds.right ||
                y < item.cleanBounds.top   || y > item.cleanBounds.bottom) return 0;
            // Early exit if outside the maximum possible bounds

            const rand = noise * this.menuRandStrength;
            const XMargin = this.menuMargin.x + rand;
            const YMargin = this.menuMargin.y + rand;

            const left = item.rect.left - XMargin;
            const right = item.rect.right + XMargin;
            const top = item.rect.top - YMargin;
            const bottom = item.rect.bottom + YMargin;

            if (x >= left && x <= right &&
                y >= top && y <= bottom) {
                let animationProgress = 0;

                switch (item.state) {
                    case 'hovering':
                        const timeSinceEnter = currentTime - item.entered;
                        const progress = Math.min(1, timeSinceEnter / this.menuHoverDuration);

                        animationProgress = this.easeInOutCubic(progress);
                        break;
                    case 'exiting':
                        const timeSinceExit = currentTime - item.exited;
                        const exitProgress = Math.max(0, 1 - timeSinceExit / this.menuHoverDuration);

                        animationProgress = this.easeInOutCubic(exitProgress);
                        break;
                }

                // Calculate distance-based influence
                const dx = x - this.mouse.x;
                const dy = y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = Math.max(item.rect.width, item.rect.height) * 3;

                if (distance < maxDistance) {
                    const distanceInfluence = (1 - distance / maxDistance);
                    // Combine time-based animation with distance-based influence
                    influence += distanceInfluence * this.menuInfluenceStrength * animationProgress;
                }
            }
        });

        return influence;
    }

    getClickWaveInfluence(x, y, precomputedWaves) {
        let totalInfluence = 0;

        for (let i = 0; i < precomputedWaves.length; i++) {
            const wave = precomputedWaves[i];
            const dx = x - wave.x;
            const dy = y - wave.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (Math.abs(distance - wave.waveRadius) < wave.waveWidth) {
                const proximityToWave = 1 - Math.abs(distance - wave.waveRadius) / wave.waveWidth;
                totalInfluence += wave.waveStrength * proximityToWave * Math.sin((distance - wave.waveRadius) * 0.05);
            }
        }

        return totalInfluence;
    }

    getMouseInfluence(x, y, currentTime) {
        if (this.isTouch) {
            return 0; // Disable mouse influence on touch devices
        }

        const dx = x - this.mouse.x;
        const dy = y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = this.influenceSize;

        const i = Math.max(0, 1 - distance / maxDistance);
        const goneTime = this.mouse.goneTime > 0 ? this.mouse.goneTime : currentTime;
        let anim = (currentTime - goneTime) / 1000;
        return i * (Math.min(1, anim * -1 + 1));
    }

    getRegionInfluence(x, y, noise, precomputedRegions) {
        let influence = 0;
        for (let i = 0; i < precomputedRegions.length; i++) {
            const r = precomputedRegions[i];
            const marginNoise = noise * 85 * this.scale;
            if (x >= r.left+marginNoise && x <= r.right+marginNoise
                && y >= r.top+marginNoise && y <= r.bottom+marginNoise) {
                influence += r.strength;
            }
        }
        return influence;
    }

    getScreenBorderInfluence(x, y, noise) {
        if (!this.border || this.borderSize < 2) {
            return 0;
        }

        const margin = this.borderSize + noise * 10;

        const distanceToLeft = x;
        const distanceToRight = this.canvas.width - x;
        const distanceToTop = y;
        const distanceToBottom = this.canvas.height - y;

        const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
        return Math.max(0, 1 - minDistance / margin);
    }

    getCellStartupProgress(x, y, currentTime) {
        if (this.startupComplete) return 1;

        const cellIndex = y * this.cols + x;

        if (this.cellDelays[cellIndex] < 0) {
            const biasedRandom = Math.pow(Math.random(), 2);
            const minDelay = 800;
            this.cellDelays[cellIndex] = minDelay + biasedRandom * (this.startupMaxDelay - minDelay);
        }

        const elapsed = currentTime - this.startupStart - this.cellDelays[cellIndex];

        if (elapsed < 0) return 0;
        if (elapsed > this.startupDuration) return 1;

        return 1 - Math.exp(-4 * (elapsed / this.startupDuration));
    }

    processFrame() {
        this.updateRegions();

        const currentTime = Date.now();
        this.time += this.animationSpeed * 0.05;

        if (!this.startupComplete) {
            const animationEnd = this.startupStart + this.startupDuration + this.startupMaxDelay;
            if (currentTime > animationEnd) {
                this.startupComplete = true;
                this.cellDelays = null; // free memory
            }
        }

        // Clean up old waves
        const now = Date.now();
        this.clickWaves = this.clickWaves.filter(wave => now - wave.time < 5000);

        // Clear with solid background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Precompute wave values for current frame
        const precomputedWaves = this.clickWaves.map(wave => {
            const age = currentTime - wave.time;
            const maxAge = 5000;
            if (age >= maxAge) return null;
            return {
                x: wave.x, y: wave.y,
                waveRadius: Math.pow(age / maxAge, 0.4) * 500,
                waveWidth: 150,
                waveStrength: (1 - age / maxAge) * wave.intensity,
            };
        }).filter(Boolean);

        // Precompute region bounds with noise margin
        const precomputedRegions = this.regions.map(region => {
            const XMargin = region.margin * this.scale;
            const YMargin = region.margin * this.scale;
            return {
                left:     region.rect.left   - XMargin,
                right:    region.rect.right  + XMargin,
                top:      region.rect.top    - YMargin,
                bottom:   region.rect.bottom + YMargin,
                strength: region.strength * (this.scale * 2),
            };
        });

        // Enter cell loop
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                // Get noise
                let noise = this.noise.simplex3(x, y, this.time * 0.5);

                const posX = x * this.cellSize;
                const posY = y * this.cellSize;

                // Calculate wave value at this position
                let waveValue = this.getWaveValue(posX, posY, this.time);

                // Add mouse influence
                const mouseInfluence = this.getMouseInfluence(posX, posY, currentTime);
                if (mouseInfluence > 0) {
                    waveValue += mouseInfluence * (Math.sin(this.time * 3) + this.minInfluence) * this.influence;
                }

                // Add menu hover influence
                const menuHoverInfluence = this.getMenuHoverInfluence(posX, posY, currentTime, noise);

                // Add click wave influence
                const clickInfluence = this.getClickWaveInfluence(posX, posY, precomputedWaves);
                waveValue += clickInfluence;

                // Map wave value to character and opacity
                const shift = 0.5;
                let normalizedValue = (
                    (waveValue - ((noise + shift) * menuHoverInfluence)
                    ) + 1) / 2;

                // Calculate region influence and apply it
                const regionInfluence = this.getRegionInfluence(posX, posY, noise, precomputedRegions);
                let borderInfluence = this.getScreenBorderInfluence(posX, posY, noise);
                normalizedValue -= regionInfluence;
                normalizedValue -= borderInfluence;

                const startupProgress = this.startupComplete ? 1 : this.getCellStartupProgress(x, y, currentTime);
                normalizedValue *= startupProgress;

                if (Math.abs(waveValue) > 0.15) {
                    let charIndex = Math.floor(normalizedValue * this.CHARS.length);
                    const clampedIndex = Math.min(this.CHARS.length - 1, Math.max(0, charIndex));

                    // Calculate opacity based on wave value
                    let opacity = Math.min(1, Math.max(0.3, 0.4 + normalizedValue)) * this.opacity;
                    opacity -= menuHoverInfluence * 0.15;
                    opacity -= borderInfluence * 0.1;

                    // Get atlas coordinates
                    const atlas = this.charMap[clampedIndex];
                    this.ctx.globalAlpha = opacity;
                    opacity *= startupProgress;

                    // Draw from atlas - MUCH faster than fillText
                    if (opacity > 0.01) {
                        this.ctx.drawImage(
                            this.atlasCanvas,
                            atlas.sx, atlas.sy, atlas.sw, atlas.sh,  // source
                            posX, posY, this.cellSize, this.cellSize            // destination
                        );
                    }
                }
            }
        }

        // Draw click wave circles
        if (!this.removeWaveLine) {
            this.clickWaves.forEach(wave => {
                const age = currentTime - wave.time;
                const maxAge = 5000;

                if (age < maxAge) {
                    const progress = age / maxAge;
                    const radius = progress * 500;
                    const alpha = (1 - progress) * 0.2 * wave.intensity;

                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(${this.textColor}, ${alpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.arc(wave.x, wave.y, radius, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }
            });
        }
    }

    animate(timestamp) {
        if (this.start === undefined) {
            this.start = timestamp;
        }

        let elapsed = timestamp - this.start;

        if (elapsed >= 1000 / this.targetFps) {
            this.processFrame();
            this.start = timestamp;
        }

        requestAnimationFrame(this.animate);
    }
}