import { isMobile, isMobileOrTablet } from "../utils/helpers";
import { USER_ASSETS_DIR_PATH } from "../utils/constants";
import { MapTransformChangedDetail, EVENT_MAP_TRANSFORM_CHANGED } from "./map-dragger";
import { MapImageLODEntry, SubMapEntry } from "../data/config";

let mapContainer: HTMLDivElement;
let currLODScale = 0;
let currLODImg: HTMLDivElement;
let LODSwapDone = true;
let LODActivated = false;
const LODImages: Array<{ readonly SCALE: number, readonly IMG: HTMLDivElement, displayed: boolean }> = [];

export async function renderMap(
    container: HTMLDivElement,
    LODMode: string,
    mapImageLOD: ReadonlyArray<MapImageLODEntry>,
    mapImageFile: string,
    subMaps: ReadonlyArray<SubMapEntry>
) {
    mapContainer = container;

    mapContainer.addEventListener(EVENT_MAP_TRANSFORM_CHANGED, (e) => {
        const event = e as CustomEvent<MapTransformChangedDetail>;
        if (event.detail === undefined) {
            console.error("Invalid detail provided for " + EVENT_MAP_TRANSFORM_CHANGED + " event.");
            return;
        }
        updateLOD(event.detail.newScale);
    });

    if ((LODMode == "mobile" && isMobile())
        || (LODMode == "portable" && isMobileOrTablet())
        || (LODMode == "all")
    ) {
        LODActivated = true;
    }
    if (LODActivated && mapImageLOD.length <= 0) {
        console.error("Failed to enable LOD. LOD was activated but no LOD images where provided.");
        LODActivated = false;
    }

    if (LODActivated) {
        await preloadLOD(mapImageLOD);
    }
    else {
        // Load a single base image as background.
        const img = await createImageElement(USER_ASSETS_DIR_PATH + mapImageFile);
        mapContainer.appendChild(img);
    }

    renderSubMaps(mapImageFile, subMaps);
}

async function renderSubMaps(mapImageFile: string, subMaps: ReadonlyArray<SubMapEntry>) {
    const mapImage = await loadImage(USER_ASSETS_DIR_PATH + mapImageFile);
    
    // Create container that mimics the background map image for easy sub image positioning.
    const subMapContainer = createImageDiv(mapImage.width, mapImage.height, mapContainer);
    subMapContainer.style.zIndex = "99";
    subMapContainer.style.pointerEvents = "none";
    
    mapImage.remove();

    for (const subMap of subMaps) {
        const img = await createImageElement(USER_ASSETS_DIR_PATH + subMap.FILE);

        const imgContainer = document.createElement("div");
        imgContainer.style.position = "absolute";
        imgContainer.style.width = `${subMap.WIDTH}px`;
        imgContainer.style.height = `${subMap.HEIGHT}px`;
        imgContainer.style.left = `${subMap.X - subMap.WIDTH / 2}px`;
        imgContainer.style.top = `${subMap.Y - subMap.HEIGHT / 2}px`;

        imgContainer.appendChild(img);
        subMapContainer.appendChild(imgContainer);
    }
    mapContainer.appendChild(subMapContainer);
}

async function preloadLOD(
    mapImageLOD: ReadonlyArray<MapImageLODEntry>
) {
    // Load one image for each LOD step to later be turned on and off.
    for (let i = 0; i < mapImageLOD.length; i++) {
        const object = mapImageLOD[i];

        const img = await createImageElement(USER_ASSETS_DIR_PATH + object.FILE);
        mapContainer.appendChild(img);
        LODImages.push({ SCALE: object.SCALE, IMG: img, displayed: true });

        // Waiting for the image to actually appear in the DOM somehow helps intialisation
        // which helps avoids lags when zooming into this LOD img for the first time.
        await new Promise(requestAnimationFrame);
    }
}

