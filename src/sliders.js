class Tooltip {
    APPEAR_DELAY = 1000;
    DISAPPEAR_DELAY = 200;

    appearTimeout = null;
    disappearTimeout = null;

    constructor(element) {
        this.tooltip = document.createElement("div");
        this.tooltip.classList.add("tooltip");

        element.parentElement.appendChild(this.tooltip);

        this.slider = element;

        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.update = this.update.bind(this);
        this.appear = this.appear.bind(this);
        this.disappear = this.disappear.bind(this);

        this.slider.addEventListener("input", this.update);
        this.slider.addEventListener("mouseleave", this.handleMouseLeave);
        this.slider.addEventListener("mouseenter", this.handleMouseEnter);

        this.update();
    }

    appear() {
        this.tooltip.style.opacity = "100%";
        this.appearTimeout = null;
    }

    disappear() {
        this.tooltip.style.opacity = "0";
        this.disappearTimeout = null;
    }

    handleMouseEnter() {
        if (this.disappearTimeout) {
            clearTimeout(this.disappearTimeout);
            return;
        }

        if (!this.appearTimeout) {
            this.appearTimeout = setTimeout(this.appear, this.APPEAR_DELAY);
        }
    }

    handleMouseLeave() {
        this.disappearTimeout = setTimeout(this.disappear, this.DISAPPEAR_DELAY);

        if (this.appearTimeout) {
            clearTimeout(this.appearTimeout);
        }
    }

    update() {
        const value = this.slider.value;
        const max = this.slider.max;
        const min = this.slider.min;

        const percent = ((value - min) / (max - min)) * 100;

        this.tooltip.textContent = `${parseFloat(value).toFixed(2)}`;
        this.tooltip.style.left = `${percent}%`;
    }
}

class Slider {
    TRACK_CHAR = "="
    ENDS_CHAR = "|"
    HANDLE_W = 32; //px
    HANDLE_H = 32; //px
    TRACK_COLOR = '#ffffff';
    SHADOW_COLOR = '#838383';
    SCALE = 0.6;

    tooltip;
    lastValue;

    constructor(canvas, slider) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.slider = slider;

        const handleImage = new Image();
        handleImage.onload = () => {
            this.HANDLE_W = handleImage.naturalWidth * this.SCALE;
            this.HANDLE_H = handleImage.naturalHeight * this.SCALE;
            this.draw(+slider.value);
        };
        handleImage.src = '/handle.png';
        this.handleImage = handleImage;

        this.lastValue = this.slider.value;
        this.tooltip = new Tooltip(slider);

        window.addEventListener('resize', this.resize);
        this.draw = this.draw.bind(this);
        this.update = this.update.bind(this);
        this.resize = this.resize.bind(this);
        this.slider.addEventListener("input", this.update);

        this.resize();
        this.draw()
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();

        this.slider.width = rect.width;
        this.canvas.style.width = `${rect.width}px`;

        this.canvas.width = rect.width;   // updates the drawing buffer
        this.canvas.height = rect.height;
        this.draw(this.slider.value);
    }

    update() {
        const value = this.slider.value;
        if (this.lastValue === value) return;

        this.tooltip.appear();
        this.draw(value);
    }

    draw(value) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const min = +this.slider.min;
        const max = +this.slider.max;
        const t = (value - min) / (max - min);   // 0..1

        this.ctx.clearRect(0, 0, W, H);

        // ── Track geometry ──────────────────────────────────────────────
        const trackY = H / 2;
        const trackPad = this.HANDLE_W / 2;
        const trackLeft = trackPad;
        const trackRight = W - trackPad;
        const trackLen = trackRight - trackLeft;

        // Character track rendered via fillText
        const charSize = 14;
        this.ctx.font = `bold ${charSize}px monospace`;
        this.ctx.textBaseline = 'middle';


        const {charW, charCount} = this.getLength(trackLen);
        const innerLen = charCount * charW;
        const innerLeft = trackLeft + (trackLen - innerLen) / 2;

        // Filled portion (brighter)
        const fillEnd = innerLeft + charCount * charW * t;

        for (let i = 0; i < charCount; i++) {
            const x = innerLeft + i * charW;
            this.ctx.fillStyle = x + charW <= fillEnd ? this.TRACK_COLOR : this.SHADOW_COLOR;
            this.ctx.fillText(this.TRACK_CHAR, x, trackY + 1);
        }

        // Walls
        this.ctx.fillStyle = this.TRACK_COLOR;
        this.ctx.fillText(this.ENDS_CHAR, innerLeft - charW * 0.9, trackY + 1);
        this.ctx.fillText(this.ENDS_CHAR, innerLeft + innerLen + charW * 0.1, trackY + 1);

        // ── Handle position ─────────────────────────────────────────────
        const handleX = Math.round(innerLeft + t * innerLen - this.HANDLE_W / 2);
        const handleY = Math.round(trackY - this.HANDLE_H / 2);

        // Draw PNG handle (preserves transparency)
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.handleImage, handleX, handleY, this.HANDLE_W, this.HANDLE_H);
    }

    getLength(trackLen) {
        const charW = this.ctx.measureText(this.TRACK_CHAR).width;
        const charCount = Math.floor(trackLen / charW);

        return {charW, charCount};
    }
}

let sliderObjects = []

export function buildAllSliders() {
    if (sliderObjects.length >= 1) return;

    const sliders = document.querySelectorAll("[data-slider]");

    sliders.forEach((slider) => {
        console.debug(`Found slider ${slider}`);

        const inner = slider.querySelector(".inner");
        const input = inner.querySelector("input[type='range']")
        const trackCanvas = slider.querySelector("canvas");

        const obj = new Slider(trackCanvas, input);
        sliderObjects.push(obj);
    });
}

export function resizeSliders() {
    sliderObjects.forEach(slider => {
        slider.resize();
        slider.draw();
    })
}