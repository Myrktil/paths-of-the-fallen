import { toggleEditmenu } from "./editmenu-manager";
import { toggleSidemenu } from "./sidemenu-manager";

export enum Shortcut {
    TOGGLE_EDITMENU = "toggle_editmenu",
    TOGGLE_SIDEMENU = "toggle_sidemenu",
}

const shortcuts = new Map<Shortcut, (e: KeyboardEvent) => void>();

export function enableShortcut(shortcut: Shortcut) {
    const func = shortcuts.get(shortcut);
    if (func) {
        document.addEventListener("keydown", func);
    }
}

export function disableShortcut(shortcut: Shortcut) {
    const func = shortcuts.get(shortcut);
    if (func) {
        document.removeEventListener("keydown", func);
    }
}

const toggleEditmenuShortcut = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.code == "KeyE") {
        e.preventDefault();
        toggleEditmenu();
    }
}
shortcuts.set(Shortcut.TOGGLE_EDITMENU, toggleEditmenuShortcut);

const toggleSidemenuShortcut = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.code == "KeyS") {
        e.preventDefault();
        toggleSidemenu();
    }
}
shortcuts.set(Shortcut.TOGGLE_SIDEMENU, toggleSidemenuShortcut);
