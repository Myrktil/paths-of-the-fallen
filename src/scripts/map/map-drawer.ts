import { SVG_NS } from "../utils/constants";
import { walk } from "../utils/helpers";

interface RGBAColor {
    red: number,
    green: number,
    blue: number
    alpha: number,
}

interface StrokeProperty {
    readonly dashWidthFactor: number | undefined,
    readonly dashGapFactor: number | undefined,
    readonly strokeLineCap: string,
}

export enum LineStyle {
    DASHED,
    DOTTED,
    FULL,
}

interface PointPosition {
    x: number;
    y: number
}

interface QubicBezierPosition {
    startPoint: PointPosition,
    controlPoint0: PointPosition,
    controlPoint1: PointPosition,
    endPoint: PointPosition,
}

// The different types of possible elements.
enum ElementType {
    QUBIC_BEZIER,
    CIRCLE,
}

// The groups used to organize these elements in the SVG, e.g. for easier layering.
// One element can have subelements which are part of multiple groups and multiple element types
// can be part of one group.
export enum ElementGroup {
    CURVE = "curves",
    CURVE_CLICKABLE = "curve-clickables",
    CIRCLE = "circles"
}

interface DrawnCircleElement {
  type: ElementType.CIRCLE;
  svgElement: SVGCircleElement;
  position: PointPosition;
}

interface DrawnQubicBezierElement {
  type: ElementType.QUBIC_BEZIER;
  svgElements: { curve: SVGPathElement, clickable: SVGPathElement };
  position: QubicBezierPosition;
}

type DrawnElement = DrawnCircleElement | DrawnQubicBezierElement;

let mapSVG: SVGSVGElement;

// Stores the drawn elements for each elementId.
let drawnElements: Map<string, Map<ElementType, DrawnElement>> = new Map();
// Caches the result of the conversion to rgba for each color string.
const convertedColorCache: Map<string, RGBAColor> = new Map();

const defaultGroup = "NOGROUP";
const strokeProperties: Map<LineStyle, StrokeProperty> = new Map();
strokeProperties.set(LineStyle.DASHED, { dashWidthFactor: 2, dashGapFactor: 2, strokeLineCap: "round" });
strokeProperties.set(LineStyle.DOTTED, { dashWidthFactor: 0, dashGapFactor: 2, strokeLineCap: "round" });
strokeProperties.set(LineStyle.FULL, { dashWidthFactor: undefined, dashGapFactor: undefined, strokeLineCap: "none" });

export function initMapDrawer(svg: SVGSVGElement) {
    mapSVG = svg;
}

export function drawQubicBezierCurve(
    position: QubicBezierPosition,
    drawUntil: number = -1,
    width: number,
    color: string = "black",
    opacity: number = 1,
    style: LineStyle = LineStyle.FULL,
    dashArrayOffset: number = 0,
    groupIds: readonly string[] = [defaultGroup],
    elementId: string
): { curveElement: SVGPathElement, clickableElement: SVGPathElement } {
    const previousElements = drawnElements.get(elementId);
    if (previousElements !== undefined) {
        const curve = previousElements.get(ElementType.QUBIC_BEZIER) as DrawnQubicBezierElement;
        if (curve !== undefined) {
            setQubicBezierPathAttributes(
                curve.svgElements.curve,
                position,
                drawUntil,
                width,
                color,
                opacity,
                style,
                dashArrayOffset
            );

            setQubicBezierPathAttributes(
                curve.svgElements.clickable,
                position,
                undefined,
                getCurveClickableWidth(width),
                undefined,
                0,
                undefined,
                undefined
            );
            
            return { 
                curveElement: curve.svgElements.curve, 
                clickableElement: curve.svgElements.clickable 
            };
        }
    }
    
    return createQubicBezierCurve(
        position,
        drawUntil,
        width,
        color,
        opacity,
        style,
        dashArrayOffset,
        groupIds,
        elementId
    );
}

