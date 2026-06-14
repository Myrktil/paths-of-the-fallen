let dialog: HTMLDialogElement;
let textArea: HTMLTextAreaElement;
let saveButton: HTMLButtonElement;
let cancelButton: HTMLButtonElement;

export function initInputDialog() {
    dialog = document.createElement("dialog");
    dialog.classList.add("dialog");
    
    textArea = document.createElement("textarea");
    textArea.cols = 40;
    textArea.rows = 5;
    textArea.classList.add("dialog-text-input");
    dialog.appendChild(textArea);

    const buttonRow = document.createElement("div");
    buttonRow.classList.add("dialog-button-row");
    dialog.appendChild(buttonRow);

    cancelButton = document.createElement("button");
    cancelButton.classList.add("dialog-button-row-button");
    cancelButton.innerHTML = "Cancel";
    buttonRow.appendChild(cancelButton);

    saveButton = document.createElement("button");
    saveButton.classList.add("dialog-button-row-button");
    saveButton.innerHTML = "Save";
    buttonRow.appendChild(saveButton);

    document.body.appendChild(dialog);
}

export function showInputDialog(text: string) {
    dialog.showModal();

    textArea.value = text;

    return new Promise<string>((resolve, reject) => {
        const handleSave = () => {
            saveButton.removeEventListener("click", handleSave);
            cancelButton.removeEventListener("click", handleCancel);
            dialog.removeEventListener("cancel", handleCancel);
            resolve(textArea.value);
            dialog.close();
        };

        const handleCancel = () => {
            saveButton.removeEventListener("click", handleSave);
            cancelButton.removeEventListener("click", handleCancel);
            dialog.removeEventListener("cancel", handleCancel);
            reject();
            dialog.close();
        };

        saveButton.addEventListener("click", handleSave);
        cancelButton.addEventListener("click", handleCancel);
        dialog.addEventListener("cancel", handleCancel);
    });
}
