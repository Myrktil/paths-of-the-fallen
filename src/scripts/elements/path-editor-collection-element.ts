import PathEditor from "./path-editor-element";
import Disposable from "../utils/disposable";
import Path from "../models/path";
import PathEditorReorderer from "../controllers/path-editor-reorderer";
import EditPath from "../models/edit-path";
import Pathlike from "../models/pathlike";
import { snapEndPoint, snapStartPoint, validateOrderFor, validateOrderFrom } from "../controllers/path-validator";
import { arrayMoveBetween, arrayMoveToPos } from "../utils/helpers";

class PathEditorCollection extends HTMLElement implements Disposable {
    private reorderer!: PathEditorReorderer;
    private wrapper!: HTMLDivElement;
    private editors: PathEditor[] = [];

    public static readonly EVENT_PROPERTY_CHANGED = "path-editor-collection:property-changed";
    public static readonly EVENT_ENDPOINT_TOOLTIP_EDITED = "path-editor-collection:endpoint-tooltip-edited";
    public static readonly EVENT_TOOLTIP_EDITED = "path-editor-collection:tooltip-edited";
    public static readonly EVENT_EDITOR_PUSHED = "path-editor-collection:editor-pushed";
    public static readonly EVENT_EDITOR_DELETED = "path-editor-collection:editor-deleted";
    public static readonly EVENT_PATHS_REORDERED = "path-editor-collection:paths-reordered";
    public static readonly ELEMENT_NAME = "path-editor-collection";

    public static init() {
        customElements.define(PathEditorCollection.ELEMENT_NAME, PathEditorCollection);
    }

    public static create(paths: EditPath[]) {
        const element = document.createElement(PathEditorCollection.ELEMENT_NAME) as PathEditorCollection;
        element.initialise(paths);
        return element;
    }

    constructor() {
        super();
    }

    private initialise(paths: EditPath[]) {
        this.classList.add(PathEditorCollection.ELEMENT_NAME, "no-select");

        const wrapper = document.createElement("div");
        wrapper.classList.add("path-editor-wrapper", "scrollable");
        this.appendChild(wrapper);
        this.wrapper = wrapper;

        this.initialiseEditors(paths);
    }

    private initialiseEditors(paths: EditPath[]) {
        for (const path of paths) {
            this.push(path);
        }
        // Reset scroll after pushes put it to the bottom.
        this.wrapper.scrollTop = 0;
        // Set last editor, which is still active from the push method, to inactive.
        const editorsLength = this.editors.length;
        if (editorsLength > 0) {
            this.editors[editorsLength - 1].setInactive();
        }
    }

    connectedCallback() {
        // Requires row gap in constructor.
        this.reorderer = new PathEditorReorderer(this, this.wrapper);
    }

    public get paths(): readonly Pathlike[] {
        return this.editors as Pathlike[];
    }

    public get readonlyEditors(): readonly PathEditor[] {
        return this.editors;
    }

    private addEditor(path: EditPath) {
        const editor = PathEditor.create(path);
        this.editors.push(editor);

        this.wrapper.appendChild(editor);

        editor.addEventListener(PathEditor.EVENT_DISPOSED, this.handleEditorDisposed);
        editor.addEventListener(PathEditor.EVENT_SET_ACTIVE, this.handleEditorSetActive);
        editor.addEventListener(PathEditor.EVENT_SELECT_BUTTON_DRAGGED, this.handleEditorDragged);
        editor.addEventListener(PathEditor.EVENT_PATH_DRAGGING_STOPPED, this.handlePathDraggingStopped);
        editor.addEventListener(PathEditor.EVENT_PROPERTY_CHANGED, this.handleEditorPropertyChanged);
        editor.addEventListener(PathEditor.EVENT_TOOLTIP_EDITED, this.handleTooltipEdit);
        editor.addEventListener(PathEditor.EVENT_ENDPOINT_TOOLTIP_EDITED, this.handleEndpointTooltipEdit);

        this.validateOrderFor(this.editors.length - 1);

        editor.setActive();
        return editor;
    }

