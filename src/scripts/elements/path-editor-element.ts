import { LineStyle } from "../map/map-drawer";
import EditPath from "../models/edit-path";
import EditPathlike from "../models/edit-pathlike";
import Path from "../models/path";
import Pathlike from "../models/pathlike";
import { DRAG_DURATION } from "../utils/constants";
import Disposable from "../utils/disposable";

class PathEditor extends HTMLElement implements Disposable, EditPathlike, Pathlike {
    private delegatePath!: EditPath;
    // Which input changes which path property.
    private readonly inputs: Map<Path.Property, HTMLElement> = new Map();
    public static readonly EVENT_SELECT_BUTTON_DRAGGED = "path-editor:select-button-dragged";
    public static readonly EVENT_ENDPOINT_TOOLTIP_EDITED = "path-editor:endpoint-tooltip-edited";
    public static readonly EVENT_TOOLTIP_EDITED = "path-editor:tooltip-edited";
    public static readonly EVENT_PROPERTY_CHANGED = "path-editor:property-changed";
    public static readonly EVENT_PATH_DRAGGING_STOPPED = "path-editor:path-dragging-stopped";
    public static readonly EVENT_SET_ACTIVE = "path-editor:set-active";
    public static readonly EVENT_DISPOSED = "path-editor:disposed";
    public static readonly ELEMENT_NAME = "path-editor";
    private static readonly activeClass = "selected";

    public static init() {
        customElements.define(PathEditor.ELEMENT_NAME, PathEditor);
    }

    public static create(path: EditPath) {
        const element = document.createElement(PathEditor.ELEMENT_NAME) as PathEditor;
        element.initialise(path);
        return element;
    }

    constructor() {
        super();
    }

    private initialise(path: EditPath) {
        this.delegatePath = path;
    }

    public connectedCallback() {
        this.render();
        // Wait until ui elements have been rendered before attaching data binding events.
        this.delegatePath.addEventListener(
            EditPath.EVENT_PROPERTY_CHANGED, 
            this.handlePathPropertyChange
        );
        this.delegatePath.addEventListener(
            EditPath.EVENT_DRAGGING_STOPPED, 
            this.handlePathDraggingStopped
        );
    }

    public get pathId() {
        return this.delegatePath.pathId;
    }

    public get sectionId() {
        return this.delegatePath.sectionId;
    }

    public get isEndOfSection() {
        return this.delegatePath.isEndOfSection;
    }

    public get lineStyle() {
        return this.delegatePath.lineStyle;
    }

    public get color() {
        return this.delegatePath.color;
    }

    public get book() {
        return this.delegatePath.book;
    }

    public get width() {
        return this.delegatePath.width;
    }

    public get startPointX() {
        return this.delegatePath.startPointX;
    }

    public get startPointY() {
        return this.delegatePath.startPointY;
    }

    public get controlPoint0X() {
        return this.delegatePath.controlPoint0X;
    }

    public get controlPoint0Y() {
        return this.delegatePath.controlPoint0Y;
    }

    public get controlPoint1X() {
        return this.delegatePath.controlPoint1X;
    }

    public get controlPoint1Y() {
        return this.delegatePath.controlPoint1Y;
    }

    public get endPointX() {
        return this.delegatePath.endPointX;
    }

    public get endPointY() {
        return this.delegatePath.endPointY;
    }

    public get drawUntil() {
        return this.delegatePath.drawUntil;
    }

    public get length() {
        return this.delegatePath.length;
    }

    public get isActive() {
        return this.classList.contains(PathEditor.activeClass);
    }

    public set pathId(value: number) {
        this.delegatePath.pathId = value;
    }

    public set sectionId(value: number) {
        this.delegatePath.sectionId = value;
    }

    public set isEndOfSection(value: boolean) {
        this.delegatePath.isEndOfSection = value;
    }

    public set lineStyle(value: LineStyle) {
        this.delegatePath.lineStyle = value;
    }

    public set color(value: string) {
        this.delegatePath.color = value;
    }

    public set book(value: number) {
        this.delegatePath.book = value;
    }

    public set width(value: number) {
        this.delegatePath.width = value;
    }

    public set startPointX(value: number) {
        this.delegatePath.startPointX = value;
    }

    public set startPointY(value: number) {
        this.delegatePath.startPointY = value;
    }

    public set controlPoint0X(value: number) {
        this.delegatePath.controlPoint0X = value;
    }

    public set controlPoint0Y(value: number) {
        this.delegatePath.controlPoint0Y = value;
    }

    public set controlPoint1X(value: number) {
        this.delegatePath.controlPoint1X = value;
    }

    public set controlPoint1Y(value: number) {
        this.delegatePath.controlPoint1Y = value;
    }

