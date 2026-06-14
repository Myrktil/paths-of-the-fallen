import { clearChildren } from "../utils/helpers";
import { DRAG_DURATION } from "../utils/constants";
import { getDisplayableCharacters } from "../data/data-manager";
import PointerBlocker from "../utils/pointer-blocker";

class CharacterSearch extends HTMLElement {
    private static readonly dontDisplay = new Set<string>();
    private readonly autocompleteOptions: HTMLDivElement[] = [];
    private prevOption: HTMLDivElement | null = null;
    // Start at -1 so pressing down for the first time highlits option 0.
    private _currIndex: number = -1;
    private _maxAutofillEntries = 10;
    public static readonly EVENT_FILLED = "character-search:enter";
    public static readonly EVENT_CHARACTER_BLOCKED = "character-search:character-blocked";
    public static readonly EVENT_CHARACTER_FREED = "character-search:character-freed";
    public static readonly ELEMENT_NAME = "character-search";

    public static init() {
        customElements.define(CharacterSearch.ELEMENT_NAME, CharacterSearch);

        document.addEventListener(CharacterSearch.EVENT_CHARACTER_BLOCKED, (e: Event) => {
            const event = e as CustomEvent<CharacterSearch.CharacterBlockedDetail>;
            if (event.detail === undefined) {
                console.error("Wrong detail provided for " + CharacterSearch.EVENT_CHARACTER_BLOCKED + " event.");
            }
            else {
                CharacterSearch.dontDisplay.add(event.detail.name);
            }
        });
        document.addEventListener(CharacterSearch.EVENT_CHARACTER_FREED, (e: Event) => {
            const event = e as CustomEvent<CharacterSearch.CharacterFreedDetail>;
            if (event.detail === undefined) {
                console.error("Wrong detail provided for " + CharacterSearch.EVENT_CHARACTER_FREED + " event.");
            }
            else {
                CharacterSearch.dontDisplay.delete(event.detail.name);
            }
        });
    }

    public static create() {
        const element = document.createElement(CharacterSearch.ELEMENT_NAME) as CharacterSearch;
        return element;
    }

    constructor() {
        super();
    }

    private set currIndex(value: number) {
        this._currIndex = value;
        if (this.currIndex < 0) {
            this._currIndex = 0;
        } 
        if (this.autocompleteOptions.length > 0 &&
            this.currIndex > this.autocompleteOptions.length - 1) {
            this._currIndex = this.autocompleteOptions.length - 1;
        }
        this.selectOptionByIndex();
    }

    public set maxAutofillEntries(value: number) {
        if (value > 0) {
            this._maxAutofillEntries = value;
        }
    }

    private get currIndex() {
        return this._currIndex;
    }

    public get maxAutofillEntries() {
        return this._maxAutofillEntries;
    }

    connectedCallback() {
        this.render();

        const searchBar: HTMLInputElement = this.getInput();
        searchBar.addEventListener("input", () => {
            if (this.getValue().length <= 0) {
                this.collapseAutocomplete();
            }
            else {
                this.displayAutocomplete();
            }
        });
        searchBar.addEventListener("keyup", (e) => this.manageKeyInput(e));
    }

    public static canDisplay(name: string): boolean {
        return (!CharacterSearch.dontDisplay.has(name)
                && getDisplayableCharacters().includes(name));
    }

    public getValue(): string {
        const searchBar: HTMLInputElement = this.getInput();
        return searchBar.value;
    }

    private displayAutocomplete() {
        const autocompleteContainer = this.querySelector(".autocomplete-container") as HTMLDivElement;
        autocompleteContainer.style.display = "flex";
        clearChildren([autocompleteContainer]);
        this.autocompleteOptions.splice(0);

        let candidates: string[] = [];
        getDisplayableCharacters().forEach(character => {
            if (CharacterSearch.canDisplay(character)) {
                candidates.push(character);
            }
        });

        const value = this.getValue();

        if (value.length > 0) {
            this.pruneCandidates(candidates, value);
            this.sortCandidates(candidates, value);
        }

        candidates.forEach(candidate => {
            let div = document.createElement("div") as HTMLDivElement;
            div.className = "autocomplete-item";
            div.setAttribute("name", this.formatAutocompleteName("", candidate));
            div.innerHTML = this.formatAutocompleteName(value, candidate);

            div.addEventListener("pointerup", (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Block all pointer events for a short duration. Avoid acidentally clicking
                // elements beneath the autocomplete items because some pointerevent got retargeted.
                PointerBlocker.blockFor(DRAG_DURATION);

                this.selectOptionByClick(div);
            }, { passive: false });

            this.autocompleteOptions.push(div);
            autocompleteContainer.appendChild(div);
        });

        // Don't display an empty autocomplete container because the bottom border still shows
        // which looks bad.
        if (candidates.length <= 0) {
            autocompleteContainer.style.display = "none";
        }
        else {
            if (value.length > 0) {
                // If user started typing select first option by default.
                this.currIndex = 0;
            }
        }

        document.addEventListener("pointerdown", this.handlePointerDown);
    }

    private handlePointerDown = (e: PointerEvent) => {
        if (e.target instanceof Element && e.target.closest(".character-selector") != null) {
            return;
        }
        
        this.collapseAutocomplete();
        document.removeEventListener("pointerdown", this.handlePointerDown);
    }

    private collapseAutocomplete() {
        const container = this.querySelector(".autocomplete-container")! as HTMLDivElement;
        clearChildren([container]);
        this.autocompleteOptions.splice(0);
        container.style.display = "none";
        // Used _currIndex instead of currIndex so selectOption isn't triggered.
        this._currIndex = -1;
    }

