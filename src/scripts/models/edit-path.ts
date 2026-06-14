import { drawCircle, drawQubicBezierCurve, getElementClassFromId, LineStyle, undrawElement } from "../map/map-drawer";
import { DRAG_DURATION } from "../utils/constants";
import { isColor, roundToXDecimals } from "../utils/helpers";
import { pointerDownTime } from "../utils/pointer-state";
import EditPathlike from "./edit-pathlike";
import Path from "./path";
import Pathlike from "./pathlike";
import Point from "./point";

export default class EditPath extends Path implements EditPathlike, Pathlike {
    private _isActive: boolean = false;
    private lengthOutdated = false;
    private _length: number;
    private readonly startPoint: Point;
    private readonly controlPoint0: Point;
    private readonly controlPoint1: Point;
    private readonly endPoint: Point;

    private readonly controlPointRadiusToCurveWidthRatio = 1.9;
    private readonly curveElementId;
    private readonly endPointElementId;
    private readonly startPointDraggerElementId;
    private readonly controlPoint0DraggerElementId;
    private readonly controlPoint1DraggerElementId;
    private readonly endPointDraggerElementId;

    public static readonly EVENT_DRAGGING_STOPPED = "edit-path:dragging-stopped";

    constructor(
        id: number, 
        sectionId: number,
        isEndOfSection: boolean,
        style: number,
        color: string,
        book: number,
        width: number,
        startPointX: number,
        startPointY: number,
        endPointX: number,
        endPointY: number,
        controlPoint0X: number,
        controlPoint0Y: number,
        controlPoint1X: number,
        controlPoint1Y: number,
        parentGroupIds: string[] | undefined = undefined,
    ) {
        super(
            id, sectionId, isEndOfSection, 
            style, color, book, width,
            parentGroupIds,
        );

        this.startPoint = new Point(startPointX, startPointY);
        this.controlPoint0 = new Point(controlPoint0X, controlPoint0Y);
        this.controlPoint1 = new Point(controlPoint1X, controlPoint1Y);
        this.endPoint = new Point(endPointX, endPointY);

        const points = [this.startPoint, this.endPoint, this.controlPoint0, this.controlPoint1];
        for (const point of points) {
            point.addEventListener(Point.EVENT_POSITION_UPDATED, this.handlePointPositionChanged);
            point.addEventListener(Point.EVENT_DRAGGING_STOPPED, this.handlePointDraggingStopped)
        }

        this._length = this.approximateLength();

        this.curveElementId = `path-${Path.counter}-curve`;
        this.endPointElementId = `path-${Path.counter}-end-point`;
        this.startPointDraggerElementId = `path-${Path.counter}-start-dragger`;
        this.controlPoint0DraggerElementId = `path-${Path.counter}-cp0-dragger`;
        this.controlPoint1DraggerElementId = `path-${Path.counter}-cp1-dragger`;
        this.endPointDraggerElementId = `path-${Path.counter}-end-dragger`;

        document.addEventListener("pointerup", this.handlePointerUp);
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

    public get startPointX() {
        return this.startPoint.x;
    }

    public get startPointY() {
        return this.startPoint.y;
    }

    public get endPointX() {
        return this.endPoint.x;
    }

    public get endPointY() {
        return this.endPoint.y;
    }

    public get controlPoint0X() {
        return this.controlPoint0.x;
    }

    public get controlPoint0Y() {
        return this.controlPoint0.y;
    }

    public get controlPoint1X() {
        return this.controlPoint1.x;
    }

    public get controlPoint1Y() {
        return this.controlPoint1.y;
    }

    public get isActive() {
        return this._isActive;
    }

    public get length() {
        if (!this.lengthOutdated) {
            return this._length;
        }
        else {
            this.length = this.approximateLength();
            return this._length;
        }
    }

    public set pathId(id: number) {
        if (id < 0) {
            console.error("Failed to assign invalid id.");
            return;
        }
        if (id == this.pathId) {
            return;
        }
        this._id = id;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.ID));
    }

    public set sectionId(id: number) {
        if (id < 0) {
            throw new Error("Failed to assign invalid section.");
        }
        if (id == this.sectionId) {
            return;
        }
        this._sectionId = id;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.SECTION_ID));
    }

    public set isEndOfSection(bool: boolean) {
        if (bool == this.isEndOfSection) {
            return;
        }
        this._isEndOfSection = bool;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.IS_END_OF_SECTION));
    }

    public set lineStyle(style: LineStyle) {
        if (style == this.lineStyle) {
            return;
        }
        this._style = style;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.STYLE));
    }

    public set color(color: string) {
        if (!isColor(color)) {
            console.error(`${color} is not a valid css color.`);
            return;
        }
        if (color == this.color) {
            return;
        }
        this._color = color;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.COLOR));
    }

    public set book(book: number) {
        if (book == this.book) {
            return;
        }
        if (Number.isNaN(book) || book < 1) {
            book = 1;
        }
        this._book = book;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.BOOK));
    }

    public set width(value: number) {
        if (Number.isNaN(value) || value < 0) {
            value = 1;
        }
        if (value == this.width) {
            return;
        }
        this._width = value;
        this.dispatchEvent(Path.createChangedEvent(Path.Property.WIDTH));
    }

    public set startPointX(value: number) {
        this.startPoint.x = value;
    }

    public set startPointY(value: number) {
        this.startPoint.y = value;
    }

    public set controlPoint0X(value: number) {
        this.controlPoint0.x = value;
    }

    public set controlPoint0Y(value: number) {
        this.controlPoint0.y = value;
    }

    public set controlPoint1X(value: number) {
        this.controlPoint1.x = value;
    }

    public set controlPoint1Y(value: number) {
        this.controlPoint1.y = value;
    }

    public set endPointX(value: number) {
        this.endPoint.x = value;
    }

    public set endPointY(value: number) {
        this.endPoint.y = value;
    }

    private set length(value: number) {
        this._length = value;
        this.lengthOutdated = false;
    }

    public setActive() {
        if (this.isActive) {
            return;
        }
        this._isActive = true;
        const event = Path.createChangedEvent(Path.Property.IS_ACTIVE);
        this.dispatchEvent(event);
    }

    public setInactive() {
        if (!this.isActive) {
            return;
        }
        this._isActive = false;
        const event = Path.createChangedEvent(Path.Property.IS_ACTIVE);
        this.dispatchEvent(event);
    }

    private handlePointPositionChanged = () => {
        this.dispatchEvent(Path.createChangedEvent(Path.Property.POSITION));
        this.lengthOutdated = true;
    }

    private handlePointDraggingStopped = () => {
        this.dispatchEvent(new Event(EditPath.EVENT_DRAGGING_STOPPED));
    }

    private handlePointerUp = (e: PointerEvent) => {
        if (
            !(e.target instanceof SVGElement) || (
                e.target instanceof SVGElement && (
                    e.target.classList.contains(getElementClassFromId(this.curveElementId)) ||
                    e.target.classList.contains(getElementClassFromId(this.endPointElementId)) ||
                    e.target.classList.contains(getElementClassFromId(this.startPointDraggerElementId)) ||
                    e.target.classList.contains(getElementClassFromId(this.controlPoint0DraggerElementId)) ||
                    e.target.classList.contains(getElementClassFromId(this.controlPoint1DraggerElementId)) ||
                    e.target.classList.contains(getElementClassFromId(this.endPointDraggerElementId))
                )
            )
        ) {
            return;
        }

        // Clicked somewhere on the map away from the path.
        if (
            Date.now() - pointerDownTime <= DRAG_DURATION && 
            this.isDrawn &&
            this.isActive
        ) {
            this.setInactive();
        }
    }

    protected onDraw(offset: number) {
        let drawUntilValue: number | undefined;
        if (this.drawUntil < 0) {
            // Draw without restriction (and with normal line style).
            drawUntilValue = undefined;
        }
        else {
            drawUntilValue = this.drawUntil;
        }

        const curve = drawQubicBezierCurve(
            {
                startPoint: { x: this.startPoint.x, y: this.startPoint.y },
                controlPoint0: { x: this.controlPoint0.x, y: this.controlPoint0.y },
                controlPoint1: { x: this.controlPoint1.x, y: this.controlPoint1.y },
                endPoint: { x: this.endPoint.x, y: this.endPoint.y },
            },
            drawUntilValue,
            this.width,
            this.color,
            undefined,
            this._style,
            offset,
            this.drawGroupIds,
            this.curveElementId
        );

        curve.clickableElement.addEventListener("pointerup", this.handleCurveClicked);
        curve.clickableElement.style.cursor = "default";

        // Either draw endPoint which displays tooltip or controlPoints to edit the path.
        if (!this.isActive) {
            undrawElement(this.startPointDraggerElementId);
            undrawElement(this.controlPoint0DraggerElementId);
            undrawElement(this.controlPoint1DraggerElementId);
            undrawElement(this.endPointDraggerElementId);

            if (this.isEndOfSection) {
                if (this.isCompletelyDisplayed) {
                    const endPoint = drawCircle(
                        { x: this.endPoint.x, y: this.endPoint.y },
                        this.width * this.pointRadiusToCurveWidthRatio,
                        this.color,
                        undefined,
                        this.drawGroupIds,
                        this.endPointElementId
                    );

                    endPoint.addEventListener("pointerup", this.handleEndpointClicked);
                }
                else {
                    undrawElement(this.endPointElementId);
                }
            }
        }
        else {
            undrawElement(this.endPointElementId);

            const pointDraggers = [
                this.startPoint, 
                this.controlPoint0, 
                this.controlPoint1, 
                this.endPoint
            ];
            const ids = [
                this.startPointDraggerElementId,
                this.controlPoint0DraggerElementId,
                this.controlPoint1DraggerElementId,
                this.endPointDraggerElementId
            ];
            for (let i = 0; i < 4; i++) { 
                if (i >= pointDraggers.length || i >= ids.length) {
                    console.error("Failed to draw point draggers.");
                    break;
                }
                const point = pointDraggers[i];
                const id = ids[i];
                let color;
                point == this.endPoint ? color = "darkred": color = "red";
                const element = drawCircle(
                    { x: point.x, y: point.y },
                    this.controlPointRadiusToCurveWidthRatio * this.width,
                    color,
                    undefined,
                    this.drawGroupIds,
                    id
                );
                element.addEventListener("pointerdown", point.startDragging);
            }
        }
    }

    private handleCurveClicked = () => {
        const elapsedTime = Date.now() - pointerDownTime;
        if (elapsedTime < DRAG_DURATION) {
            this.setActive();
        }
    }

    private handleEndpointClicked = () => {
        const elapsedTime = Date.now() - pointerDownTime;
        if (elapsedTime < DRAG_DURATION) {
            this.setActive();
        }
    }

    public dispose() {
        super.dispose();

        // These events could update the path even after it has been disposed leading to a false 
        // redraw of old paths. That's why they are removed.
        const points = [this.startPoint, this.endPoint, this.controlPoint0, this.controlPoint1];
        for (const point of points) {
            point.removeEventListener(Point.EVENT_POSITION_UPDATED, this.handlePointPositionChanged);
        }

        document.removeEventListener("pointerup", this.handlePointerUp);
    }

    public toJSON() {
        const pointPrecision = 4;
        return {
            id: this.pathId,
            sectionId: this.sectionId,
            isEndOfSection: this.isEndOfSection,
            style: this.lineStyle,
            color: this.color,
            book: this.book,
            width: this.width,
            startPointX: roundToXDecimals(this.startPointX, pointPrecision),
            startPointY: roundToXDecimals(this.startPointY, pointPrecision),
            endPointX: roundToXDecimals(this.endPointX, pointPrecision),
            endPointY: roundToXDecimals(this.endPointY, pointPrecision),
            controlPoint0X: roundToXDecimals(this.controlPoint0X, pointPrecision),
            controlPoint0Y: roundToXDecimals(this.controlPoint0Y, pointPrecision),
            controlPoint1X: roundToXDecimals(this.controlPoint1X, pointPrecision),
            controlPoint1Y: roundToXDecimals(this.controlPoint1Y, pointPrecision),
        };
    }
}