function createQubicBezierCurve(
    position: QubicBezierPosition,
    drawUntil: number = -1,
    width: number,
    color: string = "black",
    opacity: number = 1,
    style: LineStyle = LineStyle.FULL,
    dashArrayOffset: number = 0,
    groupIds: readonly string[] = [defaultGroup],
    elementId: string
): { curveElement: SVGPathElement, clickableElement: SVGPathElement } {
    const curve = document.createElementNS(SVG_NS, "path") as SVGPathElement;
    setQubicBezierPathAttributes(
        curve,
        position,
        drawUntil,
        width,
        color,
        opacity,
        style,
        dashArrayOffset
    );
    curve.classList.add(getElementClassFromId(elementId));
    const curveGroup = getGroup(groupIds, ElementGroup.CURVE);
    curveGroup.appendChild(curve);

    // Overlay a transparent thicker line over the path and add the click events
    // to it. This makes clicking the line more lenient, especially when zoomed out.
    const curveClickable = document.createElementNS(SVG_NS, "path") as SVGPathElement;
    setQubicBezierPathAttributes(
        curveClickable,
        position,
        undefined,
        getCurveClickableWidth(width),
        undefined,
        0,
        undefined,
        undefined
    );
    curveClickable.classList.add(getElementClassFromId(elementId));
    const clickableGroup = getGroup(groupIds, ElementGroup.CURVE_CLICKABLE);
    clickableGroup.appendChild(curveClickable);

    const curveElement: DrawnElement = {
        type: ElementType.QUBIC_BEZIER,
        svgElements: { curve: curve, clickable: curveClickable },
        position: position,
    };
    addToDrawnElements(elementId, curveElement);

    return { curveElement: curve, clickableElement: curveClickable };
}

function setQubicBezierPathAttributes(
    path: SVGPathElement,
    position: QubicBezierPosition,
    drawUntil: number = -1,
    width: number,
    color: string = "black",
    opacity: number = 1,
    style: LineStyle = LineStyle.FULL,
    dashArrayOffset: number = 0,
): SVGPathElement {
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-opacity", `${opacity}`);
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", `${width}`);
    path.setAttribute("stroke-linecap", "round");

    path.setAttribute("d", 
        `m${position.startPoint.x},${position.startPoint.y}
        C${position.controlPoint0.x},${position.controlPoint0.y}
        ${position.controlPoint1.x},${position.controlPoint1.y} 
        ${position.endPoint.x},${position.endPoint.y}`
    );

    if (drawUntil >= 0) {
        path.setAttribute(
            "stroke-dasharray", 
            `${drawUntil}, 999999999999`
        );
    }
    else {
        const properties = strokeProperties.get(style);
        if (properties) {
            path.setAttribute("stroke-linecap", `${properties.strokeLineCap}`);
            let dashWidth: string = "none";
            let dashGap: string = "none";
            if (properties.dashWidthFactor !== undefined) {
                dashWidth = `${properties.dashWidthFactor * width}`;
            }
            if (properties.dashGapFactor !== undefined) {
                dashGap = `${properties.dashGapFactor * width}`;
            }
            path.setAttribute("stroke-dasharray", `${dashWidth},${dashGap}`);
        }
        path.setAttribute("stroke-dashoffset", `${dashArrayOffset}`);
    }

    return path;
}

export function drawCircle(
    position: PointPosition,
    radius: number,
    color: string = "black",
    opacity: number = 1,
    groupIds: readonly string[] = [defaultGroup],
    elementId: string
): SVGCircleElement {
    const previousElements = drawnElements.get(elementId);
    if (previousElements !== undefined) {
        const circle = previousElements.get(ElementType.CIRCLE) as DrawnCircleElement;
        if (circle !== undefined) {
            setCircleAttributes(
                circle.svgElement,
                position,
                radius,
                color,
                opacity
            );
            
            return circle.svgElement;
        }
    }
    
    return createCircle(
        position,
        radius,
        color,
        opacity,
        groupIds,
        elementId
    );
}

