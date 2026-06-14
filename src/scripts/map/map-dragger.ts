import { clamp } from "../utils/helpers";
import { DRAG_DURATION } from "../utils/constants";

let mapContainer: HTMLDivElement;
let minZoomValue: number;
let maxZoomValue: number;
let initialZoomValue: number;

const VECTOR_CACHE_SIZE = 3;

let lastMapReferencePos = { x: 0, y: 0 }; // The point representing the map for dragging.
let accumulatedDragAmountX: number = 0;
let accumulatedDragAmountY: number = 0;
let prevTouchDistance: number;
let prevDragTime: number | null = null;
let lastUserDragSpeed = 0;
let dragVectorCache: Array<{ x: number, y: number }> = []; // The last few user drag vectors.
let hasDragged = false;
let lastTranslateX = 0;
let lastTranslateY = 0;

const WHEEL_MAP_ZOOM_IN_AMOUNT = 1.2;
const WHEEL_MAP_ZOOM_OUT_AMOUNT = 1 / WHEEL_MAP_ZOOM_IN_AMOUNT;
const PINCH_ZOOM_SENSITIVITY = 1; // >1 = faster, <1 = slower
const MIN_PINCH_ZOOM_FACTOR = 0.92; // A value smaller than 1.
const MAX_PINCH_ZOOM_FACTOR = 1.08; // A value greater than 1.
let pinchZoomTarget = { x: 0, y: 0};
let accumulatedZoomAmount: number = 1;
let lastZoomTarget: { x: number, y: number};
let zoomDeltaCache: number[] = [];
let lastScale = 1;

let sndPointerUpTime: number | null = null;
let fstPointerUpTime: number | null = null;

let currDragMomentumAnimation = 0;
let currZoomMomentumAnimation = 0;
const MOMENTUM_DRAG_SPEED_THRESHOLD = 0.3; // How fast does pointer have to be to start map momentum.
const MOMENTUM_ZOOM_THRESHOLD = 0.003; // How fast does pointer have to be to start map momentum.
const MOMENTUM_ZOOM_DURATION = 500; // In ms.
const MOMENTUM_DRAG_DURATION = 500; // In ms.
// When user adds or removes a pointer (and swaps between 1 pointer behavior and 2 pointer 
// behavior), skip one movement cycle to allow for lastPointerPosition, lastPointerDistance, ... 
// to update to the respective new mode's values. Otherwise sudden jumps will happen.
let skippedMoveCycle = true;
let skippedZoomCycle = true;

let frameScheduled = false;

const activePointers = new Map<number, PointerPosition>();

export const EVENT_MAP_TRANSFORM_CHANGED = "map:scale-changed";
// Global: In relation to screen coords.
// Local: Affected by the map's scale.
export interface MapTransformChangedDetail {
    newX: number;
    newY: number;
    newScale: number;
}

export function initMapDragger(
    container: HTMLDivElement,
    minZoom: number,
    maxZoom: number,
    initialZoom: number
) {
    mapContainer = container;
    minZoomValue = minZoom;
    maxZoomValue = maxZoom;
    initialZoomValue = initialZoom;

    const centerMapButton = document.getElementById("center-map-button") as HTMLButtonElement;
    centerMapButton.addEventListener("click", () => {
        centerMap();
    });

    const mapRoot = document.getElementById("map-root") as HTMLDivElement;
    mapRoot.addEventListener("pointerdown", handlePointerDown, { passive: false }); 
    window.addEventListener("pointerup", handlePointerUp);

    // Clear pointerCache if user swapps site or the window loses focus. Otherwise refocusing
    // the window would make the map unresponsible.
    window.addEventListener("pointercancel", (e) => {
        activePointers.delete(e.pointerId);
    });
    window.addEventListener("blur", () => {
        for (const key of activePointers.keys()) {
            activePointers.delete(key);
        }   
    })

    // Wheel zoom.
    mapRoot.addEventListener("wheel", handleWheel, { passive: false }); 

    centerMap();

    // Avoid undefined zoomTarget if the first frame only drags.
    lastZoomTarget = {
        x: mapContainer.offsetLeft + mapContainer.offsetWidth / 2,
        y: mapContainer.offsetTop + mapContainer.offsetHeight / 2
    };
}

