import { LineStyle } from "../map/map-drawer";
import { USER_ASSETS_DIR_PATH, DATA_DIR_PATH } from "../utils/constants";
import EditPath from "../models/edit-path";
import DisplayPath from "../models/display-path";
import Character from "../models/character";
import Tooltips from "../models/tooltips";
import { CharacterListEntry } from "./config";

// <CharacterName, CharacterFileName>
let characterMap: ReadonlyMap<string, string>;

export interface LoadedCharacter {
    paths: JsonPath[];
    tooltips: Tooltips.Tooltip[];
}

export function initDataManager(
    characterList: ReadonlyArray<CharacterListEntry>
) {
    characterMap = new Map(characterList.map(obj => [obj.NAME, obj.FILE]));
}

export function getDisplayableCharacters() {
    return Array.from(characterMap.keys());
}

export async function loadCharacter(name: string): Promise<LoadedCharacter> {
    if (!(getDisplayableCharacters().includes(name))) {
        console.error("\"" + name + "\" is not among the displayable characters.");
        return { paths: [], tooltips: [] };
    }

    const filePath = DATA_DIR_PATH + "paths/" + characterMap.get(name);

    try {
        const response = await fetch(filePath);
        const characterObject = await response.json() as LoadedCharacter;

        const tooltips = characterObject.tooltips;
        const paths = [];
        for (const pathObject of characterObject.paths) {
            const path = Object.assign(JsonPath.createEmpty(), pathObject);
            paths.push(path);
        }

        const character: LoadedCharacter = {
            paths: paths,
            tooltips: tooltips,
        }

        return character;
    }
    catch (e) {
        // SyntaxError also occurs when the file is missing.
        if (e instanceof SyntaxError) {
            console.error("Failed to load \"" + filePath + "\".\n"
                + "Make sure that the file is placed in the correct folder.\n" 
                + "Error: " + e.message);
        }
        return { paths: [], tooltips: []} ;
    }
}

export function storeAsFile(character: Character, pretty: boolean = false) {
    let json;
    if (pretty) {
        json = JSON.stringify(character, null, 2);
    }
    else {
        json = JSON.stringify(character);
    }
    
    const filename = character.name.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-zA-Z0-9\-]/g, '') + "-data.json";

    const downloadHelper = document.createElement('a');
    downloadHelper.setAttribute(
        'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
    downloadHelper.setAttribute('download', filename);
    downloadHelper.style.display = 'none';
    document.body.appendChild(downloadHelper);

    downloadHelper.click();

    document.body.removeChild(downloadHelper);
}

export async function loadCredits(): Promise<string> {
    const response = await fetch(DATA_DIR_PATH + "credits.txt");

    if (response.status == 404) {
        console.error("Failed to load credits. \"" + USER_ASSETS_DIR_PATH 
            + "credits.txt\" could not be found.");
    }
    else if (!response.ok) {
        console.error("Failed to load credits.\nReponse status: " + response.status);
    }
    else {
        try {
            const text = await response.text();
            return text;
        }
        catch (e) {
            if (e instanceof Error) {
                console.error("An error occured while loading credits.\nError: " + e.message);
            }
        }
    }

    return "";
}

export class JsonPath {
    private id: number;
    private sectionId: number;
    private isEndOfSection: boolean;
    private style: LineStyle;
    private color: string;
    private book: number;
    private width: number;
    private startPointX: number;
    private startPointY: number;
    private endPointX: number;
    private endPointY: number;
    private controlPoint0X: number;
    private controlPoint0Y: number;
    private controlPoint1X: number;
    private controlPoint1Y: number;

    constructor(
        id: number,
        sectionId: number,
        isEndOfSection: boolean,
        style: LineStyle,
        color: string,
        book: number,
        width: number,
        startPointX: number,
        startPointY: number,
        endPointX: number,
        endPointY: number,
        controlPoint0X: number,
        controlPoint0Y: number,
        controlPoint1X: number,
        controlPoint1Y: number,
    ) {
        this.id = id;
        this.sectionId = sectionId;
        this.isEndOfSection = isEndOfSection;
        this.style = style;
        this.color = color;
        this.book = book;
        this.width = width;
        this.startPointX = startPointX;
        this.startPointY = startPointY;
        this.endPointX = endPointX;
        this.endPointY = endPointY;
        this.controlPoint0X = controlPoint0X;
        this.controlPoint0Y = controlPoint0Y;
        this.controlPoint1X = controlPoint1X;
        this.controlPoint1Y = controlPoint1Y;
    }

    public static createEmpty(): JsonPath {
        return new JsonPath(
            1, 1,
            false,
            0, "#FF0000", 1, 1,
            0, 0,
            0, 0,
            0, 0,
            0, 0
        );
    }

    public convertToEditPath(parentGroupIds: string[]): EditPath {
        return new EditPath(
            this.id, this.sectionId,
            this.isEndOfSection,
            this.style, this.color, this.book, this.width,
            this.startPointX, this.startPointY,
            this.endPointX, this.endPointY,
            this.controlPoint0X, this.controlPoint0Y,
            this.controlPoint1X, this.controlPoint1Y,
            parentGroupIds,
        );
    }

    public convertToDisplayPath(parentGroupIds: string[]): DisplayPath {
        return new DisplayPath(
            this.id, this.sectionId,
            this.isEndOfSection,
            this.style, this.color, this.book, this.width,
            this.startPointX, this.startPointY,
            this.endPointX, this.endPointY,
            this.controlPoint0X, this.controlPoint0Y,
            this.controlPoint1X, this.controlPoint1Y,
            parentGroupIds,
        );
    }
}