function createCircle(
    position: PointPosition,
    radius: number,
    color: string = "black",
    opacity: number = 1,
    groupIds: readonly string[] = [defaultGroup],
    elementId: string
): SVGCircleElement {
    const circle = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
    setCircleAttributes(
        circle,
        position,
        radius,
        color,
        opacity
    );
    circle.classList.add(getElementClassFromId(elementId));
    const group = getGroup(groupIds, ElementGroup.CIRCLE);
    group.appendChild(circle);

    const drawnElement: DrawnElement = {
        type: ElementType.CIRCLE,
        svgElement: circle,
        position: position,
    };
    addToDrawnElements(elementId, drawnElement);

    return circle;
}

function setCircleAttributes(
    circle: SVGCircleElement,
    position: PointPosition,
    radius: number,
    color: string = "black",
    opacity: number = 1,
): SVGCircleElement {
    const rgbaColor = cssColorToRGBA(color);
    const decoratorColor = darkenColor(rgbaColor, 0.18);
    const decoratorWidth = radius * 5/12;

    circle.setAttribute("cx", `${position.x}`);
    circle.setAttribute("cy", `${position.y}`);
    circle.setAttribute("opacity", `${opacity}`);
    circle.setAttribute("r", `${radius}`);
    circle.setAttribute("stroke", `rgba(
        ${decoratorColor.red}, 
        ${decoratorColor.green}, 
        ${decoratorColor.blue}, 
        ${decoratorColor.alpha}
        )`
    );
    circle.setAttribute("stroke-width", `${decoratorWidth}`);
    circle.setAttribute("fill", color);

    return circle;
}

export function undrawElementsInGroup(groupId: string) {
    let removedClasses = new Set<string>();
    const groups = document.getElementsByClassName(getGroupClass(groupId));
    while(groups.length > 0) {
        const group = groups[0];
        walk(group, child => {
            if (!(child instanceof SVGGElement)) {
                for (const htmlClass of child.classList) {
                    removedClasses.add(htmlClass);
                }
            }
        });
        group.remove();
    }

    for (const removedClass of removedClasses) {
        drawnElements.delete(getElementIdFromClass(removedClass));
    }
}

export function undrawElement(elementId: string) {
    if (!drawnElements.has(elementId)) {
        return;
    }
    
    const subElements = document.getElementsByClassName(getElementClassFromId(elementId));
    while (subElements.length > 0) {
        subElements[0].remove();
    }
    drawnElements.delete(elementId);
}

export function getStrokeProperties(style: LineStyle): StrokeProperty | undefined {
    return strokeProperties.get(style);
}

function darkenColor(color: RGBAColor, factor: number) {
    return {
        red: color.red - (color.red * factor),
        green: color.green - (color.green * factor),
        blue: color.blue - (color.blue * factor),
        alpha: color.alpha,
    };
}

function cssColorToRGBA(color: string) {
    let cachedValue = convertedColorCache.get(color);
    if (cachedValue) {
        return cachedValue;
    }

    const el = document.createElement("div");
    el.style.color = color;
    document.body.appendChild(el);

    const rgb = getComputedStyle(el).color;

    document.body.removeChild(el);

    let numArray: number[];
    const numStrings = rgb.match(/\d+(\.\d+)?/g);
    if (numStrings) {
        numArray = numStrings.map(Number);
    }
    else {
        numArray = [];
    }

    if (numArray.length < 3) {
        console.error("Failed convert color: " + color);
        numArray = [0, 0, 0, 1];
    }
    else if (numArray.length == 3) {
        numArray.push(1);
    }
    else if (numArray.length > 4) {
        numArray.splice(5);
    }

    const rgbaColor: RGBAColor = {
        red: numArray[0],
        green: numArray[1],
        blue: numArray[2],
        alpha: numArray[3],
    }

    convertedColorCache.set(color, rgbaColor);
    return rgbaColor;
}

