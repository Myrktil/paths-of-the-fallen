import { EVENT_MAP_TRANSFORM_CHANGED } from "../map/map-dragger";
import { getMapContainer } from "../map/map-initializer";
import { DRAG_DURATION } from "../utils/constants";
import { pointerDownTime } from "../utils/pointer-state";

let tooltip: HTMLDivElement;
let tooltipContent: HTMLSpanElement;
// Differentiate between clicks on path which should display the tooltip and clicks
// on the map which should collapse the tooltip.
let clickedOnPath = false;
let lastTranslateX  = 0;
let lastTranslateY = 0;

export function initTooltipDisplayer() {
    tooltip = document.getElementById("tooltip-popup") as HTMLDivElement;
    tooltipContent = document.getElementById("tooltip-content") as HTMLSpanElement;
    tooltip.style.display = "none";

    getMapContainer().addEventListener(EVENT_MAP_TRANSFORM_CHANGED, hideTooltip);

    tooltip.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
    });
    tooltip.addEventListener("wheel", (e) => {
        e.stopPropagation();
    });

    window.addEventListener("pointerup", () => {
        const elapsedTime = Date.now() - pointerDownTime;

        if (clickedOnPath) {
            clickedOnPath = false;
            return;
        }

        if (elapsedTime < DRAG_DURATION) {
            tooltip.style.display = "none";
        }
    });
}

export function displayTooltip(e: PointerEvent, content: string) {
    clickedOnPath = true;

    tooltip.style.display = "";
    tooltipContent.innerHTML = content;
    tooltipContent.scrollTop = 0;

    const posX = e.clientX - tooltip.clientWidth / 2;
    const posY = e.clientY - tooltip.clientHeight;
    tooltip.style.transform = `translate(${posX}px, ${posY}px)`;
    lastTranslateX = posX;
    lastTranslateY = posY;  
}

export function hideTooltip() {
    tooltip.style.display = "none";
}