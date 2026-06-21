import CharacterSelector from "../elements/character-selector-element";
import CharacterDisplayController from "../elements/character-display-controller-element";
import { storeAsFile } from "../data/data-manager";
import { getMapContainer } from "../map/map-initializer";
import EditCharacter from "../models/edit-character";
import EditPath from "../models/edit-path";
import { convertToSVGCoords } from "../map/map-initializer";

let currCharacter: EditCharacter | null = null;
let hideAnimationTime: number;
let editmenu: HTMLElement;
let editButtons: HTMLCollectionOf<HTMLButtonElement>;

export function initEditmenu() {
    editmenu = document.getElementById("editmenu")! as HTMLElement;
    editButtons = document.getElementsByClassName("edit-button") as HTMLCollectionOf<HTMLButtonElement>;
    for (const button of editButtons) {
        button.addEventListener("click", () => {
            toggleEditmenu();
        });
    }

    const newCharButton = document.getElementById("new-character-button") as HTMLButtonElement;
    newCharButton.addEventListener("click", () => {
        createCharacter();
    });
    const createPathButton = document.getElementById("create-path-button") as HTMLButtonElement;
    createPathButton.addEventListener("click", () => {
        createPath();
    });
    const redrawButton = document.getElementById("edit-coord-button") as HTMLButtonElement;
    redrawButton.addEventListener("click", (e) => {
        document.addEventListener("pointerdown", printCoords);
    });
    const saveButton = document.getElementById("edit-save-button") as HTMLButtonElement;
    saveButton.addEventListener("click", () => {
        save();
    });
    const savePrettyButton = document.getElementById("edit-save-pretty-button") as HTMLButtonElement;
    savePrettyButton.addEventListener("click", () => {
        savePretty();
    });

    hideAnimationTime = parseFloat(
        (getComputedStyle(editmenu).transition));

    editmenu.style.transform = `translate(${editmenu.clientWidth}px)`;
    editmenu.style.display = "none";

    const characterSelector = editmenu.querySelector(".character-selector") as CharacterSelector;
    characterSelector.confirmed = editCharacter;

    // Move editmenu into the normal hidden position to not skip first toggle animation.
    // Must be hidden in html from the start for cleaner looking page loading.
    editmenu.style.display = "";
    editmenu.style.transform = `translate(${editmenu.clientWidth}px)`;
    editmenu.style.display = "none";
}

export function toggleEditmenu() {
    if (!(editmenu.style.display == "none")) {
        editmenu.style.transform = `translate(${editmenu.clientWidth}px)`;
        setTimeout(function() {
            editmenu.style.display = "none";
        }, hideAnimationTime * 1000);
        for (const button of editButtons) {
            button.innerHTML = "Edit";
        }
    }
    else {
        editmenu.style.display = "";

        // Force css reflow to make sure the transition works.
        void editmenu.offsetWidth; 

        editmenu.style.transform = "translate(0px)";
        for (const button of editButtons) {
            button.innerHTML = "Close";
        }
    }
}

function editCharacter(name: string) {
    addDisplayController(name, CharacterDisplayController.CreationMethod.LOAD);
}

function createCharacter() {
    let input = editmenu.querySelector(".character-selector") as CharacterSelector;
    let charName: string = input.popValue();
    addDisplayController(charName, CharacterDisplayController.CreationMethod.CREATE);
    input.reset();
}

function getCurrEditCharacterController(): CharacterDisplayController | null {
    return editmenu.querySelector(".character-display-controller") as CharacterDisplayController;
}

async function addDisplayController(
    name: string, 
    method: CharacterDisplayController.CreationMethod
) {
    let controllers = document.getElementsByClassName(
        CharacterDisplayController.ELEMENT_NAME) as HTMLCollectionOf<CharacterDisplayController>;

    // Remove old edit elements.
    let currController = getCurrEditCharacterController();
    if (currController != null) {
        currController.dispose();
    }

    // Remove other display controllers for this character.
    for (let i = 0; i < controllers.length; i++) {
        let controller: CharacterDisplayController = controllers[i];
        if (controller.character.name == name) {
            controller.dispose();
        }
    }

    const controller: CharacterDisplayController | null = 
        await CharacterDisplayController.create(name, method, true);
    
    if (controller != null) {
        const container = editmenu.querySelector(".character-display-controller-container") as HTMLDivElement;
        container.appendChild(controller);

        currCharacter = controller.character as EditCharacter;
        if (currCharacter instanceof EditCharacter) {
            const container = editmenu.querySelector(".path-editor-collection-container");
            if (!container) {
                console.error("Unable to access path-editor-collection-container in editmenu.");
            }
            else {
                container.appendChild(currCharacter.pathEditorCollection);
            }
        }
        else {
            console.error("Characters created in the editmenu must be EditCharacters!");
        }

        controller.addEventListener(CharacterDisplayController.EVENT_DISPOSED, clearCharacter);
    }
}