async function createImageElement(src: string) {
    const testImg = await loadImage(src);
    const imageSize = testImg.naturalHeight * testImg.naturalWidth;

    const imgTilingThreshold = 2048;
    if (imageSize < imgTilingThreshold * imgTilingThreshold) {
        const imgFull = await loadImage(src);
        imgFull.decoding = "async";
        imgFull.style.display = "block";
        imgFull.style.position = "absolute";
        imgFull.style.top = "50%";
        imgFull.style.left = "50%";
        imgFull.style.transform = "translate(-50%, -50%)";
        imgFull.style.width = "100%";
        imgFull.style.height = "100%";
        imgFull.style.objectFit = "contain";
        imgFull.classList.add("custom-image");
        await imgFull.decode();
        return imgFull;
    }
    else {
        // Use tiling for larger images to make sure that they can be decoded.
        const tiledImg = await tileImage(src, imgTilingThreshold, imgTilingThreshold);
        tiledImg.classList.add("custom-image");
        return tiledImg;
    }
}

async function tileImage(imageUrl: string, tileWidth: number, tileHeight: number): Promise<HTMLDivElement>{
    const image = await loadImage(imageUrl);

    const cols = Math.ceil(image.width / tileWidth);
    const rows = Math.ceil(image.height / tileHeight);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d")!;
    canvas.width = tileWidth;
    canvas.height = tileHeight;

    const mapRaster = createImageDiv(image.width, image.height, mapContainer);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * tileWidth;
            const y = row * tileHeight;

            ctx.clearRect(0, 0, tileWidth, tileHeight);
            ctx.drawImage(
                image,
                x, y, tileWidth, tileHeight,
                0, 0, tileWidth, tileHeight
            );

            let url;
            try {
                url = await canvasToBlobURL(canvas);
            }
            catch {
                console.error(`Failed to tile map at row ${row} and colum ${col}.`);
                continue;
            }

            const tile = await loadImage(url);
            tile.loading = "eager";
            tile.decoding = "async";
            tile.style.position = "absolute";
            tile.style.left = `${col * tileWidth}px`;
            tile.style.top = `${row * tileHeight}px`;
            await tile.decode();
            mapRaster.appendChild(tile);
        }
    }

    canvas.remove();
    image.remove();
    
    return mapRaster;
}

// Create a div that behaves like an image element with object-fit:contain.
function createImageDiv(imageWidth: number, imageHeight: number, parent: HTMLElement) {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.width = `${imageWidth}px`;
    container.style.height = `${imageHeight}px`;

    parent.appendChild(container);

    // Mimic object-fit:contain behavior for the raster container and center the image.
    const scale = Math.min(
        mapContainer.offsetWidth / container.offsetWidth, 
        mapContainer.offsetHeight / container.offsetHeight
    );
    container.style.left = `${mapContainer.offsetWidth / 2}px`;
    container.style.top = `${mapContainer.offsetHeight / 2}px`;
    container.style.transform = `translate(-50%, -50%) scale(${scale})`;

    parent.removeChild(container);

    return container;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (error) => {
            console.error("Failed to load image due to:" + error); 
            reject();
        };
        img.src = url;
    });
}

function canvasToBlobURL(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Failed to create blob from canvas."));
                return;
            }
            const url = URL.createObjectURL(blob);
            resolve(url);
        }, "image/png", 1);
    });
}

async function updateLOD(newScale: number) {
    if (!LODActivated || !LODSwapDone) {
        return;
    }

    let img = LODImages[0].IMG;
    let scale = LODImages[0].SCALE;
    for (const entry of LODImages) {
        if (entry.SCALE > newScale) {
            img = entry.IMG;
            scale = entry.SCALE;
        }
        else {
            break;
        }
    }

    if (scale == currLODScale) {
        return;
    }

    LODSwapDone = false;
    currLODImg = img;
    requestAnimationFrame(lodSwapFrame);

    currLODScale = scale;
}

function lodSwapFrame() {
    for (const entry of LODImages) {
        if (entry.IMG != currLODImg && entry.displayed == true) {
            entry.IMG.remove();
            entry.displayed = false;
        }
        else if (entry.IMG == currLODImg && entry.displayed == false) {
            mapContainer.appendChild(entry.IMG);
            entry.displayed = true;
        }

    }
    LODSwapDone = true;
}
