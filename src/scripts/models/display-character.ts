import { displayTooltip } from "../controllers/tooltip-displayer";
import { JsonPath, loadCharacter } from "../data/data-manager";
import { LineStyle } from "../map/map-drawer";
import Character from "./character";
import DisplayPath from "./display-path";
import Tooltips from "./tooltips";

export default class DisplayCharacter extends Character {
    private _spoilerProtectionActivated = false;
    private readonly spoilerProtectedPaths: readonly DisplayPath[];
    private readonly dbPaths: readonly DisplayPath[];
    protected readonly tooltips: Tooltips;

    static async load(name: string): Promise<Character | null> {
        const character = await loadCharacter(name);
        if (character.paths.length <= 0) {
            return null;
        }
        else {
            return new DisplayCharacter(name, character.paths, character.tooltips);
        }
    }
    
    static create(name: string): Character {
        return new DisplayCharacter(name, [], []);
    }

    constructor(name: string, jsonPaths: JsonPath[], tooltips: Tooltips.Tooltip[]) {
        super(name);

        this.tooltips = new Tooltips(tooltips);

        const parsedPaths: DisplayPath[] = [];
        for (const jsonPath of jsonPaths) {
            const path = jsonPath.convertToDisplayPath([this.drawGroupName]);
            parsedPaths.push(path);
            
            if (path.book > this.maxBook) {
                this.maxBook = path.book;
            }
        };
        this.dbPaths = parsedPaths;
        this.spoilerProtectedPaths = this.spoilerProtect(this.paths);

        for (const path of this.dbPaths) {
            path.addEventListener(DisplayPath.EVENT_CURVE_CLICKED, this.handlePathCurvePointerDown);
            path.addEventListener(DisplayPath.EVENT_POINT_CLICKED, this.handlePathPointPointerDown);
        }
    }

    public get paths(): readonly DisplayPath[] {
        if (this.spoilerProtectionActivated) {
            return this.spoilerProtectedPaths;
        }
        else {
            return this.dbPaths;
        }
    }

    private get spoilerProtectionActivated() {
        return this._spoilerProtectionActivated;
    }

    private set spoilerProtectionActivated(value: boolean) {
        this._spoilerProtectionActivated = value;
        this.dispatchEvent(Character.createChangedEvent(
            Character.Property.MAX_SECTION
        ));
        // Clamp endbook to new maxEndBook values after paths have been added or removed.
        this.endBook = this.endBook;
    }

    private spoilerProtect(paths: readonly DisplayPath[]) {
        if (paths.length <= 0) {
            return [];
        }

        // Add a path to increase max book and section so character deaths can't be confered from
        // getting close to the last section or the max end book.
        const protectedPaths = Array.from(paths);
        let id;
        let section;
        let book = this.maxBook + 90 + Math.floor(Math.random() * 20);
        
        const pathsLength = paths.length;
        if (pathsLength > 0) {
            const lastPath = paths[pathsLength - 1];
            id = lastPath.pathId + 1;
            section = lastPath.sectionId + 20;
        }
        else {
            id = 0;
            section =20;
        }

        const path = new DisplayPath(
            id, section, false, LineStyle.FULL, "#000000", book, 0,
            -10, -10, -10, -10, -10, -10, -10, -10,
            [this.drawGroupName],
        );
        protectedPaths.push(path);

        return protectedPaths;
    }

    public activateSpoilerProtection() {
        this.spoilerProtectionActivated = true;
        this.startingBook = 1;
        this.endBook = 1;
        this.endSection = 0;
        this.restrictBySection = true;

        let max = 1;
        for (const path of this.paths) {
            if (path.book > max) {
                max = path.book;
            }
        }
        this.maxBook = max;
    }

    public deactivateSpoilerProtection() {
        this.spoilerProtectionActivated = false;
        this.endSection = 0;
        this.restrictBySection = false;

        let max = 1;
        for (const path of this.paths) {
            if (path.book > max) {
                max = path.book;
            }
        }
        this.maxBook = max;
        this.endBook = this.maxBook;
    }

    private handlePathCurvePointerDown = (e: Event) => {
        const event = e as CustomEvent<DisplayPath.CurveClickedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + DisplayPath.EVENT_CURVE_CLICKED + " event.");
            return;
        }

        if (e instanceof Event && e.currentTarget instanceof DisplayPath) {
            displayTooltip(
                event.detail.pointerEvent, 
                this.tooltips.getTooltipsAt(e.currentTarget.sectionId).curve
            );
        }
    }

    private handlePathPointPointerDown = (e: Event) => {
        const event = e as CustomEvent<DisplayPath.PointClickedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + DisplayPath.EVENT_POINT_CLICKED + " event.");
            return;
        }

        if (e instanceof Event && e.currentTarget instanceof DisplayPath) {
            displayTooltip(
                event.detail.pointerEvent, 
                this.tooltips.getTooltipsAt(e.currentTarget.sectionId).endPoint
            );
        }
    }

    public dispose() {
        super.dispose();
        for (const path of this.paths) {
            path.dispose();
            path.removeEventListener(DisplayPath.EVENT_CURVE_CLICKED, this.handlePathCurvePointerDown);
            path.removeEventListener(DisplayPath.EVENT_POINT_CLICKED, this.handlePathPointPointerDown);
        }
    }
}