    public set endPointX(value: number) {
        this.delegatePath.endPointX = value;
    }

    public set endPointY(value: number) {
        this.delegatePath.endPointY = value;
    }

    public set drawUntil(value: number) {
        this.delegatePath.drawUntil = value;
    }

    private handlePathPropertyChange = (e: Event) => {
        const event = e as CustomEvent<Path.PropertyChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + Path.EVENT_PROPERTY_CHANGED + " event.");
            return;
        }

        let input: HTMLInputElement | undefined;
        switch (event.detail.property) {
            case Path.Property.STYLE:
                input = this.inputs.get(event.detail.property) as HTMLInputElement | undefined;
                if (!input) {
                    console.error("Failed to access input for property " + event.detail.property);
                    break;
                }
                let style = (this.delegatePath.lineStyle as number).toString();
                if (input.value != style) {
                    input.value = style;
                }
                break;
            case Path.Property.COLOR:
                input = this.inputs.get(event.detail.property) as HTMLInputElement | undefined;
                if (!input) {
                    console.error("Failed to access input for property " + event.detail.property);
                    break;
                }
                let color = this.delegatePath.color;
                if (input.value != color) {
                    input.value = color;
                }
                break;
            case Path.Property.BOOK:
                input = this.inputs.get(event.detail.property) as HTMLInputElement | undefined;
                if (!input) {
                    console.error("Failed to access input for property " + event.detail.property);
                    break;
                }
                let book = this.delegatePath.book.toString();
                if (input.value != book) {
                    input.value = book;
                }
                break;
            case Path.Property.WIDTH:
                input = this.inputs.get(event.detail.property) as HTMLInputElement | undefined;
                if (!input) {
                    console.error("Failed to access input for property " + event.detail.property);
                    break;
                }
                let width = this.delegatePath.width.toString();
                if (input.value != width) {
                    input.value = width;
                }
                break;
            case Path.Property.IS_END_OF_SECTION:
                input = this.inputs.get(event.detail.property) as HTMLInputElement | undefined;
                if (!input) {
                    console.error("Failed to access input for property " + event.detail.property);
                    break;
                }
                let isEndOfSection = this.delegatePath.isEndOfSection;
                if (input.checked != isEndOfSection) {
                    input.checked = isEndOfSection;
                }
                break;
            case Path.Property.IS_ACTIVE:
                let isActive = this.delegatePath.isActive;
                if (isActive) {
                    this.setActive();
                }
                else {
                    this.setInactive();
                }
                break;
        }
        
        const nextEvent = new CustomEvent<PathEditor.PropertyChangedDetail>(
            PathEditor.EVENT_PROPERTY_CHANGED, { detail: event.detail }
        );
        this.dispatchEvent(nextEvent);
    }

    private handlePathDraggingStopped = () => {
        this.dispatchEvent(new Event(PathEditor.EVENT_PATH_DRAGGING_STOPPED));
    }

    public setActive() {
        this.classList.add(PathEditor.activeClass);
        this.delegatePath.setActive();
        const event = new Event(PathEditor.EVENT_SET_ACTIVE);
        this.dispatchEvent(event);
    }

    public setInactive() {
        this.classList.remove(PathEditor.activeClass);
        this.delegatePath.setInactive();
    }

    public draw() {
        this.delegatePath.draw();
    }

    public undraw() {
        this.delegatePath.undraw();
    }

    public dispose() {
        this.dispatchEvent(new Event(PathEditor.EVENT_DISPOSED));
        this.delegatePath.dispose();
        this.remove();
    }

    public toJSON() {
        return this.delegatePath.toJSON();
    }

    private render() {
        this.classList.add(PathEditor.ELEMENT_NAME);
        this.style.top = "0px";

        const selectButton = document.createElement("button");
        selectButton.classList.add("drag-button");
        selectButton.classList.add("path-editor-input");
        selectButton.type = "button";
        let mouseDownTimerId: number;
        selectButton.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            this.setActive();
            mouseDownTimerId = setTimeout(() => {
                const event = new CustomEvent<PathEditor.SelectButtonDraggedDetail>(
                    PathEditor.EVENT_SELECT_BUTTON_DRAGGED, { detail: { pointerEvent: e} } );
                this.dispatchEvent(event);
            }, DRAG_DURATION);
        }, { passive: false });
        selectButton.addEventListener("pointerup", () => {
            clearTimeout(mouseDownTimerId);
        });
        // Prevent scrolling on safari.
        selectButton.addEventListener("touchstart", (e) => {
            e.preventDefault();
        }, { passive: false });
        this.appendChild(selectButton);

        const lineButton = document.createElement("input");
        lineButton.classList.add("color-input");
        lineButton.classList.add("path-editor-input");
        lineButton.type = "color";
        lineButton.addEventListener("change", () => {
            this.setActive();
            this.delegatePath.color = lineButton.value;
        });
        lineButton.value = this.delegatePath.color;
        this.appendChild(lineButton);
        this.inputs.set(Path.Property.COLOR, lineButton);

        const styleSelector = document.createElement("select");
        styleSelector.classList.add("style-selector");
        styleSelector.classList.add("path-editor-input");
        styleSelector.addEventListener("pointerdown", () => {
            this.setActive();
        })
        styleSelector.addEventListener("change", () => {
            this.delegatePath.lineStyle = parseInt(styleSelector.value);
        });
        this.appendChild(styleSelector);
        this.inputs.set(Path.Property.STYLE, styleSelector);

        const option0 = document.createElement("option");
        option0.value = "0";
        option0.innerHTML = LineStyle[0];
        styleSelector.appendChild(option0);

        const option1 = document.createElement("option");
        option1.value = "1";
        option1.innerHTML = LineStyle[1];
        styleSelector.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = "2";
        option2.innerHTML = LineStyle[2];
        styleSelector.appendChild(option2);

        // Set this property after all options have been initialised.
        styleSelector.selectedIndex = this.delegatePath.lineStyle;

        const widthInput = document.createElement("input");
        widthInput.classList.add("width-input");
        widthInput.classList.add("path-editor-input");
        widthInput.value = this.delegatePath.width.toString();
        widthInput.addEventListener("change", () => {
            this.delegatePath.width = parseFloat(widthInput.value);
            this.setActive();
        });
        widthInput.addEventListener("focus", () => {
            widthInput.select();
        });
        this.appendChild(widthInput);
        this.inputs.set(Path.Property.WIDTH, widthInput);

        const bookInput = document.createElement("input");
        bookInput.classList.add("book-input");
        bookInput.classList.add("path-editor-input");
        bookInput.value = this.delegatePath.book.toString();
        bookInput.addEventListener("change", () => {
            this.delegatePath.book = parseInt(bookInput.value);
            this.setActive();
        });
        bookInput.addEventListener("focus", () => {
            bookInput.select();
        });
        this.appendChild(bookInput);
        this.inputs.set(Path.Property.BOOK, bookInput);

        const endOfSectionInput = document.createElement("input");
        endOfSectionInput.classList.add(
            "end-of-section-input", 
            "path-editor-input",
            "custom-checkbox",
            "rect",
            "bright"
        );
        endOfSectionInput.type = "checkbox";
        endOfSectionInput.checked = this.delegatePath.isEndOfSection;
        endOfSectionInput.addEventListener("change", () => {
            this.delegatePath.isEndOfSection = endOfSectionInput.checked;
            this.setActive();
        });
        this.appendChild(endOfSectionInput);
        this.inputs.set(Path.Property.IS_END_OF_SECTION, endOfSectionInput);

        const tooltipButton = document.createElement("button");
        tooltipButton.classList.add("tooltip-button");
        tooltipButton.classList.add("path-editor-input");
        tooltipButton.type = "button";
        tooltipButton.innerHTML = "Tooltip";
        tooltipButton.onclick = () => {
            this.dispatchEvent(
                new CustomEvent<PathEditor.TooltipEditedDetail>(
                    PathEditor.EVENT_TOOLTIP_EDITED, { detail: { section: this.sectionId } }
                )
            );
            this.setActive();
        };
        this.appendChild(tooltipButton);

        const endPointTooltipButton = document.createElement("button");
        endPointTooltipButton.classList.add("tooltip-button");
        endPointTooltipButton.classList.add("path-editor-input");
        endPointTooltipButton.type = "button";
        endPointTooltipButton.innerHTML = "Endpoint";
        endPointTooltipButton.onclick = () => {
            this.dispatchEvent(
                new CustomEvent<PathEditor.EndpointTooltipEditedDetail>(
                    PathEditor.EVENT_ENDPOINT_TOOLTIP_EDITED, { detail: { section: this.sectionId } }
                )
            );
            this.setActive();
        };
        this.appendChild(endPointTooltipButton);

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("path-delete-button");
        deleteButton.classList.add("path-editor-input");     
        deleteButton.type = "button";
        deleteButton.innerHTML = "Delete";
        deleteButton.onclick = () => {
            this.dispose();
        };
        this.appendChild(deleteButton);
    }
}

namespace PathEditor {
    export interface PropertyChangedDetail {
        property: Path.Property;
    }

    export interface SelectButtonDraggedDetail {
        pointerEvent: PointerEvent;
    }

    export interface TooltipEditedDetail {
        section: number;
    }

    export interface EndpointTooltipEditedDetail {
        section: number;
    }
}

export default PathEditor;