    public insertAfterActive(path: EditPath) {
        let editor: PathEditor;
        const previousActiveEditorIndex = this.getActiveEditorIndex();
        if (previousActiveEditorIndex >= 0) {
            editor = this.addEditor(path);
            this.moveToPosition(editor, previousActiveEditorIndex + 1);
            this.validateOrderFrom(previousActiveEditorIndex);

            if (previousActiveEditorIndex == this.editors.length - 2) {
                this.wrapper.scrollTop = this.wrapper.scrollHeight;
            }
        }
        else {
            editor = this.push(path);
        }

        const event = new CustomEvent<PathEditorCollection.EditorPushedDetail>(
            PathEditorCollection.EVENT_EDITOR_PUSHED, { detail: { editor: editor } }
        );
        this.dispatchEvent(event);
    }

    public push(path: EditPath) {
        const editor = this.addEditor(path);
            
        this.wrapper.scrollTop = this.wrapper.scrollHeight;
        const event = new CustomEvent<PathEditorCollection.EditorPushedDetail>(
            PathEditorCollection.EVENT_EDITOR_PUSHED, { detail: { editor: editor } }
        );
        this.dispatchEvent(event);

        return editor;
    }

    private delete(editor: PathEditor) {
        const index = this.editors.indexOf(editor);
        if (index < 0) {
            return;
        }

        // Simulate the end of section disappearing to proc any checks that should run in that case.
        if (editor.isEndOfSection) {
            editor.isEndOfSection = false;
        }

        this.editors.splice(index, 1);
        editor.dispose();

        this.removeListenersFromEditor(editor);
        this.validateOrderFrom(index);

        const event = new Event(PathEditorCollection.EVENT_EDITOR_DELETED);
        this.dispatchEvent(event);
    }

    public clear() {
        while (this.editors.length > 0) {
            this.editors[0].dispose();
        }

        this.editors = [];
    }

    public moveToPosition(editor: PathEditor, index: number) {
        const oldIndex = this.editors.indexOf(editor);

        if (index == oldIndex) {
            return;
        }

        arrayMoveToPos(this.editors, this.editors.indexOf(editor), index);

        this.validateOrderFrom(0);

        this.dispatchEvent(new Event(PathEditorCollection.EVENT_PATHS_REORDERED));
    }

    public moveBetween(editor: PathEditor, beforeIndex: number, afterIndex: number) {
        const oldIndex = this.editors.indexOf(editor);

        if (beforeIndex == oldIndex - 1 || afterIndex == oldIndex + 1) {
            return;
        }

        arrayMoveBetween(this.editors, oldIndex, beforeIndex, afterIndex);

        this.validateOrderFrom(0);

        this.dispatchEvent(new Event(PathEditorCollection.EVENT_PATHS_REORDERED));
    }

    public getActiveEditorIndex() {
        let index = -1;
        for (const previousEditor of this.editors) {
            if (previousEditor.isActive) {
                index = previousEditor.pathId;
            }
        }
        return index;
    }

    private validateOrderFrom(index: number) {
        validateOrderFrom(index, this.editors);
        this.validateVisualOrder();
    }

    private validateOrderFor(index: number) {
        validateOrderFor(index, this.editors);
        this.validateVisualOrder();
    }

    private handleEditorDisposed = (e: Event) => {
        if (!(e.currentTarget instanceof PathEditor)) {
            return;
        }
        this.delete(e.currentTarget);
    }