function handlePointerDown(e: PointerEvent) {
    window.addEventListener("pointermove", handlePointerMove, { passive: false });

    activePointers.set(e.pointerId, new PointerPosition(e.clientX, e.clientY));

    if (activePointers.size == 1) {
        lastMapReferencePos.x = e.clientX;
        lastMapReferencePos.y = e.clientY;
    }
    else if (activePointers.size == 2) {
        handleDualPointerDownEvent();
    }

    cancelAnimationFrame(currDragMomentumAnimation);
    cancelAnimationFrame(currZoomMomentumAnimation);
}

function handlePointerMove(e: PointerEvent) {
    e.preventDefault();
    hasDragged = true;
    if (activePointers.size == 1) {
        moveMap({ x: e.clientX, y: e.clientY});
    }
    else if (activePointers.size == 2) {
        const pointer = activePointers.get(e.pointerId);
        if (pointer) {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }

        handleDualPointerMoveEvent();
    }
}

function handlePointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId);

    if (activePointers.size == 1) {
        // Swapped from two to one pointer mode.
        skippedMoveCycle = false;

        const remainingPointer = activePointers.values().next().value;
        lastMapReferencePos.x = remainingPointer!.x;
        lastMapReferencePos.y = remainingPointer!.y;

        sndPointerUpTime = Date.now();
    }
    else if (activePointers.size == 0) {
        window.removeEventListener("pointermove", handlePointerMove);
        initMapMomentum();
        hasDragged = false;
    }
}

function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const mousePos = {x: e.clientX, y: e.clientY};
    const sign = Math.sign(e.deltaY);
    let amount;
    if (sign > 0) {
        amount = WHEEL_MAP_ZOOM_OUT_AMOUNT;
    }
    else {
        amount = WHEEL_MAP_ZOOM_IN_AMOUNT;
    }
    zoomMap(mousePos, amount);
}

function handleDualPointerDownEvent() {
    // Map dragging uses midpoint between the two pointers as reference.
    let sumX = 0; 
    let sumY = 0;
    for (const pointer of activePointers.values()) {
        sumX += pointer.x;
        sumY += pointer.y;
    }
    lastMapReferencePos.x = sumX / 2;
    lastMapReferencePos.y = sumY / 2;

    skippedMoveCycle = false;
    skippedZoomCycle = false;

    const pointers = activePointers.values();
    const pointer1 = pointers.next().value;
    const pointer2 = pointers.next().value;

    if (!pointer1 || !pointer2) {
        console.error("Failed to initialise pointer position.");
        return;
    }

    // Set the zoom target once on pointerdown and update it on mapMove and not during pointermove 
    // so dragging one pointer faster than the other doesn't move the target. This feels better.
    calcPinchZoomTarget(pointer1, pointer2);
    prevTouchDistance = calcPointerDistance(pointer1, pointer2); 
}

function handleDualPointerMoveEvent() {
    const pointers = activePointers.values();
    const pointer1 = pointers.next().value;
    const pointer2 = pointers.next().value;

    if (!pointer1 || !pointer2) {
        console.error("Failed to retrieve two pointers.");
        return;
    }
    
    // Use middle point between the two pointers as reference point for dragging.
    const sumX = pointer1.x + pointer2.x;
    const sumY = pointer1.y + pointer2.y;
    const newPos = { x: sumX / 2, y: sumY / 2}; 
    moveMap(newPos);

    pinchZoom(pointer1, pointer2);
}

function pinchZoom(pointer1: PointerPosition, pointer2: PointerPosition) {
    const newDistance = calcPointerDistance(pointer1, pointer2);

    if (prevTouchDistance === undefined || prevTouchDistance === 0) {
        prevTouchDistance = newDistance;
        return;
    }

    const rawRatio = newDistance / prevTouchDistance;
    let zoomFactor = Math.pow(rawRatio, PINCH_ZOOM_SENSITIVITY);
    zoomFactor = clamp(zoomFactor, MIN_PINCH_ZOOM_FACTOR, MAX_PINCH_ZOOM_FACTOR);

    const logDelta = Math.log(zoomFactor);
    zoomDeltaCache.push(logDelta);
    if (zoomDeltaCache.length > VECTOR_CACHE_SIZE) {
        zoomDeltaCache.shift();
    }

    if (skippedZoomCycle) {
        zoomMap(pinchZoomTarget, zoomFactor);
    }
    skippedZoomCycle = true;

    prevTouchDistance = newDistance;
}

