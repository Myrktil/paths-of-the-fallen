// -------------------------
// Only edit config.template.ts when changing config structure.
// For local settings during development use untracked config.json file.
// To create config.json from the template, use the --reset-config flag when building.
// -------------------------
import { Config } from "../scripts/data/config";

const CONFIG: Config = {
    MAP_IMAGE_FILE: "",

    INITIAL_ZOOM: 1,
    MIN_ZOOM: 1,
    MAX_ZOOM: 1,

    LOGO_ICON_FILE: "",
    LOGO_STRING: "",

    SLIDER_ICON_FILE: "",

    ENABLE_EDIT: true,

    ENABLE_DYNAMIC_ANIMATION_SPEED: true,
    ANIMATION_SPEED: -1,

    CHARACTER_LIST: [],

    LOD_MODE: "none",
    MAP_IMAGE_LOD: [],

    SUB_MAPS: [],

    DISABLED_SHORTCUTS: [],
} as const;
