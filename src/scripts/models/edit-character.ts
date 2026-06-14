import { JsonPath, loadCharacter } from "../data/data-manager";
import Character from "./character";
import PathEditorCollection from "../elements/path-editor-collection-element";
import EditPath from "./edit-path";
import Path from "./path";
import PathEditor from "../elements/path-editor-element";
import Tooltips from "./tooltips";
import Pathlike from "./pathlike";

export default class EditCharacter extends Character {
    protected tooltips: Tooltips;
    private _pathEditorCollection: PathEditorCollection;
    private tooltipDecisionPending = false;

    static async load(name: string): Promise<Character | null> {
        const character = await loadCharacter(name);
        if (character.paths.length <= 0) {
            return null;
        }
        else {
            return new EditCharacter(name, character.paths, character.tooltips);
        }
    }
    
    static create(name: string): Character {
        return new EditCharacter(name, [], []);
    }

    constructor(name: string, jsonPaths: JsonPath[], tooltips: Tooltips.Tooltip[]) {
        super(name);
        this.tooltips = new Tooltips(tooltips);

        const parsedPaths: EditPath[] = [];
        for (const jsonPath of jsonPaths) {
            const path = jsonPath.convertToEditPath([this.drawGroupName]);
            parsedPaths.push(path);

            if (path.book > this.maxBook) {
                this.maxBook = path.book;
            }
        };
        const collection = PathEditorCollection.create(parsedPaths);

        collection.addEventListener(
            PathEditorCollection.EVENT_PROPERTY_CHANGED,
            this.handlePathPropertyChanged
        );
        collection.addEventListener(
            PathEditorCollection.EVENT_EDITOR_PUSHED,
            this.handlePathAdded
        );
        collection.addEventListener(
            PathEditorCollection.EVENT_EDITOR_DELETED,
            this.handlePathDeleted
        );
        collection.addEventListener(
            PathEditorCollection.EVENT_PATHS_REORDERED,
            this.handlePathsReordered
        );
        collection.addEventListener(
            PathEditorCollection.EVENT_TOOLTIP_EDITED,
            this.handleCurveTooltipEdit
        );
        collection.addEventListener(
            PathEditorCollection.EVENT_ENDPOINT_TOOLTIP_EDITED,
            this.handleEndpointTooltipEdit
        );

        this._pathEditorCollection = collection;
    }

    public get paths() {
        return this.pathEditorCollection.paths;
    }

    public get pathEditorCollection(): PathEditorCollection {
        return this._pathEditorCollection;
    }

    private trimTooltips() {
        // Trimming while a decision on tooltips is still pending can delete tooltips that would
        // still be used after the decision.
        if (this.tooltipDecisionPending) {
            return;
        }

        if (this.paths.length > 0) {
            let lastSection = this.paths[this.paths.length - 1].sectionId;
            this.tooltips.trimFrom(lastSection + 1);
        }
        else {
            this.tooltips.trimFrom(0);
        }
    }
    
    private handleMaxBookChanged = () => {
        let max = 1;
        for (const path of this.paths) {
            if (path.book > max) {
                max = path.book;
            }
        }
        this.maxBook = max;

        // Reclamp max book value and emit changed event for data binding.
        this.endBook = this.endBook;
    }

    private handlePathPropertyChanged = (e: Event) => {
        const event = e as CustomEvent<PathEditorCollection.PropertyChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditorCollection.EVENT_PROPERTY_CHANGED + " event.");
            return;
        }

        switch (event.detail.property) {
            case Path.Property.SECTION_ID:
            case Path.Property.STYLE:
            case Path.Property.COLOR:
            case Path.Property.WIDTH:
            case Path.Property.POSITION:
            case Path.Property.IS_ACTIVE:
                this.updatePath(event.detail.editor);
                break;
            case Path.Property.BOOK:
                this.handleMaxBookChanged();
                this.updatePath(event.detail.editor);
                break;
            case Path.Property.IS_END_OF_SECTION:
                this.handleEndOfSectionChanged(event.detail.editor);
        }
    }

    private handleEndOfSectionChanged(editor: PathEditor) {
        const newValue = editor.isEndOfSection;
        if (this.paths.length < 1 ||
            editor.pathId >= this.paths[this.paths.length - 1].pathId) 
        {
            return;
        } 

        this.tooltipDecisionPending = true;
        if (newValue) {
            this.tooltips.addTooltipAt(editor.sectionId).then(
                () => { 
                    this.tooltipDecisionPending = false; 
                    this.trimTooltips();
                } 
            );
        }
        else {
            this.tooltips.removeTooltipAt(editor.sectionId).then(
                () => { 
                    this.tooltipDecisionPending = false; 
                    this.trimTooltips();
                } 
            );
        }

        this.dispatchEvent(Character.createChangedEvent(Character.Property.MAX_SECTION));
    }

    private handlePathAdded = (e: Event) => {
        const event = e as CustomEvent<PathEditorCollection.EditorPushedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditorCollection.EVENT_EDITOR_PUSHED + " event.");
            return;
        }

        if (this.allowsDisplayOf(event.detail.editor)) {
            event.detail.editor.draw();
        }

        this.handleMaxBookChanged();
        this.dispatchEvent(Character.createChangedEvent(Character.Property.MAX_SECTION));
    }

    private handlePathDeleted = () => {
        this.dispatchEvent(Character.createChangedEvent(Character.Property.MAX_SECTION));
        this.trimTooltips();
        this.handleMaxBookChanged();
    }

    private handlePathsReordered = (e: Event) => {
        this.dispatchEvent(Character.createChangedEvent(Character.Property.MAX_SECTION));
        this.trimTooltips();
    }

    private handleCurveTooltipEdit = (e: Event) => {
        const event = e as CustomEvent<PathEditorCollection.TooltipEditedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditorCollection.EVENT_TOOLTIP_EDITED + " event.");
            return;
        }

        this.tooltips.editTooltipAt(event.detail.section, Tooltips.TooltipType.CURVE);
    }

    private handleEndpointTooltipEdit = (e: Event) => {
        const event = e as CustomEvent<PathEditorCollection.EndpointTooltipEditedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + PathEditorCollection.EVENT_ENDPOINT_TOOLTIP_EDITED + " event.");
            return;
        }

        this.tooltips.editTooltipAt(event.detail.section, Tooltips.TooltipType.END_POINT);
    }

    private updatePath(path: Pathlike) {
        if (this.allowsDisplayOf(path)) {
            path.draw();
        }
        else {
            path.undraw();
        }
    }

    public dispose() {
        super.dispose();

        // Remove event listeners that could cause redraws before garabge collection.
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_EDITOR_DELETED, this.handlePathDeleted
        );
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_PATHS_REORDERED, this.handlePathsReordered
        );
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_PROPERTY_CHANGED, this.handlePathPropertyChanged
        );
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_EDITOR_PUSHED, this.handlePathAdded
        );
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_TOOLTIP_EDITED, this.handleCurveTooltipEdit
        );
        this.pathEditorCollection.removeEventListener(
            PathEditorCollection.EVENT_ENDPOINT_TOOLTIP_EDITED, this.handleEndpointTooltipEdit
        );

        this.pathEditorCollection.dispose();
    }

    public toJSON() {
        this.trimTooltips();
        return {
            paths: this.paths,
            tooltips: this.tooltips.toJSON()
        }
    }
}