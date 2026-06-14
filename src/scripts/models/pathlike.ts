import { LineStyle } from "../map/map-drawer";

export default interface Pathlike {
    // pathId instead of id since pathEditor extends HTMLElement 
    // leading to a naming conflict with HTMLElement.id.
    readonly pathId: number; 
    readonly sectionId: number;
    readonly isEndOfSection: boolean;
    readonly lineStyle: LineStyle;
    readonly color: string;
    readonly book: number;
    readonly startPointX: number;
    readonly startPointY: number;
    readonly controlPoint0X: number;
    readonly controlPoint0Y: number;
    readonly controlPoint1X: number;
    readonly controlPoint1Y: number; 
    readonly endPointX: number;
    readonly endPointY: number;
    readonly width: number;
    readonly length: number;
    drawUntil: number;
    draw(offset?: number): void;
    undraw(): void;
}