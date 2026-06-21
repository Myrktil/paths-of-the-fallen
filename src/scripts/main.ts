import { getConfig } from "./data/config-loader";
import { USER_ASSETS_DIR_PATH } from "./utils/constants";
import { Config } from "./data/config";

import { initEditmenu } from "./controllers/editmenu-manager";
import { initInputDialog } from "./controllers/input-dialog";
import { initAboutSection } from "./controllers/about-section-manager";
import { initMap } from "./map/map-initializer";
import { initSidemenu } from "./controllers/sidemenu-manager";
import { initTooltipDisplayer } from "./controllers/tooltip-displayer";
import { initDataManager } from "./data/data-manager";
import { initOptionsDialog } from "./controllers/options-dialog";

import CharacterDisplayController from "./elements/character-display-controller-element";
import PathEditorCollection from "./elements/path-editor-collection-element";
import CharacterSelector from "./elements/character-selector-element";
import CharacterSearch from "./elements/character-search-element";
import PathEditor from "./elements/path-editor-element";
import Gearshift from "./elements/gearshift-element";
import Character from "./models/character";
import { enableShortcut, Shortcut } from "./controllers/shortcut-manager";

if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () => main());
}
else {
    main();
}

async function main() {
    const CONFIG = await getConfig();
    applyConfig(CONFIG);

    initDataManager(CONFIG.CHARACTER_LIST);

    // Register custom elements.
    CharacterDisplayController.init(CONFIG.SLIDER_ICON_FILE);
    PathEditorCollection.init();
    CharacterSelector.init();
    CharacterSearch.init();
    PathEditor.init();
    Gearshift.init();

    initMap(
        CONFIG.MIN_ZOOM,
        CONFIG.MAX_ZOOM,
        CONFIG.INITIAL_ZOOM,
        CONFIG.LOD_MODE,
        CONFIG.MAP_IMAGE_LOD,
        CONFIG.MAP_IMAGE_FILE,
        CONFIG.SUB_MAPS
    );

    Character.init(CONFIG.ENABLE_DYNAMIC_ANIMATION_SPEED, CONFIG.ANIMATION_SPEED);
    
    initEditmenu();
    initSidemenu();
    initAboutSection();
    initTooltipDisplayer();
    initInputDialog();
    initOptionsDialog();

    for (const shortcut of Object.values(Shortcut)) {
        if (!CONFIG.DISABLED_SHORTCUTS.includes(shortcut)) {
            enableShortcut(shortcut as Shortcut);
        }
    }
}

// Apply config settings to parts which don't fit into any other module.
function applyConfig(config: Config) {
    if (!config.ENABLE_EDIT) {
        const editButtons = document.getElementsByClassName("edit-button") as HTMLCollectionOf<HTMLButtonElement>;
        for (const button of editButtons) {
            button.style.display = "none";
        }
    }

    if (config.LOGO_ICON_FILE != "") {
        const img = document.getElementById("logo-img") as HTMLImageElement;
        img.src = USER_ASSETS_DIR_PATH + config.LOGO_ICON_FILE;
    }

    if (config.LOGO_STRING == "none") {}
    else if (config.LOGO_STRING == "") {
        const logo = document.getElementById("logo-text") as HTMLSpanElement;
        logo.innerHTML = document.title;
    }
    else {
        const logo = document.getElementById("logo-text") as HTMLSpanElement;
        logo.innerHTML = config.LOGO_STRING;
    }
}