import { clamp } from "../utils/helpers";

let dialog: HTMLDialogElement;
let questionElement: HTMLSpanElement;
let optionButtons: HTMLButtonElement[];

const maxOptionsCount = 8;

export function initOptionsDialog() {
    dialog = document.createElement("dialog");
    dialog.classList.add("dialog");

    questionElement = document.createElement("span");
    questionElement.classList.add("dialog-text");
    dialog.appendChild(questionElement);

    const buttonRow = document.createElement("div");
    buttonRow.classList.add("dialog-button-row");
    dialog.appendChild(buttonRow);

    optionButtons = [];
    for (let i = 0; i < maxOptionsCount; i++) {
        const optionButton = document.createElement("button");
        optionButton.innerHTML = `${i + 1}`;
        optionButton.classList.add("dialog-button-row-button");
        optionButton.style.display = "none";
        buttonRow.appendChild(optionButton);
        optionButtons.push(optionButton);
    }

    document.body.appendChild(dialog);
}

export function showOptionsDialog(question: string, optionsCount: number, forceDecision: boolean) {
    questionElement.innerHTML = question;
    if (optionsCount > maxOptionsCount) {
        console.warn("Options window can only display up to " + maxOptionsCount + " options.");
    }
    optionsCount = clamp(optionsCount, 0, maxOptionsCount);
    for (let i = 0; i < maxOptionsCount; i++) {
        if (i < optionsCount) {
            optionButtons[i].style.display = "";
        }
        else {
            optionButtons[i].style.display = "none";
        }
    }

    dialog.showModal();

    return new Promise<number>((resolve, reject) => {
        const handlers: (() => void)[] = [];

        const handleChoice = (option: number) => {
            for (let i = 0; i < optionsCount; i++) {
                optionButtons[i].removeEventListener("click", handlers[i]);
            }
            dialog.removeEventListener("cancel", handleCancel);
            dialog.close();
            resolve(option);
        };

        const handleCancel = (e: Event) => {
            e.preventDefault();
            if (!forceDecision) {
                for (let i = 0; i < optionsCount; i++) {
                    optionButtons[i].removeEventListener("click", handlers[i]);
                }
                dialog.removeEventListener("cancel", handleCancel);
                dialog.close();
                reject();
            }
        };

        for (let i = 0; i < optionsCount; i++) {
            const handler = () => handleChoice(i + 1);
            optionButtons[i].addEventListener("click", handler);
        }
        dialog.addEventListener("cancel", handleCancel);
    });
}