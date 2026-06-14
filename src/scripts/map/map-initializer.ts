import { renderMap } from "./map-renderer";
import { EVENT_MAP_TRANSFORM_CHANGED, initMapDragger, MapTransformChangedDetail } from "./map-dragger";
import { initMapDrawer } from "./map-drawer";
import { SVG_NS } from "../utils/constants";
import { MapImageLODEntry, SubMapEntry } from "../data/config";

let mapContainer: HTMLDivElement;
let mapSVG: SVGSVGElement;

export const mapContainerSize = 2048;
export const mapSVGSize = 2048;

export async function initMap(
    minZoom: number,
    maxZoom: number,
    initialZoom: number,
    LODMode: string,
    mapImageLOD: ReadonlyArray<MapImageLODEntry>,
    mapImageFile: string,
    subMaps: ReadonlyArray<SubMapEntry>
) {
    getMapContainer().style.width = `${mapContainerSize}px`;
    getMapContainer().style.height = `${mapContainerSize}px`;

    mapSVG = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    mapSVG.id = "map-svg";
    mapSVG.style.position = "absolute";
    mapSVG.style.width = "inherit";
    mapSVG.style.height = "inherit";
    mapSVG.style.cursor = "grab";
    mapSVG.setAttribute("xmlns", SVG_NS);
    // Set SVG to constant size regardless of image for consistency across multiple images.
    mapSVG.setAttribute("viewBox", `0 0 ${mapSVGSize} ${mapSVGSize}`);

    // (At the time of writing this code) Firefox has a bug that causes SVGs on PC to render blurry when
    // the parent container is scaled. This is why the SVG is not set as the maps child, but instead
    // has it's position manually synchronised with the maps position on Firefox. 
    // Once the Firefox issue has been resolved, this can be removed.
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    if (isFirefox) {
        const root = document.getElementById("map-root");
        if (!root) {
            console.error("Failed to initialise map svg. No 'map-root' element provided.");
        }
        else {
            root.appendChild(mapSVG);
            mapContainer.addEventListener(EVENT_MAP_TRANSFORM_CHANGED, syncMapAndSVGPosition);
        }
    }
    else {
        mapContainer.appendChild(mapSVG);
        mapSVG.style.zIndex = "1";
    }

    await renderMap(getMapContainer(), LODMode, mapImageLOD, mapImageFile, subMaps);
    initMapDragger(getMapContainer(), minZoom, maxZoom, initialZoom);
    initMapDrawer(mapSVG);

    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        const fadeTime = 0.5;
        loadingScreen.style.transition = `${fadeTime}s`;
        loadingScreen.style.opacity = "0";
        setTimeout(() => loadingScreen.remove(), fadeTime * 1000);
    }
}

export function getMapContainer() {
    if (!mapContainer) {
        mapContainer = document.getElementById("map-container") as HTMLDivElement;
    }

    return mapContainer;
}

function syncMapAndSVGPosition(e: Event) {
    const event = e as CustomEvent<MapTransformChangedDetail>;
    if (!event.detail) {
        console.error("Invalid detail provided for " + EVENT_MAP_TRANSFORM_CHANGED + " event.");
        return;
    }

    mapSVG.style.transform = `translate(${event.detail.newX}px,${event.detail.newY}px)`;
    mapSVG.style.width = `${mapContainerSize * event.detail.newScale}px`;
    mapSVG.style.height = `${mapContainerSize * event.detail.newScale}px`
}

// SVG has a fixed viewbox that might be scaled up or down to fit into the mapContainer.
// Any value in pixel that is taken relative to the screen resolution (such as mouse movement)
// should be scaled to the correct value in the svg grid.
export function convertToSVGCoords(mapPos: number) {
    const svgMapRatio = mapSVGSize / mapContainerSize;
    return mapPos * svgMapRatio;
}