import { LineStyle, undrawElementsInGroup } from "../map/map-drawer";
import Disposable from "../utils/disposable";
import { distance } from "../utils/helpers";
import Pathlike from "./pathlike";

abstract class Path extends EventTarget implements Disposable, Pathlike {
    protected _id: number; // Starts at 0.
    protected _sectionId: number; // Starts at 0.
    protected _isEndOfSection: boolean;
    protected _style: LineStyle;
    protected _color: string;
    protected _book: number;
    protected _width: number;
    private _drawUntil = -1; // drawUntil < 0 means to draw without restriction.
    // Reapproximating length is expensive so it should not be done continuously (eg when dragging 
    // control points). Setting this to true recalculates length the next time it is accessed.
    protected isDrawn = false;
    protected readonly pointRadiusToCurveWidthRatio = 1.4;
    private static _counter = 0; // Used to give each path a unique id for it's drawn elements.
    protected readonly drawGroupIds: readonly string[];
    protected readonly drawGroupId: string;
    public static readonly EVENT_PROPERTY_CHANGED = "path:property-changed";

    constructor(
        id: number, 
        sectionId: number,
        isEndOfSection: boolean,
        style: number,
        color: string,
        book: number,
        width: number,
        parentGroupIds: string[] | undefined = undefined,
    ) {
        super();
        Path._counter++;

        this._id = id;
        this._sectionId = sectionId;
        this._isEndOfSection = isEndOfSection;
        this._style = style;
        this._color = color;
        this._book = book;
        this._width = width;
        this.drawGroupId = `path-${Path._counter}`;
        if (parentGroupIds) {
            const ids = parentGroupIds;
            ids.push(this.drawGroupId);
            this.drawGroupIds = ids;
        }
        else {
            this.drawGroupIds = [this.drawGroupId];
        }
    }

    public get pathId() {
        return this._id;
    }

    public get sectionId() {
        return this._sectionId;
    }

    public get isEndOfSection() {
        return this._isEndOfSection;
    }

    public get lineStyle() {
        return this._style;
    }

    public get color() {
        return this._color;
    }

    public get book() {
        return this._book;
    }

    public get width() {
        return this._width;
    }

    public abstract get startPointX(): number;
    public abstract get startPointY(): number;
    public abstract get endPointX(): number;
    public abstract get endPointY(): number;
    public abstract get controlPoint0X(): number;
    public abstract get controlPoint0Y(): number;
    public abstract get controlPoint1X(): number;
    public abstract get controlPoint1Y(): number;

    public abstract get length(): number;

    public get drawUntil() {
        return this._drawUntil;
    }

    protected static get counter() {
        return Path._counter;
    }

    // Is the path only partially or fully displayed?
    public get isCompletelyDisplayed() {
        const epsilon = 1e-5;
        return (
            this.drawUntil < 0 ||
            Math.abs(this.length - this.drawUntil) < epsilon
        );
    }

    public set drawUntil(value: number) {
        this._drawUntil = value;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.DRAW_UNTIL));
    }

    // Faster than path.getTotalLength() while still accurate enough.
    protected approximateLength(segmentCount: number = 4000) {
        let length = 0;
        let prevPoint = { x: this.startPointX, y: this.startPointY };

        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const currPoint = this.calcPointOnCurve(t);
            length += distance(prevPoint, currPoint);
            prevPoint = currPoint;
        }

        return length;
    }

    private calcPointOnCurve(t: number) {
        const x = Math.pow(1 - t, 3) * this.startPointX + 
            3 * Math.pow(1 - t, 2) * t * this.controlPoint0X + 
            3 * (1 - t) * Math.pow(t, 2) * this.controlPoint1X + 
            Math.pow(t, 3) * this.endPointX;
        const y = Math.pow(1 - t, 3) * this.startPointY + 
            3 * Math.pow(1 - t, 2) * t * this.controlPoint0Y + 
            3 * (1 - t) * Math.pow(t, 2) * this.controlPoint1Y + 
            Math.pow(t, 3) * this.endPointY;
        
        return { x: x, y: y };
    }

    public draw(offset = 0) {
        if (this.drawUntil == 0) {
            this.undraw(); // Update to this.setTransparent
            return;
        }
        this.isDrawn = true;
        this.onDraw(offset);
    }

    protected abstract onDraw(offset: number): void;

    public undraw() {
        this.isDrawn = false;
        undrawElementsInGroup(this.drawGroupId);
    }

    public dispose() {
        this.undraw();
    }

    protected static createChangedEvent(property: Path.Property): CustomEvent {
        const event = new CustomEvent<Path.PropertyChangedDetail>(
            Path.EVENT_PROPERTY_CHANGED, {detail: { property: property }});
        return event;
    }
}

namespace Path {
    export enum Property {
        ID,
        SECTION_ID,
        IS_END_OF_SECTION,
        STYLE,
        COLOR,
        BOOK,
        WIDTH,
        DRAW_UNTIL,
        POSITION,
        IS_ACTIVE,
    }

    export interface PropertyChangedDetail {
        property: Path.Property;
    }
}

export default Path;