    private pruneCandidates(candidates: string[], pattern: string) {
        // Remove all candidates that don't match the input.
        const normalizedPattern = this.simplifyName(pattern);
        let i = 0;
        while (i < candidates.length) {
            const candidate = this.simplifyName(candidates[i]);
            if (candidate.indexOf(normalizedPattern) != -1) {
                i++;
                continue;
            }
            else {
                candidates.splice(i, 1);
                continue;
            }
        }

        if (candidates.length > this.maxAutofillEntries) {
            candidates.splice(this.maxAutofillEntries);
        }
    } 

    private sortCandidates(candidates: string[], pattern: string) {
        const normalizedPattern = this.simplifyName(pattern);
        return candidates.sort((a, b) => {
            const normalizedA = this.simplifyName(a);
            const normalizedB = this.simplifyName(b);

            // First sort by position of first pattern appearance.
            const indexDiff = this.firstIndex(normalizedA, normalizedPattern) - 
                this.firstIndex(normalizedB, normalizedPattern);

            if (indexDiff != 0) {
                return indexDiff;
            }

            // If that's equal sort by number of appearances.
            const occurenceDiff = this.countOccurrences(normalizedB, normalizedPattern) -
                this.countOccurrences(normalizedA, normalizedPattern);

            if (occurenceDiff != 0) {
                return occurenceDiff;
            }

            // If that's equal sort by length.
            return normalizedA.length - normalizedB.length;
        });
    }

    private firstIndex(str: string, pattern: string) {
        const i = str.indexOf(pattern);
        return i === -1 ? Infinity: i;
    }

    private countOccurrences(str: string, pattern: string) {
        return str.split(pattern).length - 1;
    }

    private formatAutocompleteName(searchBarValue: string, candidate: string): string {
        const normalizedCandidate = this.simplifyName(candidate);
        const normalizedValue = this.simplifyName(searchBarValue);
        const valueLength = normalizedValue.length;
        if (valueLength < 1) {
            return candidate;
        }

        // Get all occurences of the search bar value without overlaps.
        let patternStarts: number[] = [];
        let start = normalizedCandidate.indexOf(normalizedValue, 0);
        while (start != -1) {
            patternStarts.push(start);
            start = normalizedCandidate.indexOf(normalizedValue, start + valueLength);
        }

        if (patternStarts.length < 1) {
            return candidate;
        }

        let formattedName = "";
        let previousPatternEnd = 0;
        for (const patternStart of patternStarts) {
            const patternEnd = patternStart + valueLength;

            const prePattern = candidate.substring(previousPatternEnd, patternStart).replace(/\s/g, "&nbsp;");
            // Inherit color so the strong element still has the same color as the rest of the string.
            const pattern = `<strong style="color: inherit;">${
                candidate.substring(patternStart, patternEnd).replace(/\s/g, "&nbsp;")
            }</strong>`;

            formattedName += prePattern + pattern;
            previousPatternEnd = patternEnd;
        }
        const postPatterns = candidate.substring(previousPatternEnd).replace(/\s/g, "&nbsp;");;
        formattedName += postPatterns;

        return formattedName;
    }

    private manageKeyInput(e: KeyboardEvent) {
        if (e.key == "ArrowDown") {
            this.currIndex += 1;
        }
        else if (e.key == "ArrowUp") {
            this.currIndex -= 1;
        }
        else if (e.key == "Enter") {
            this.autofill();
            this.dispatchEvent(new Event(CharacterSearch.EVENT_FILLED));
        }
    } 

    private selectOptionByIndex() {
        if (
            this.autocompleteOptions.length <= 0 || 
            this.autocompleteOptions.length <= this.currIndex) 
        {
            return;
        }
        
        const option: HTMLDivElement = this.autocompleteOptions[this.currIndex];    
        if (this.prevOption) {
            this.prevOption.classList.remove("selected");
        }
        option.classList.add("selected");
        this.prevOption = option;
    }

    private selectOptionByClick(option: HTMLDivElement) {
        this.currIndex = this.autocompleteOptions.indexOf(option);
        this.autofill();
    }

    private autofill() {
        // Choose first option if no option has been chosen yet.
        if (this.currIndex < 0) {
            this.currIndex = 0;
        }

        if (this.currIndex >= this.autocompleteOptions.length) {
            return;
        }

        const searchBar: HTMLInputElement = this.getInput();
        const optionValue: string | null = 
            this.autocompleteOptions[this.currIndex].getAttribute("name");
        if (optionValue != null) {
            searchBar.value = optionValue;
        }
        this.collapseAutocomplete();
    }
    
    private getInput(): HTMLInputElement {
        return this.querySelector(".character-search-input") as HTMLInputElement;
    }

    private simplifyName(name: string) {
        const simplified = name
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "-"); // spaces to '-'
        return simplified;
    }

    public reset() {
        this.getInput().value = "";
        this.collapseAutocomplete();
        this.getInput().blur();
    }

    private render() {
        this.className = "character-search";

        const input = document.createElement("input") as HTMLInputElement;
        input.type = "text";
        input.className = "character-search-input";
        input.placeholder = "Search..."
        this.appendChild(input);

        const autocompleteContainer = document.createElement("div") as HTMLDivElement;
        autocompleteContainer.className = "autocomplete-container";
        this.appendChild(autocompleteContainer);
    }
}

namespace CharacterSearch {
    export interface CharacterBlockedDetail {
        name: string;
    }

    export interface CharacterFreedDetail {
        name: string;
    }
}

export default CharacterSearch;