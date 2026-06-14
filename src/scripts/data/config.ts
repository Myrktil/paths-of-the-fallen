export interface Config {
    readonly INITIAL_ZOOM: number;
    readonly MIN_ZOOM: number;
    readonly MAX_ZOOM: number;
    readonly MAP_IMAGE_FILE: string;
    readonly LOD_MODE: string;
    readonly MAP_IMAGE_LOD: ReadonlyArray<MapImageLODEntry>;
    readonly LOGO_ICON_FILE: string;
    readonly LOGO_STRING:  string;
    readonly SLIDER_ICON_FILE: string;
    readonly ENABLE_EDIT: boolean;
    readonly ENABLE_DYNAMIC_ANIMATION_SPEED: boolean;
    readonly ANIMATION_SPEED: number;
    readonly CHARACTER_LIST: ReadonlyArray<CharacterListEntry>;
    readonly SUB_MAPS: ReadonlyArray<SubMapEntry>;
};

export interface MapImageLODEntry { 
    readonly SCALE: number, 
    readonly FILE: string 
}

export interface CharacterListEntry { 
    readonly NAME: string, 
    readonly FILE: string 
}

export interface SubMapEntry { 
    readonly X: number, 
    readonly Y: number, 
    readonly WIDTH: number, 
    readonly HEIGHT: number, 
    readonly FILE: string 
}