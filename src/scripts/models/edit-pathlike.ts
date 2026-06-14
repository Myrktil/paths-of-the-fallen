import { LineStyle } from "../map/map-drawer";

export default interface EditPathlike {
    // pathId instead of id since pathEditor extends HTMLElement 
    // leading to a naming conflict with HTMLElement.id.
    pathId: number; 
    sectionId: number;
    isEndOfSection: boolean;
    lineStyle: LineStyle;
    color: string;
    book: number;
    startPointX: number;
    startPointY: number;
    controlPoint0X: number;
    controlPoint0Y: number;
    controlPoint1X: number;
    controlPoint1Y: number; 
    endPointX: number;
    endPointY: number;
    width: number;
    readonly length: number;
    drawUntil: number;
    draw(offset?: number): void;
    undraw(): void;
}