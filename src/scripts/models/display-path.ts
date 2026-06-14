import { drawCircle, drawQubicBezierCurve, undrawElement } from "../map/map-drawer";
import { DRAG_DURATION } from "../utils/constants";
import { pointerDownTime } from "../utils/pointer-state";
import Path from "./path";

class DisplayPath extends Path {
    public readonly startPointX: number;
    public readonly startPointY: number;
    public readonly endPointX: number;
    public readonly endPointY: number;
    public readonly controlPoint0X: number;
    public readonly controlPoint0Y: number;
    public readonly controlPoint1X: number;
    public readonly controlPoint1Y: number;
    public readonly length: number;

    private readonly curveElementId;
    private readonly endPointElementId;

    public static readonly EVENT_CURVE_CLICKED = "display-path:curve-clicked";
    public static readonly EVENT_POINT_CLICKED = "display-path:point-clicked";

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

        this.startPointX = startPointX;
        this.startPointY = startPointY;
        this.controlPoint0X = controlPoint0X;
        this.controlPoint0Y = controlPoint0Y;
        this.controlPoint1X = controlPoint1X;
        this.controlPoint1Y = controlPoint1Y;
        this.endPointX = endPointX;
        this.endPointY = endPointY;
        this.length = this.approximateLength();

        this.curveElementId = `path-${Path.counter}-curve`;
        this.endPointElementId = `path-${Path.counter}-end-point`;
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
                startPoint: { x: this.startPointX, y: this.startPointY },
                controlPoint0: { x: this.controlPoint0X, y: this.controlPoint0Y },
                controlPoint1: { x: this.controlPoint1X, y: this.controlPoint1Y },
                endPoint: { x: this.endPointX, y: this.endPointY },
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

        if (this.isEndOfSection) {
            if (this.isCompletelyDisplayed) {
                const endPoint = drawCircle(
                    { x: this.endPointX, y: this.endPointY },
                    this.width * this.pointRadiusToCurveWidthRatio,
                    this.color,
                    undefined,
                    this.drawGroupIds,
                    this.endPointElementId
                );
                endPoint.style.cursor = "default";

                endPoint.addEventListener("pointerup", this.handleEndpoinClicked);
            }
            else {
                undrawElement(this.endPointElementId);
            }
        }
    }

    private handleCurveClicked = (e: PointerEvent) => {
        const elapsedTime = Date.now() - pointerDownTime;
        if (elapsedTime < DRAG_DURATION) {
            this.dispatchEvent(new CustomEvent<DisplayPath.CurveClickedDetail>(
                DisplayPath.EVENT_CURVE_CLICKED, { detail: { pointerEvent: e } }
            ));
        }
    }

    private handleEndpoinClicked = (e: PointerEvent) => {
        const elapsedTime = Date.now() - pointerDownTime;
        if (elapsedTime < DRAG_DURATION) {
            this.dispatchEvent(new CustomEvent<DisplayPath.PointClickedDetail>(
                DisplayPath.EVENT_POINT_CLICKED, { detail: { pointerEvent: e } }
            ));
        }
    }
}

namespace DisplayPath {
    export interface CurveClickedDetail {
        pointerEvent: PointerEvent;
    }

    export interface PointClickedDetail {
        pointerEvent: PointerEvent;
    }
}

export default DisplayPath;