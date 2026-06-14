import { convertToSVGCoords } from "../map/map-initializer";
import { getMapContainer, mapContainerSize } from "../map/map-initializer";

class Point extends EventTarget{
    private _x: number;
    private _y: number;
    public static readonly EVENT_POSITION_UPDATED = "point:position-updated";
    public static readonly EVENT_DRAGGING_STOPPED = "point:dragging-stopped";
    private lastPointerPos = {
        x: 0,
        y: 0,
    }

    constructor(x: number, y: number) {
        super();

        this._x = x;
        this._y = y;
    }

    public get x() {
        return this._x;
    }

    public set x(value: number) {
        this._x = value;
        this.dispatchEvent(new Event(Point.EVENT_POSITION_UPDATED));
    }

    public get y() {
        return this._y;
    }

    public set y(value: number) {
        this._y = value;
        this.dispatchEvent(new Event(Point.EVENT_POSITION_UPDATED));
    }

    public startDragging = (e: PointerEvent) => {
        e.stopPropagation();
        document.addEventListener("pointermove", this.drag);
        document.addEventListener("pointerup", this.stopDragging);
        this.lastPointerPos.x = e.clientX;
        this.lastPointerPos.y = e.clientY;
    }

    public stopDragging = () => {
        document.removeEventListener("pointermove", this.drag);
        document.removeEventListener("pointerup", this.stopDragging);
        this.dispatchEvent(new Event(Point.EVENT_DRAGGING_STOPPED));
    }

    private drag = (e: PointerEvent) => {
        const rect = getMapContainer().getBoundingClientRect();
        const mapScale = rect.width / mapContainerSize;

        const deltaX = convertToSVGCoords(e.clientX - this.lastPointerPos.x);
        const deltaY = convertToSVGCoords(e.clientY - this.lastPointerPos.y);
    
        // Scale delta with map zoom to maintain accurate drag behavior when map is zoomed in.
        const deltaXScaled = deltaX / mapScale;
        const deltaYScaled = deltaY / mapScale;
    
        this.x += deltaXScaled;
        this.y += deltaYScaled;
    
        this.lastPointerPos.x = e.clientX;
        this.lastPointerPos.y = e.clientY;
    }
}

export default Point;