function calcPinchZoomTarget(pointer1: PointerPosition, pointer2: PointerPosition) {
    const x = pointer1.x + pointer2.x;
    const y = pointer1.y + pointer2.y;
    pinchZoomTarget = { x: x / 2, y: y / 2};
}

function calcPointerDistance(pointer1: PointerPosition, pointer2: PointerPosition): number {
    const distX = Math.abs(pointer1.x - pointer2.x);
    const distY = Math.abs(pointer1.y - pointer2.y);

    const dist = Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
    return dist;
}

function initMapMomentum() {
    fstPointerUpTime = Date.now();
    let addedZoomMomentum = false;
    let twoFingersLifted = false;
    if (sndPointerUpTime) {
        // Add map momentum if both pointers where lifted roughly simoutlaneously.
        if (Math.abs(fstPointerUpTime - sndPointerUpTime) < DRAG_DURATION) {
            twoFingersLifted = true;
            if (
                zoomDeltaCache.length > 0 &&
                Math.abs(zoomDeltaCache[zoomDeltaCache.length - 1]) > MOMENTUM_ZOOM_THRESHOLD
            ) {
                addMapZoomMomentum();
                addedZoomMomentum = true;
            }
        }
        fstPointerUpTime = null;
        sndPointerUpTime = null;
    }
    // Check has dragged to only add momentum when user dragged the map, not when map was moved
    // by the website, eg the center map button.
    if (!addedZoomMomentum 
        && !twoFingersLifted
        && lastUserDragSpeed > MOMENTUM_DRAG_SPEED_THRESHOLD 
        && hasDragged) {
        addMapDragMomentum();
    }
}   

function addMapZoomMomentum() {
    cancelAnimationFrame(currZoomMomentumAnimation);
    cancelAnimationFrame(currDragMomentumAnimation);

    // Set initial speed to average of users last pinch vectors for a smooth transition.
    let initialSpeed = 0;
    for (const d of zoomDeltaCache) {
        initialSpeed += d;
    }
    initialSpeed /= zoomDeltaCache.length;

    // Momentum feels better when it start a little slower than the last drags.
    const adjustement = 0.7;
    initialSpeed *= adjustement;

    const startTime = performance.now();

    function animate(time: number) {
        const elapsedTime = time - startTime;
        const t = Math.min(elapsedTime / MOMENTUM_ZOOM_DURATION, 1);
        const easeOut = 1 - t;

        const frameSpeed = initialSpeed * easeOut;
        const zoomFactor = Math.exp(frameSpeed);

        zoomMap(lastZoomTarget, zoomFactor);

        if (t < 1) {
            currZoomMomentumAnimation = requestAnimationFrame(animate);
        }
    }
    currZoomMomentumAnimation = requestAnimationFrame(animate);
}

function addMapDragMomentum() {
    cancelAnimationFrame(currZoomMomentumAnimation);
    cancelAnimationFrame(currDragMomentumAnimation);
    
    // Set initial speed to average of users last drag vectors for a smoother transition.
    let initialSpeedX = 0;
    let initialSpeedY = 0;
    for (let i = 0; i < dragVectorCache.length; i++) {
        initialSpeedX += dragVectorCache[i].x;
        initialSpeedY += dragVectorCache[i].y;
    }
    // Adjust value to better match speed when dragging.
    const adjustement = 0.8;
    initialSpeedX = (initialSpeedX / dragVectorCache.length) * adjustement;
    initialSpeedY = (initialSpeedY / dragVectorCache.length) * adjustement;

    const startTime = performance.now();

    function animate(time: number) {
        const elapsedTime = time - startTime;
        const t = Math.min(elapsedTime / MOMENTUM_DRAG_DURATION, 1);

        const easeOut = 1 - t;

        const deltaX = initialSpeedX * easeOut;
        const deltaY = initialSpeedY * easeOut;

        const newMapReferencePos = {
            x: lastMapReferencePos.x + deltaX,
            y: lastMapReferencePos.y + deltaY
        };
        moveMap(newMapReferencePos);

        if (t < 1) {
            currDragMomentumAnimation = requestAnimationFrame(animate);
        }
    }

    currDragMomentumAnimation = requestAnimationFrame(animate);
}

