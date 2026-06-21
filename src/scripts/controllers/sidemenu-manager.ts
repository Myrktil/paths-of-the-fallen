import CharacterSelector from "../elements/character-selector-element";
import CharacterDisplayController from "../elements/character-display-controller-element";
import DisplayCharacter from "../models/display-character";

let sidemenu: HTMLElement;
let transitionTime = 0.25;
let sidemenuDisplay = "flex";
let characterSelector: CharacterSelector;
let spoilerProtectionActive = false;
let spoilerToggle : HTMLInputElement;

export function initSidemenu() {
    sidemenu = document.getElementById("sidemenu")! as HTMLElement;
    characterSelector = sidemenu.querySelector(".character-selector") as CharacterSelector;
    sidemenu.style.display = "flex";
    
    // Initially hide sidemenu on smaller screens.
    if (visualViewport && visualViewport.width > 768) {
        sidemenu.style.transform = "translate(0px)";
    }
    else {
        sidemenu.style.transform = `translate(${-sidemenu.clientWidth}px)`;
        sidemenu.style.display = "none";
    }

    sidemenu.style.transition = `${transitionTime}s`;

    spoilerToggle = document.getElementById("spoiler-toggle") as HTMLInputElement;
    spoilerToggle.addEventListener("input", () => {
        setSpoilerProtection(spoilerToggle.checked);
    });
    setSpoilerProtection(true);

    const activate = document.getElementById("navbar-activate") as HTMLButtonElement;
    activate.addEventListener("click", () => {
        toggleSidemenu();
    });
    const deactivate = document.getElementById("navbar-deactivate") as HTMLButtonElement;
    deactivate.addEventListener("click", () => {
        toggleSidemenu();
    });

    characterSelector.confirmed = displayCharacter;
}

async function displayCharacter(name: string) {
    const container = sidemenu.querySelector(".character-display-controller-container") as HTMLDivElement;

    const controller = await CharacterDisplayController.create(
        name, 
        CharacterDisplayController.CreationMethod.LOAD, 
        false
    );

    if (!controller) {
        return;
    }

    container.appendChild(controller);
    container.scrollTop = container.scrollHeight;

    if (spoilerProtectionActive && controller.character instanceof DisplayCharacter) {
        controller.character.activateSpoilerProtection();
    }
}

export function toggleSidemenu() {
    // Initially displayed.
    if (sidemenu.style.display != "none") {
        sidemenu.style.transform = `translate(${-sidemenu.clientWidth}px)`;
        setTimeout(function() {
            sidemenu.style.display = "none";
        }, transitionTime * 1000);
        document.body.style.backgroundColor = "var(--map-background)";
    }
    // Initially hidden.
    else {
        sidemenu.style.display = sidemenuDisplay;
        // Animation doesn't work when changing translate immediately after setting display.
        setTimeout(function() {
            sidemenu.style.transform = "translate(0px)";
        }, 1);
        document.body.style.backgroundColor = "var(--editmenu-background)";
    }
}

function setSpoilerProtection(value: boolean) {
    spoilerProtectionActive = value;
    spoilerToggle.checked = value;
    const controllerElements = sidemenu.getElementsByClassName(CharacterDisplayController.ELEMENT_NAME);
    for (const element of controllerElements) {
        const controller = element as CharacterDisplayController;
        if (controller.character instanceof DisplayCharacter) {
            if(spoilerProtectionActive) {
                controller.character.activateSpoilerProtection();
            }
            else {
                controller.character.deactivateSpoilerProtection();
            }
        }
    }
}
