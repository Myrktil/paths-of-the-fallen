import { USER_ASSETS_DIR_PATH } from "../utils/constants";
import Character from "../models/character";
import Gearshift from "./gearshift-element";
import Disposable from "../utils/disposable";
import CharacterSearch from "./character-search-element";
import EditCharacter from "../models/edit-character";
import DisplayCharacter from "../models/display-character";

class CharacterDisplayController extends HTMLElement implements Disposable {
    private _character!: Character;
    // Stores the input elements for data binding.
    private readonly inputs: Map<Character.Property, HTMLInputElement> = new Map();
    public static readonly EVENT_DISPOSED = "display-controller:disposed";
    public static readonly ELEMENT_NAME = "character-display-controller";

    public static init(sliderIconFile: string) {
        customElements.define(CharacterDisplayController.ELEMENT_NAME, CharacterDisplayController);

        // Load the slider icons from the config.
        if (sliderIconFile == "") {
            document.documentElement.style.setProperty("--slider-image", "var(--slider-fallback)");
        }
        else {
            document.documentElement.style.setProperty(
                "--slider-image", `url(\"${USER_ASSETS_DIR_PATH + sliderIconFile}\")`);
        }
    }

    public static async create(
        characterName: string, 
        method: CharacterDisplayController.CreationMethod, isEdit: boolean
    ): Promise<CharacterDisplayController | null> {            
        let character: Character | null;

        switch (method) {
            case CharacterDisplayController.CreationMethod.CREATE:
                if (isEdit) {
                    character = EditCharacter.create(characterName);
                }
                else {
                    character = DisplayCharacter.create(characterName);
                }
                break;
            case CharacterDisplayController.CreationMethod.LOAD:
                if (isEdit) {
                    character = await EditCharacter.load(characterName);
                }
                else {
                    character = await DisplayCharacter.load(characterName);
                }
                break;
        }

        if (character != null) {
            const controller = document.createElement(CharacterDisplayController.ELEMENT_NAME) as CharacterDisplayController;
            controller.initialise(character);
            const event = new CustomEvent<CharacterSearch.CharacterBlockedDetail>(
                CharacterSearch.EVENT_CHARACTER_BLOCKED, 
                { detail: { name: character.name } }
            );
            document.dispatchEvent(event);
            return controller;
        }
        else {
            return null;
        }
    }

    constructor() {
        super();
    }

    private initialise(character: Character) {
        this._character = character;
    }

    connectedCallback() {
        this.render();
        this.connectDataBindingEvents();

        // Use data binding to sync inputs with character values.
        this.character.startingBook = 1;
        // Value is clamped such that the character's max book is used.
        this.character.endBook = Number.MAX_SAFE_INTEGER;
        this.character.endSection = 0;
        this.updateMaxSection();
    }

    public get character(): Character {
        return this._character;
    }

    public getInput(type: Character.Property): HTMLInputElement {
        const inputMissingError = 
            Error("The input " + type + " was not stored in the inputs correctly.");

        const input = this.inputs.get(type);
        if (!this.inputs.has(type) || input === undefined) {
            throw inputMissingError;
        }
        
        return input;
    }

    private updateMaxSection() {
        const slider = this.inputs.get(Character.Property.END_SECTION);
        if (slider !== undefined) {
            const pathsLength = this.character.paths.length;
            if (pathsLength > 0) {
                slider.max = this.character.paths[pathsLength - 1].sectionId.toString();
            }
            else {
                slider.max = "0";
            }
        }
    }

    private handleAnimationInput(value: string) {
        const state = value as Character.AnimationState;
        if (state !== undefined) {
            this.character.changeAnimationState(state);
        }
    }

    public dispose() {
        const disposedEvent = new Event(CharacterDisplayController.EVENT_DISPOSED);
        this.dispatchEvent(disposedEvent);
        const freedEvent = new CustomEvent<CharacterSearch.CharacterFreedDetail>(
            CharacterSearch.EVENT_CHARACTER_FREED,
            { detail: { name: this.character.name } }
        );
        document.dispatchEvent(freedEvent);
        this.character.dispose();
        this.remove();
    }