function clearCharacter() {
    if (currCharacter) {
        currCharacter.dispose();
        currCharacter = null;
    }
}

function createPath() {
    if (currCharacter == null) {
        return;
    }
    
    const rect: DOMRect = getMapContainer().getBoundingClientRect();
    const scale = rect.width / getMapContainer().offsetWidth;
    // Get part of map that is currently in the center of the screen.
    const screenCenterX: number = convertToSVGCoords((-(rect.left) + (window.innerWidth / 2)) / scale);
    const screenCenterY: number = convertToSVGCoords((-(rect.top) + (window.innerHeight / 2)) / scale);
    let initialLenght: number = 300 / scale;
    const minLenghtFactor = 20;

    const activeEditorIndex = currCharacter.pathEditorCollection.getActiveEditorIndex();

    let newPath: EditPath;

    if (activeEditorIndex >= 0) {
        const activePath = currCharacter.paths[activeEditorIndex];
        const width = activePath.width;
        const book = activePath.book;
        const color = activePath.color;
        const minLength = minLenghtFactor * width;
        if (initialLenght < minLength) {
            initialLenght = minLength;
        }

        // Create the new path as an extension to the previous path.
        const activePathDirectionX = (activePath.endPointX - activePath.controlPoint1X) / activePath.length;
        const activePathDirectionY = (activePath.endPointY - activePath.controlPoint1Y) / activePath.length;

        const vectorLength = Math.sqrt(Math.pow(activePathDirectionX, 2) + Math.pow(activePathDirectionY, 2));
        
        const normalizedX = activePathDirectionX / vectorLength;
        const normalizedY = activePathDirectionY / vectorLength;

        newPath = new EditPath(
            0, 0,
            false,
            0, color,
            book,
            width,
            activePath.endPointX, activePath.endPointY,
            activePath.endPointX + initialLenght * normalizedX, activePath.endPointY + initialLenght * normalizedY,
            activePath.endPointX + initialLenght * normalizedX * 1/3, activePath.endPointY + initialLenght * normalizedY * 1/3,
            activePath.endPointX + initialLenght * normalizedX * 2/3, activePath.endPointY + initialLenght * normalizedY * 2/3,
            [currCharacter.drawGroupName],
        );
    }
    else {
        let width: number;
        let book: number;
        let color: string;
        if (currCharacter.paths.length > 0) {
            const lastPath = currCharacter.paths[currCharacter.paths.length - 1];
            width = lastPath.width;
            book = lastPath.book;
            color = lastPath.color;
        }
        else {
            width = 1;
            book = 1;
            color = "#FF0000";
        }
        const minLength = minLenghtFactor * width;
        if (initialLenght < minLength) {
            initialLenght = minLength;
        }

        // Create new path in the middle of the screen.
        newPath = new EditPath(
            0, 0,
            false,
            0, color,
            book,
            width,
            screenCenterX - initialLenght / 2, screenCenterY,
            screenCenterX + initialLenght / 2, screenCenterY,
            screenCenterX - initialLenght / 4, screenCenterY,
            screenCenterX + initialLenght / 4, screenCenterY,
            [currCharacter.drawGroupName],
        );
    }

    currCharacter.pathEditorCollection.insertAfterActive(newPath);
}

function save() {
    if (currCharacter) {
        storeAsFile(currCharacter);
    }
}

function savePretty() {
    if (currCharacter) {
        storeAsFile(currCharacter, true);
    }
}

function printCoords(e: PointerEvent) {
    const mapImage = getMapContainer().querySelector(".custom-image") as HTMLDivElement | HTMLImageElement;
    if (mapImage) {
        const imgRect = mapImage.getBoundingClientRect();

        const imgScaleX = imgRect.width / mapImage.offsetWidth;
        const imgScaleY = imgRect.height / mapImage.offsetHeight;

        // Pointer relative to rendered image box
        const x = (e.clientX - imgRect.left) / imgScaleX;
        const y = (e.clientY - imgRect.top) / imgScaleY;

        console.log("Position relative to background map:\n" +
            `x: ${x}\n` +
            `y: ${y}`
        );
    }
    else {
        console.error("Failed to access map image.");
    }

    const containerRect = getMapContainer().getBoundingClientRect();

    const containerScaleX = containerRect.width / getMapContainer().offsetWidth;
    const containerScaleY = containerRect.height / getMapContainer().offsetHeight;

    const containerX = (e.clientX - containerRect.left) / containerScaleX;
    const containerY = (e.clientY - containerRect.top) / containerScaleY;

    console.log("Position relative to path SVG grid:\n" +
        `x: ${convertToSVGCoords(containerX)}\n` +
        `y: ${convertToSVGCoords(containerY)}`
    );

    document.removeEventListener("pointerdown", printCoords);
}
