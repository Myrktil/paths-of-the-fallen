import { loadCredits } from "../data/data-manager";

let aboutContainer: HTMLDivElement;
let aboutButton: HTMLButtonElement;

export function initAboutSection() {
    aboutContainer = document.getElementById("about") as HTMLDivElement;
    aboutButton = document.getElementById("about-button") as HTMLButtonElement;
    aboutButton.addEventListener("click", () => {
        toggleAbout();
    });

    aboutContainer.style.display = "none";

    const container = document.getElementById("credits-container")!;
    const textblocks = container.getElementsByClassName("textblock");
    if (textblocks.length < 1) {
        console.error("Failed to display credits text. Couldn't find textblock element.");
    }
    else {
        loadCredits().then((text) => {
            textblocks[0].innerHTML = text;
        });
    }
}

function toggleAbout() {
    if (aboutContainer.style.display == "") {
        aboutContainer.style.display = "none";
        aboutButton.innerHTML = "About";
        // Set display for all other elements to none to avoid messy z-indexing.
        if (aboutContainer.parentElement) {
            for (const element of aboutContainer.parentElement.childNodes) {
                if (element != aboutContainer && element instanceof HTMLElement) {
                    element.style.display = "";
                }
            }
        }
    }
    else {
        aboutContainer.style.display = "";
        aboutButton.innerHTML = "Home";
        if (aboutContainer.parentElement) {
            for (const element of aboutContainer.parentElement.childNodes) {
                if (element != aboutContainer && element instanceof HTMLElement) {
                    element.style.display = "none";
                }
            }
        }
    }
}