    private render(): void {
        this.className = CharacterDisplayController.ELEMENT_NAME;
        
        // Display path checkbox.
        const checkbox = document.createElement("input") as HTMLInputElement;
        checkbox.classList.add("custom-checkbox");
        checkbox.classList.add("rect");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.addEventListener("input", () => {
            if (checkbox.checked) {
                this.character.draw();
            }
            else {
                this.character.undraw();
            }
        });
        this.appendChild(checkbox);

        // Character name.
        const nameLabel = document.createElement("label") as HTMLLabelElement;
        nameLabel.className = "character-name";
        nameLabel.innerHTML = this.character.name;
        this.appendChild(nameLabel);

        const break0 = document.createElement("div") as HTMLDivElement;
        break0.className = "flex-break";
        this.appendChild(break0);

        // Books selector.
        const bookSelector = document.createElement("div") as HTMLDivElement;
        bookSelector.className = "book-selector";
        this.appendChild(bookSelector);

        const bookLabel0 = document.createElement("label") as HTMLLabelElement;
        bookLabel0.className = "book-label";
        bookLabel0.innerHTML = "Displayed books:";
        bookSelector.appendChild(bookLabel0);

        const startingBookInput = document.createElement("input") as HTMLInputElement;
        startingBookInput.className = "number-input";
        startingBookInput.name = "startingBook";
        startingBookInput.addEventListener("change", () => {
            this.character.startingBook = parseInt(startingBookInput.value)});
        startingBookInput.addEventListener("focus", startingBookInput.select);
        bookSelector.appendChild(startingBookInput);
        this.inputs.set(
            Character.Property.STARTING_BOOK, 
            startingBookInput
        );

        const bookLabel1 = document.createElement("label") as HTMLLabelElement;
        bookLabel1.className = "book-label";
        bookLabel1.innerHTML = "-";
        bookSelector.appendChild(bookLabel1);
        
        const endBookInput = document.createElement("input") as HTMLInputElement;
        endBookInput.className = "number-input";
        endBookInput.name = "endBook";
        endBookInput.addEventListener("change", () => {
            this.character.endBook = parseInt(endBookInput.value)});
        endBookInput.addEventListener("focus", endBookInput.select);
        bookSelector.appendChild(endBookInput);
        this.inputs.set(Character.Property.END_BOOK, endBookInput);

        const break2 = document.createElement("div") as HTMLDivElement;
        break2.className = "flex-break";
        this.appendChild(break2);

        // Sliders.
        const sliderContainer = document.createElement("div") as HTMLDivElement;
        sliderContainer.className = "slider-container";
        this.appendChild(sliderContainer);

        // Section Slider.
        const sectionSliderContainer = document.createElement("div") as HTMLDivElement;
        sectionSliderContainer.className = "slider-controls-container";
        sliderContainer.appendChild(sectionSliderContainer);

        const restrictBySectionCheckbox = document.createElement("input") as HTMLInputElement;
        restrictBySectionCheckbox.classList.add("custom-checkbox");
        restrictBySectionCheckbox.classList.add("round");
        restrictBySectionCheckbox.type = "checkbox";
        restrictBySectionCheckbox.addEventListener("input", () => {
            this.character.restrictBySection = restrictBySectionCheckbox.checked;
        });
        sectionSliderContainer.appendChild(restrictBySectionCheckbox);
        this.inputs.set(
            Character.Property.RESTRICT_BY_SECTION, 
            restrictBySectionCheckbox
        );

        const sectionLabel = document.createElement("label");
        sectionLabel.classList.add("restriction-label");
        sectionLabel.innerHTML = "Section:";
        sectionSliderContainer.appendChild(sectionLabel);

        const endSectionInput = document.createElement("input") as HTMLInputElement;
        endSectionInput.classList.add("custom-slider");
        endSectionInput.classList.add("custom-slider-thumb");
        endSectionInput.name = "section";
        endSectionInput.type = "range";
        endSectionInput.min = "0";
        endSectionInput.addEventListener("input", () => {
            this.character.endSection = parseInt(endSectionInput.value);
            this.character.restrictBySection = true;
        });
        sectionSliderContainer.appendChild(endSectionInput);
        this.inputs.set(Character.Property.END_SECTION, endSectionInput);

        let break3 = document.createElement("div") as HTMLDivElement;
        break3.className = "flex-break";
        sliderContainer.appendChild(break3);

        // Animation Slider.
        const animationSliderControlsContainer = document.createElement("div") as HTMLDivElement;
        animationSliderControlsContainer.className = "slider-controls-container";
        sliderContainer.appendChild(animationSliderControlsContainer);

        const animationCheckbox = document.createElement("input") as HTMLInputElement;
        animationCheckbox.classList.add("custom-checkbox");
        animationCheckbox.classList.add("round");
        animationCheckbox.type = "checkbox";
        animationCheckbox.addEventListener("input", () => {
            if (animationCheckbox.checked) {
                this.character.activateAnimation();
            }
            else {
                this.character.deactivateAnimation();
            }
        });
        animationSliderControlsContainer.appendChild(animationCheckbox);
        this.inputs.set(
            Character.Property.IS_ANIMATED, 
            animationCheckbox
        );

        const animationLabel = document.createElement("label");
        animationLabel.classList.add("restriction-label");
        animationLabel.innerHTML = "Animate:";
        animationSliderControlsContainer.appendChild(animationLabel);

        const gearshift = Gearshift.create(-3, 3, 1, 0, (value: string) => this.handleAnimationInput(value));
        animationSliderControlsContainer.appendChild(gearshift);
        const animationStateSlider = gearshift.getSlider();
        if (!animationStateSlider) {
            throw Error("Failed to initialise display controller. Could not access animation slider.");
        }
        else {
            this.inputs.set(
                Character.Property.ANIMATION_STATE, 
                animationStateSlider
            );
        }

        let break1 = document.createElement("div") as HTMLDivElement;
        break1.className = "flex-break";
        this.appendChild(break1);

        // Remove button.
        let removeButton = document.createElement("button") as HTMLButtonElement;
        removeButton.className = "remove-button";     
        removeButton.type = "button";
        removeButton.innerHTML = "Remove";
        removeButton.onclick = () => this.dispose();
        this.appendChild(removeButton);   
    }