    private handleEditorDragged = (e: Event) => {
        const event = e as CustomEvent<PathEditor.SelectButtonDraggedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditor.EVENT_SELECT_BUTTON_DRAGGED + " event.");
            return;
        }
        if (e.currentTarget instanceof PathEditor) {
            this.reorderer.startDrag(event.detail.pointerEvent, e.currentTarget);
        }
    }

    private handleEditorSetActive = (e: Event) => {
        if (!(e.currentTarget instanceof PathEditor)) {
            return;
        }

        for (const editor of this.editors) {
            if (editor != e.currentTarget && editor) {
                editor.setInactive();
            }
        }
    }

    private handlePathDraggingStopped = (e: Event) => {
        if (!(e.currentTarget instanceof PathEditor)) {
            return;
        }

        snapStartPoint(e.currentTarget, this.editors);
        snapEndPoint(e.currentTarget, this.editors);
    }

    private handleEditorPropertyChanged = (e: Event) => {
        const event = e as CustomEvent<PathEditor.PropertyChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditor.EVENT_PROPERTY_CHANGED + " event.");
            return;
        }

        if (!(event.currentTarget instanceof PathEditor)) {
            return;
        }
        
        switch (event.detail.property) {
            case Path.Property.ID:
                this.validateOrderFrom(this.editors.indexOf(event.currentTarget));
                break;
            case Path.Property.IS_END_OF_SECTION:
                this.validateOrderFrom(this.editors.indexOf(event.currentTarget));
                break;
        }

        const payload = { editor: event.currentTarget, property: event.detail.property };
        const nextEvent = new CustomEvent<PathEditorCollection.PropertyChangedDetail>(
            PathEditorCollection.EVENT_PROPERTY_CHANGED, { detail: payload }
        );
        this.dispatchEvent(nextEvent);
    }

    private handleTooltipEdit = (e: Event) => {
        const event = e as CustomEvent<PathEditor.TooltipEditedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditor.EVENT_TOOLTIP_EDITED + " event.");
            return;
        }

        this.dispatchEvent(
            new CustomEvent<PathEditorCollection.TooltipEditedDetail>(
                PathEditorCollection.EVENT_TOOLTIP_EDITED, { detail: event.detail }
            )
        );
    }

    private handleEndpointTooltipEdit = (e: Event) => {
        const event = e as CustomEvent<PathEditor.EndpointTooltipEditedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditor.EVENT_ENDPOINT_TOOLTIP_EDITED + " event.");
            return;
        }

        this.dispatchEvent(
            new CustomEvent<PathEditorCollection.EndpointTooltipEditedDetail>(
                PathEditorCollection.EVENT_ENDPOINT_TOOLTIP_EDITED, { detail: event.detail }
            )
        );
    }

    private validateVisualOrder() {
        for (let i = 0; i < this.editors.length; i++) {
            this.editors[i].style.order = i.toString();
        }
    }

    private removeListenersFromEditor(editor: PathEditor) {
        editor.removeEventListener(PathEditor.EVENT_DISPOSED, this.handleEditorDisposed);
        editor.removeEventListener(PathEditor.EVENT_SET_ACTIVE, this.handleEditorSetActive);
        editor.removeEventListener(PathEditor.EVENT_SELECT_BUTTON_DRAGGED, this.handleEditorDragged);
        editor.removeEventListener(PathEditor.EVENT_PATH_DRAGGING_STOPPED, this.handlePathDraggingStopped);
        editor.removeEventListener(PathEditor.EVENT_PROPERTY_CHANGED, this.handleEditorPropertyChanged);
        editor.removeEventListener(PathEditor.EVENT_TOOLTIP_EDITED, this.handleTooltipEdit);
        editor.removeEventListener(PathEditor.EVENT_ENDPOINT_TOOLTIP_EDITED, this.handleEndpointTooltipEdit);
    }

    public dispose() {
        while (this.editors.length > 0) {
            this.delete(this.editors[0]);
        }
        this.reorderer.dispose();
        this.remove();
    }
}

namespace PathEditorCollection {
    export interface PropertyChangedDetail {
        editor: PathEditor;
        property: Path.Property;
    }

    export interface EditorPushedDetail {
        editor: PathEditor;
    }

    export interface TooltipEditedDetail {
        section: number;
    }

    export interface EndpointTooltipEditedDetail {
        section: number;
    }
}

export default PathEditorCollection;