import { showOptionsDialog } from "../controllers/options-dialog";
import { showInputDialog } from "../controllers/input-dialog";

export class Tooltips {
    private tooltips: Tooltips.Tooltip[];

    constructor(values: Tooltips.Tooltip[] = []) {
        this.tooltips = values;
    }

    public async addTooltipAt(index: number) {
        const question = "You have just split a section in two. How do you want to proceed?<br>" +
            "1: Insert empty tooltips <strong>before</strong> the edited path. " +
                "The previous tooltip will be assigned to the section <strong>after</strong> the edited path.<br>" +
            "2: Insert empty tooltips <strong>after</strong> the edited path. " +
                "The previous tooltip will be assigned to the section <strong>before</strong> the edited path.<br>";

        const option = await showOptionsDialog(question, 2, true).catch(error => { 
            throw Error("No decision made, data is now inconsistent.");
        });

        if (option == 1) {
            // Insert a new tooltip before the new EndOfSection.
            this.tooltips.splice(
                index, 
                0, 
                { curve: "", endPoint: "" }
            );
        }
        else {
            // Insert a new tooltip after the new EndOfSection.
            this.tooltips.splice(
                index + 1, 
                0, 
                { curve: "", endPoint: "" }
            );
        }
    }

    public async removeTooltipAt(index: number) {
        const question = "You have just merged two sections. How do you want to proceed?<br>" +
            "1: Overwrite the tooltips of the section <strong>before</strong> the edited path " + 
                "with the tooltips of the section <strong>after</strong> the edited path.<br>" + 
            "2: Overwrite the tooltips of the section <strong>after</strong> the edited path " + 
                "with the tooltips of the section <strong>before</strong> the edited path.";
        
        const option = await showOptionsDialog(question, 2, true).catch(error => {
            throw Error("No decision made, data is now inconsistent.");
        });

        if (option == 1) {
            // Delete the tooltip entry for the section before the new EndOfSection.
            this.tooltips.splice(index, 1);
        }
        else {
            // Delete the tooltip entry for the section after the new EndOfSection.
            this.tooltips.splice(index + 1, 1);
        }
    }

    public editTooltipAt(index: number, type: Tooltips.TooltipType) {
        const previousTexts = this.getTooltipsAt(index);
        switch (type) {
            case Tooltips.TooltipType.CURVE:
                showInputDialog(previousTexts.curve).then(
                    (newText: string) => {
                        const newTooltip = { curve: newText, endPoint: previousTexts.endPoint };
                        this.setTooltipsAt(index, newTooltip);
                    },
                    () => {
                        return;
                    }
                );
                break;
            case Tooltips.TooltipType.END_POINT:
                showInputDialog(previousTexts.endPoint).then(
                    (newText: string) => {
                        const newTooltip = { curve: previousTexts.curve, endPoint: newText };
                        this.setTooltipsAt(index, newTooltip);
                    },
                    () => { 
                        return; 
                    }
                );
                break;
        }
    }

    public trimFrom(index: number) {
        this.tooltips.splice(index);
    }

    public getTooltipsAt(index: number): Tooltips.Tooltip {
        if (index > this.tooltips.length - 1 || index < 0) {
            return { curve: "", endPoint: "" };
        }
        else {
            return this.tooltips[index];
        }
    }

    private setTooltipsAt(index: number, tooltips: Tooltips.Tooltip) {
        if (index < 0) {
            return;
        }

        if (index >= this.tooltips.length) {
            let delta = index - this.tooltips.length + 1;
            while (delta--) {
                this.tooltips.push({ curve: "", endPoint: "" });
            }
        }
        this.tooltips[index] = tooltips;
    }

    public toJSON() {
        return this.tooltips;
    }
}

export namespace Tooltips {
    export interface Tooltip {
        curve: string;
        endPoint: string;
    }

    export enum TooltipType {
        CURVE,
        END_POINT,
    }
}

export default Tooltips;