    private connectDataBindingEvents() {
        this.character.addEventListener(
            Character.EVENT_PROPERTY_CHANGED,
            (e) => this.handleRegularInputEvents(e)
        );

        this.character.addEventListener(
            Character.EVENT_ANIMATION_STATE_CHANGED, 
            (e) => this.handleAnimationStateInputEvents(e)
        );
    }

    private handleRegularInputEvents(e: Event) {
        const event = e as CustomEvent<Character.PropertyChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + Character.EVENT_PROPERTY_CHANGED + " event.");
            return;
        }

        let input;
        let value;
        switch (event.detail.property) {
            case Character.Property.STARTING_BOOK:
                input = this.getInput(event.detail.property);
                value = this.character.startingBook.toString();
                if (input.value != value) {
                    input.value = value;
                }
                break;
            case Character.Property.END_BOOK:
                input = this.getInput(event.detail.property);
                value = this.character.endBook.toString();
                if (input.value != value) {
                    input.value = value;
                }
                break;
            case Character.Property.IS_ANIMATED:
                input = this.getInput(event.detail.property);
                value = this.character.isAnimated;
                if (input.checked != value) {
                    input.checked = value;
                }
                break;
            case Character.Property.RESTRICT_BY_SECTION:
                input = this.getInput(event.detail.property);
                value = this.character.restrictBySection;
                if (input.checked != value) {
                    input.checked = value;
                }
                break;
            case Character.Property.END_SECTION:
                input = this.getInput(event.detail.property);
                value = this.character.endSection.toString();
                if (input.value != value) {
                    input.value = value;
                }
                break;
            case Character.Property.MAX_SECTION:
                this.updateMaxSection();
                break;
        }
    }

    private handleAnimationStateInputEvents(e: Event) {
        const event = e as CustomEvent<Character.AnimationStateChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + Character.EVENT_ANIMATION_STATE_CHANGED + " event.");
            return;
        }

        const input = this.inputs.get(Character.Property.ANIMATION_STATE);
        if (input !== undefined) {
            input.value = event.detail.state;
        }
    }
} 

namespace CharacterDisplayController {
    export enum CreationMethod {
        CREATE,
        LOAD,
    }
}

export default CharacterDisplayController;