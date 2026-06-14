export default class Gearshift extends HTMLElement {
    private min = 0;
    private max = 0;
    private step = 1;
    private baseValue = 0;
    private handler = (value: string) => {return;};
    public static readonly ELEMENT_NAME = "gearshift-element";

    public static init() {
        customElements.define(Gearshift.ELEMENT_NAME, Gearshift);
    }

    public static create(min: number, 
        max: number, 
        step: number,
        baseValue: number,
        handler: (value: string) => void
    ): Gearshift {
        const gearshift = document.createElement(Gearshift.ELEMENT_NAME) as Gearshift;
        gearshift.initialise(min, max, step, baseValue, handler);
        return gearshift;
    }

    private initialise(min: number, 
        max: number,
        step: number,
        baseValue: number, 
        handler: (value: string) => void
    ) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.baseValue = baseValue;
        this.handler = handler;
    }

    connectedCallback() {
        this.render();
    }

    public getSlider() {
        return this.querySelector(".gearshift-slider") as HTMLInputElement;
    }

    private render() {
        this.classList.add(Gearshift.ELEMENT_NAME);

        const slider = document.createElement("input") as HTMLInputElement;
        slider.classList.add("gearshift-slider");
        slider.classList.add("custom-slider-thumb");
        slider.name = "id";
        slider.type = "range";
        slider.min = this.min.toString();
        slider.max = this.max.toString();
        slider.step = this.step.toString();
        slider.addEventListener(
            "input", () => this.handler(slider.value)
        );
        slider.value = this.baseValue.toString();
        this.handler(slider.value);
        this.appendChild(slider);

        const sliderStyles = getComputedStyle(slider);
        const thumbSizeEm = sliderStyles.getPropertyValue("--thumb-size").trim();
        const temp = document.createElement("div");
        temp.style.width = thumbSizeEm;
        document.body.appendChild(temp);
        const thumbSizePx = temp.offsetWidth;
        temp.remove();

        // Center slider thumb on chromium.
        slider.style.setProperty(
            "--webkit-thumb-offset", `${this.offsetHeight / 2 - thumbSizePx / 2}px`
        );

        // Add indication dots.
        const dotContainer = document.createElement("div");
        dotContainer.classList.add("gearshift-dot-container");
        this.appendChild(dotContainer);
        let dotOffsetPx = 0;
        let dotOffsetPercentage = 0;
        let dotWidthPx = 0;
        for (let i = this.min; i <= this.max; i++) {
            const dot = document.createElement("div");
            dot.classList.add("gearshift-dot");
            dotContainer.appendChild(dot);

            dotOffsetPx = thumbSizePx / 2 - dot.offsetWidth / 2;
            dotOffsetPercentage = dotOffsetPx / slider.offsetWidth * 100;
            dotWidthPx = dot.offsetWidth;
            // Place first dot right under most left slider thumb position.
            if (i == this.min) {
                dot.style.marginLeft = `${dotOffsetPercentage}%`;
            }
            // Place first dot right under most left slider thumb position.
            else if (i == this.max) {
                dot.style.marginRight = `${dotOffsetPercentage}%`;
            }

            if (i == this.baseValue) {
                dot.style.borderRadius = "0";
                dot.style.transform = "translate(0, -50%) rotate(45deg)";
            }
        }

        // Match slider track width with outer dot position.
        // moz.
        const widthPx = slider.offsetWidth - 2 * dotOffsetPx - dotWidthPx;
        const widthPercentage = widthPx / slider.offsetWidth * 100;
        slider.style.setProperty("--track-width", `${widthPercentage}%`);
        // Webkit.
        const marginPx = dotOffsetPx + dotWidthPx / 2;
        const marginPercentage = marginPx / slider.offsetWidth * 100;
        slider.style.setProperty(
            "--webkit-gradient-margin", 
            `${marginPercentage}%`
        );
    }
}