// Initially sort all elements into groups by element type for easier organisation and z-indexing
// (layering the clickables over the paths, ...).
function getElementTypeGroup(type: ElementGroup) {
    let group = document.getElementById(getElementTypeGroupId(type)) as SVGElement | null;
    if (group) {
        return group;
    }

    group = document.createElementNS(SVG_NS, "g") as SVGElement;
    group.id = getElementTypeGroupId(type);
    mapSVG.appendChild(group);
    if (type == ElementGroup.CURVE) {
        // Long paths with short dash-arrays are very heavy during pointer hit-testing so use 
        // clickable for all pointer events on curves.
        group.style.pointerEvents = "none";
    }
    return group;
}

// Then allow further grouping of the elements within the element type groups into subgroups where
// groupIds[0] is the topmost group, groupIds[1] is a child of groupId[0], ...
function getGroup(groupIds: readonly string[], type: ElementGroup) {
    if (groupIds.length < 1) {
        groupIds = [defaultGroup];
    }

    const elementGroup = getElementTypeGroup(type);
    const group = elementGroup.querySelector(`.${getGroupClass(groupIds[groupIds.length - 1])}`);
    if (group) {
        return group;
    }

    let parent = elementGroup;
    for (let i = 0; i < groupIds.length; i++) {
        let childGroup = parent.querySelector(`.${getGroupClass(groupIds[i])}`) as SVGElement | null;
        if (!childGroup) {
            childGroup = document.createElementNS(SVG_NS, "g") as SVGElement;
            childGroup.classList.add(getGroupClass(groupIds[i]));
            parent.appendChild(childGroup);
        }
        parent = childGroup;
    }

    return parent;
}

function getElementTypeGroupId(type: ElementGroup) {
    return cssClassFromString(type);
}

function getGroupClass(groupId: string) {
    return cssClassFromString(groupId);
}   

// Identifies all drawn SVG elements that are related to this element.
// Elements of the same type with the same id will overwrite each other when drawing.
export function getElementClassFromId(elementId: string) {
    return cssClassFromString(elementId);
}

function getElementIdFromClass(elementClass: string) {
    return stringFromCSSClass(elementClass);
}

// Normalize a unicode string into a valid lowercase css classname.
// This normalization is bijective.
function cssClassFromString(str: string) {
    let normalized = "c_"; // Add fixed prefix to allow for bijectiv encoding of whitespaces.

    for (const ch of str) {
        if (/^[a-zA-Z0-9-]$/.test(ch)) {
            normalized += ch;
        } 
        else {
            const code = ch.codePointAt(0);
            if (code == undefined) {
                throw new Error("Failed to normalize string.");
            }
            normalized += "_" + code.toString(16) + "_";
        }
    }

    return normalized;
}

function stringFromCSSClass(str: string) {
    if (!str.startsWith("c_")) {
        throw new Error("Invalid css class encoding.");
    }

    let denormalized = "";
    let i = 2; // Skip prefix.

    while (i < str.length) {
        if (str[i] == "_") {
            const end = str.indexOf("_", i + 1);
            if (end == -1) {
                throw new Error("Invalid encoding: missing closing '_'.");
            }

            const hex = str.slice(i + 1, end);
            const code = parseInt(hex, 16);
            if (isNaN(code)) {
                throw new Error("Invalid encoding: invalid hex.");
            }

            denormalized += String.fromCodePoint(code);
            i = end + 1;
        } 
        else {
            denormalized += str[i];
            i += 1;
        }
    }

    return denormalized;
}

function addToDrawnElements(elementId: string, element: DrawnElement) {
    let entry = drawnElements.get(elementId);
    if (entry === undefined) {
        entry = new Map<ElementType, DrawnElement>();
        drawnElements.set(elementId, entry);
    }

    entry.set(element.type, element);
}

function getCurveClickableWidth(curveWidth: number) {
    return curveWidth * 3;
}
