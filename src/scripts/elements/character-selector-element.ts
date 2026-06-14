import CharacterSearch from "./character-search-element";
import { SVG_NS } from "../utils/constants";

export default class CharacterSelector extends HTMLElement {
    private input!: CharacterSearch;
    private invalidBorder!: HTMLDivElement;
    public static readonly ELEMENT_NAME = "character-selector";

    public static init() {
        customElements.define(CharacterSelector.ELEMENT_NAME, CharacterSelector);
    }

    public static create() {
        const element = document.createElement(CharacterSelector.ELEMENT_NAME) as CharacterSelector;
        return element;
    }

    constructor() {
        super();
    }
    
    public popValue() {
        const value = this.input.getValue();
        this.input.reset();
        return value;
    }

    connectedCallback() {
        this.render();
        this.input.addEventListener(CharacterSearch.EVENT_FILLED, () => {
            this.submit();
        });
    }

    public submit() {
        const value = this.input.getValue();
        if (CharacterSearch.canDisplay(value)) {
            this.confirmed(value);
            this.input.reset();
        }
        else {
            this.invalidBorder.style.display = "";
            document.addEventListener("pointerdown", this.handlePointerDown);
            document.addEventListener("keydown", this.handleKeyDown);
        }
    }

    private handlePointerDown = () => {
        this.invalidBorder.style.display = "none";
        document.removeEventListener("pointerdown", this.handlePointerDown);
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key != "Enter") {
            this.invalidBorder.style.display = "none";
            document.removeEventListener("pointerdown", this.handlePointerDown);
            document.removeEventListener("keydown", this.handleKeyDown);
        }
    }

    // Called when submit button has been pressed, enter has been pressed on the search input, ...
    // and the input was valid. Reassign from place of use to do whatever you want to do in that case.
    public confirmed: (value: string) => void = function() {
        console.error("The confirmed function must be reassigned for use.");
    }

    public reset() {
        this.input.reset();
    }

    private render() {
        this.classList.add(CharacterSelector.ELEMENT_NAME);

        this.input = CharacterSearch.create();
        this.appendChild(this.input);

        this.invalidBorder = document.createElement("div");
        this.invalidBorder.classList.add("character-selector-invalid");
        this.invalidBorder.style.display = "none";
        this.appendChild(this.invalidBorder);
        
        const button = document.createElement("button");
        button.classList.add("character-selector-submit");
        button.addEventListener("click", () => {this.submit()});
        this.appendChild(button);

        const buttonIcon = document.createElementNS(SVG_NS, "svg");
        buttonIcon.setAttribute("viewBox", "0 0 100 100");
        buttonIcon.setAttribute("xmlns", SVG_NS);
        buttonIcon.classList.add("character-selector-submit-icon");
        button.appendChild(buttonIcon);

        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", "42");
        circle.setAttribute("cy", "42");
        circle.setAttribute("r", "20");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke-width", "5");
        buttonIcon.appendChild(circle);

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", "59");
        line.setAttribute("y1", "59");
        line.setAttribute("x2", "77");
        line.setAttribute("y2", "77");
        line.setAttribute("stroke-width", "5");
        line.setAttribute("stroke-linecap", "round");
        buttonIcon.appendChild(line);
    }
}
