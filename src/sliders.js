class Slider {
    TRACK_CHAR = "="
    ENDS_CHAR = "|"
    HANDLE_W = 32; //px
    HANDLE_H = 32; //px
    TRACK_COLOR   = '#ffffff';
    SHADOW_COLOR  = '#838383';
    SCALE = 0.6;

    constructor(canvas, slider) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.slider = slider;

        const handleImage = new Image();
        handleImage.onload = () => {
            this.HANDLE_W = handleImage.naturalWidth  * this.SCALE;
            this.HANDLE_H = handleImage.naturalHeight  * this.SCALE;
            this.draw(+slider.value);
        };
        handleImage.src = '/handle.png';
        this.handleImage = handleImage;

        window.addEventListener('resize', this.resizeCanvas);
        this.resizeCanvas(); // run once on load
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width  = rect.width;   // updates the drawing buffer
        this.canvas.height = rect.height;
        this.draw(+this.slider.value);
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


        const {charW, charCount} = this.getLength(trackLen, trackLeft);
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

    getLength(trackLen, trackLeft) {
        const charW = this.ctx.measureText(this.TRACK_CHAR).width;
        const charCount = Math.floor(trackLen / charW);

        return {charW, charCount};
    }
}

let sliderObjects = []

export function buildAllSliders() {
    const sliders = document.querySelectorAll("[data-slider]");

    function updateTooltip(input, tooltip) {
        const value = input.value;
        const max = input.max;
        const min = input.min;

        const percent = ((value - min) / (max - min)) * 100;

        tooltip.textContent = `${parseFloat(value).toFixed(2)}`;
        tooltip.style.left = `${percent}%`;
    }

    function removeTooltip(input, tooltip) {
        const delay = 500
        return setTimeout(() => {
            tooltip.style.opacity = "0";
        }, delay);
    }

    sliders.forEach((slider) => {
        console.debug(`Found slider ${slider}`);

        const inner = slider.querySelector(".inner");
        const input = inner.querySelector("input[type='range']")
        const trackCanvas = slider.querySelector("canvas");

        const obj = new Slider(trackCanvas, input);
        sliderObjects.push(obj);

        input.addEventListener("input", (e) => {
            obj.draw(e.target.value);
            updateTooltip(input, tooltip);
        })

        const tooltip = slider.querySelector(".tooltip");
        input.addEventListener("mouseenter", (e) => {
            if (tooltip.timeout) {
                clearTimeout(tooltip.timeout);
            }
            tooltip.style.opacity = "100%";
        });

        input.addEventListener("mouseleave", (e) => {
            tooltip.timeout = removeTooltip(input, tooltip);
        });

        updateTooltip(input, tooltip);
    });
}