function moveMap(newMapReferencePos: { x: number , y: number }): void {
    const deltaX = newMapReferencePos.x - lastMapReferencePos.x;
    const deltaY = newMapReferencePos.y - lastMapReferencePos.y;

    if (skippedMoveCycle) {
        accumulatedDragAmountX += deltaX;
        accumulatedDragAmountY += deltaY;
    }
    
    if (skippedMoveCycle) {
        scheduleFrame();
    }
    skippedMoveCycle = true;

    const currTime = Date.now();
    if (prevDragTime) {
        // Ensure delta time is never 0.
        const deltaTime = Math.max(currTime - (prevDragTime ?? currTime), 1);
        const dragDist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        const dragSpeed = dragDist / deltaTime;
        lastUserDragSpeed = dragSpeed;
    }

    lastMapReferencePos.x = newMapReferencePos.x;
    lastMapReferencePos.y = newMapReferencePos.y;

    pinchZoomTarget.x += deltaX;
    pinchZoomTarget.y += deltaY;

    prevDragTime = currTime;
    dragVectorCache.push({ x: deltaX, y: deltaY });
    if (dragVectorCache.length > VECTOR_CACHE_SIZE) {
        dragVectorCache.shift();
    }
}

function zoomMap(zoomTarget: { x: number, y: number }, amount: number) {
    accumulatedZoomAmount *= amount;
    lastZoomTarget = zoomTarget;
    scheduleFrame();
}

function scheduleFrame() {
    if (!frameScheduled) {
        requestAnimationFrame(applyFrame);
        frameScheduled = true;
    }
}

function applyFrame() {
    const rect = mapContainer.getBoundingClientRect();

    // Reposition the map so that it looks like the map zooms into the zoomTarget, not the screen center.
    const offsetX = (lastZoomTarget.x - rect.x) / lastScale;
    const offsetY = (lastZoomTarget.y - rect.y) / lastScale;

    let nextScale = lastScale * accumulatedZoomAmount;
    nextScale = clamp(nextScale, minZoomValue, maxZoomValue);

    // Apply zoom and drag.
    const translateX = lastZoomTarget.x - offsetX * nextScale + accumulatedDragAmountX;
    const translateY = lastZoomTarget.y - offsetY * nextScale + accumulatedDragAmountY;

    setMapContainerTransform(translateX, translateY, nextScale);

    accumulatedDragAmountX = 0;
    accumulatedDragAmountY = 0;
    accumulatedZoomAmount = 1;
    frameScheduled = false;
}

class PointerPosition {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export function centerMap(): void {
    // Set scale first to accurately compute offsets needed to center map.
    setMapContainerTransform(undefined, undefined, initialZoomValue);
    let x: number = (window.innerWidth - mapContainer.getBoundingClientRect().width) / 2;
    let y: number = (window.innerHeight - mapContainer.getBoundingClientRect().height) / 2;
    setMapContainerTransform(x, y, initialZoomValue);
}

function setMapContainerTransform(
    x: number | undefined, 
    y: number | undefined, 
    scale: number | undefined
): void {
    if (x == undefined) {
        x = lastTranslateX;
    }
    if (y == undefined) {
        y = lastTranslateY;
    }
    if (scale == undefined) {
        scale = lastScale;
    }
    
    const event = new CustomEvent<MapTransformChangedDetail>(
        EVENT_MAP_TRANSFORM_CHANGED, 
        { detail: { 
            newX: x,
            newY: y,
            newScale: scale,
        }
    });
    mapContainer.dispatchEvent(event);    

    mapContainer.style.transform = `translate(${x}px,${y}px) scale(${scale})`;

    lastTranslateX = x;
    lastTranslateY = y;
    lastScale = scale;
}
