import { clamp } from "../utils/helpers";
import { getStrokeProperties, LineStyle, undrawElementsInGroup } from "../map/map-drawer";
import Disposable from "../utils/disposable";
import Pathlike from "./pathlike";
import Tooltips from "./tooltips";

abstract class Character extends EventTarget implements Disposable {
    public readonly name: string;
    // What paths should be drawn.
    private _startingBook = 1;
    private _endBook = 1;
    protected maxBook = 1;

    private _restrictBySection = false;
    private _endSection = 0;

    private static dynamicAnimationSpeedEnabled = true;
    private static animationStepLength = 0.2;
    private _isAnimated = false;
    private _endId = 0;
    private currAnimationInterval = 0;
    private blockAnimationDecrease = true;
    private blockAnimationIncrease = false;
    private changedPaths: Set<Pathlike> = new Set();
    private static readonly ANIMATION_INTERVAL_DELAY = 10;
    public static readonly EVENT_ANIMATION_STATE_CHANGED = "character:progress-state-changed";

    public readonly drawGroupName;

    protected abstract readonly tooltips: Tooltips;

    public static readonly EVENT_PROPERTY_CHANGED = "character:property-changed";

    public static init(enableDynamicAnimationSpeed: boolean, animationSpeed: number) {
        Character.dynamicAnimationSpeedEnabled = enableDynamicAnimationSpeed;
        if (animationSpeed > 0) {
            Character.animationStepLength = animationSpeed;
        }
    }

    protected constructor (name: string) {
        super();

        this.name = name;
        this.drawGroupName = name;

        this.addEventListener(
            Character.EVENT_PROPERTY_CHANGED, 
            (e) => 
        {
            const event = e as CustomEvent<Character.PropertyChangedDetail>;
            if (event.detail === undefined) {
                console.error("Invalid detail provided for " + Character.EVENT_PROPERTY_CHANGED + " event.");
                return;
            }

            // Animation often breaks when other properties are changed.
            // Also filter restictBySection since it has a radio button relationship with 
            // isAnimated which it better implemented using the setter and getter.
            if (
                event.detail.property != Character.Property.ANIMATION_STATE && 
                event.detail.property != Character.Property.IS_ANIMATED &&
                event.detail.property != Character.Property.RESTRICT_BY_SECTION
            ) {
                this.deactivateAnimation();
            }

            if (event.detail.property == Character.Property.MAX_SECTION) {
                // Clamp endSection to the new value.
                this.endSection = this.endSection;
            }

            this.draw();
        });
    }

    public set startingBook(value: number) {
        if (isNaN(value)) {
            value = 1;
        }

        value = clamp(value, 1, this.maxBook);
        value = clamp(value, 1, this.endBook);

        this._startingBook = value;
        this.dispatchEvent(
            Character.createChangedEvent(Character.Property.STARTING_BOOK)
        );
    }

    public set endBook(value: number) {
        if (isNaN(value)) {
            value = 1;
        }

        value = clamp(value, 1, this.maxBook);
        value = clamp(value, this.startingBook, this.maxBook);

        this._endBook = value;
        this.dispatchEvent(
            Character.createChangedEvent(Character.Property.END_BOOK)
        );
    }

    private set isAnimated(value: boolean) {
        this._isAnimated = value;
        if (value) {
            // Don't use radio buttons to allow user to unselect both additional filter options.
            this.restrictBySection = false;
        }
        this.dispatchEvent(Character.createChangedEvent(
            Character.Property.IS_ANIMATED
        ));
    }

    public set restrictBySection(value: boolean) {
        this._restrictBySection = value;
        if (value) {
            // Don't use radio buttons to allow user to unselect both additional filter options.
            this.deactivateAnimation();
        }
        this.dispatchEvent(Character.createChangedEvent(
            Character.Property.RESTRICT_BY_SECTION
        ));
    }

    public set endSection(value: number) {
        if (this.paths.length > 0) {
            value = clamp(value, 0, this.paths[this.paths.length - 1].sectionId);
        }
        else {
            value = 1;
        }
        this._endSection = value;
        this.dispatchEvent(Character.createChangedEvent(
            Character.Property.END_SECTION
        ));
    }

    private set endId(value: number) {
        const pathsLength = this.paths.length;
        if (pathsLength > 0) {
            value = clamp(value, 0, this.paths[pathsLength - 1].pathId);
        }
        else {
            value = 0;
        }
        
        this._endId = value;
    }

    public abstract get paths(): readonly Pathlike[];

    public get startingBook() {
        return this._startingBook;
    }

    public get endBook() {
        return this._endBook;
    }

    public get isAnimated() {
        return this._isAnimated;
    }

    public get restrictBySection() {
        return this._restrictBySection;
    }

    public get endSection() {
        return this._endSection;
    }

    private get endId() {
        return this._endId;
    }

    public activateAnimation() {
        let firstPath = this.getFirstPathToDraw(); 
        if (firstPath < 0) {
            return;
        }
        
        this.endId = firstPath;
        this.blockAnimationDecrease = true;
        this.blockAnimationIncrease = false;
        for (const path of this.paths) {
            path.drawUntil = 0;
        }
        this.isAnimated = true;
    }

    public deactivateAnimation() {
        this.blockAnimationDecrease = true;
        this.blockAnimationIncrease = false;
        this.changeAnimationState(Character.AnimationState.STOP);
        for (const path of this.paths) {
            path.drawUntil = -1;
        }
        this.isAnimated = false;
    }

    public changeAnimationState(mode: Character.AnimationState) {
        this.stopAnimationProgress();

        // Catch invalid directions here already to avoid ui lags from the handle jumping around.
        if ((mode == Character.AnimationState.DECREASE_FAST ||
            mode == Character.AnimationState.DECREASE_MEDIUM ||
            mode == Character.AnimationState.DECREASE_SLOW) &&
            this.blockAnimationDecrease
        ) {
            mode = Character.AnimationState.STOP;
        }
        else if ((mode == Character.AnimationState.INCREASE_FAST ||
            mode == Character.AnimationState.INCREASE_MEDIUM ||
            mode == Character.AnimationState.INCREASE_SLOW) &&
            this.blockAnimationIncrease
        ) {
            mode = Character.AnimationState.STOP;
        }


        if (mode != Character.AnimationState.STOP) {
            if (!this.isAnimated) {
                this.activateAnimation();
                // Fail gracefully after failing to activate animation, propably due to no path being drawable.
                if (!this.isAnimated) {
                    this.deactivateAnimation();
                    this.changeAnimationState(Character.AnimationState.STOP);
                    return;
                }
            }

            this.currAnimationInterval = setInterval(
                () => this.progressAnimation(mode), 
                Character.ANIMATION_INTERVAL_DELAY
            );
        }

        const event = new CustomEvent<Character.AnimationStateChangedDetail>(
            Character.EVENT_ANIMATION_STATE_CHANGED, 
            { detail: { state: mode } }
        );
        this.dispatchEvent(event);
    }

    private stopAnimationProgress() {
        clearInterval(this.currAnimationInterval);
    }

    private progressAnimation(mode: Character.AnimationState) {
        let stepLength = Character.animationStepLength;
        const currentPath = this.paths[this.endId];
        let speedMultiplier;
        Character.dynamicAnimationSpeedEnabled ? speedMultiplier = currentPath.width: speedMultiplier = 1;

        switch (mode) {
            case Character.AnimationState.DECREASE_FAST:
                stepLength *= -20 * speedMultiplier;
                break;
            case Character.AnimationState.DECREASE_MEDIUM:
                stepLength *= -4 * speedMultiplier;
                break;
            case Character.AnimationState.DECREASE_SLOW:
                stepLength *= -1 * speedMultiplier;
                break;
            case Character.AnimationState.INCREASE_SLOW:
                stepLength *= 1 * speedMultiplier;
                break;
            case Character.AnimationState.INCREASE_MEDIUM:
                stepLength *= 4 * speedMultiplier;
                break;
            case Character.AnimationState.INCREASE_FAST:
                stepLength *= 20 * speedMultiplier;
                break;
            case Character.AnimationState.STOP:
                console.error("Don't use animate to stop animation progression. Use changeAnimationState instead.");
                stepLength = 0;
                break;
        }

        if (stepLength < 0 && this.blockAnimationIncrease) {
            this.blockAnimationIncrease = false;
        }
        else if (stepLength > 0 && this.blockAnimationDecrease) {
            this.blockAnimationDecrease = false;
        }

        currentPath.drawUntil += stepLength;

        // Animation went below current path.
        if (currentPath.drawUntil < 0) {
            const overflow = Math.abs(currentPath.drawUntil);
            currentPath.drawUntil = 0;
            this.changedPaths.add(currentPath);

            // Progressed below first path or outside of allowed display range.
            if (this.endId <= 0 || !this.allowsDisplayOf(this.paths[this.endId - 1], true, false)) {
                this.blockAnimationDecrease = true;
                this.changeAnimationState(Character.AnimationState.STOP);
            }
            else {
                this.endId--;
                const newCurrentPath = this.paths[this.endId];
                if (Math.abs(newCurrentPath.width - currentPath.width) < Number.EPSILON) {
                    newCurrentPath.drawUntil = newCurrentPath.length - overflow;
                    this.changedPaths.add(newCurrentPath);
                }
            }
        }
        // Animation went above current path.
        else if (currentPath.drawUntil > currentPath.length) {
            const overflow = currentPath.drawUntil - currentPath.length;
            currentPath.drawUntil = currentPath.length;
            this.changedPaths.add(currentPath);

            // Progressed above last path or outside of allowed display range.
            if (this.endId >= this.paths.length - 1 || 
                !this.allowsDisplayOf(this.paths[this.endId + 1], true, false)
            ) {
                this.blockAnimationIncrease = true;
                this.changeAnimationState(Character.AnimationState.STOP);
            }
            else {
                this.endId++;
                const newCurrentPath = this.paths[this.endId];
                if (Math.abs(newCurrentPath.width - currentPath.width) < Number.EPSILON) {
                    newCurrentPath.drawUntil = overflow;
                    this.changedPaths.add(newCurrentPath);
                }
            }
        }
        // Animation stayed within path.
        else {
            this.changedPaths.add(currentPath);
        }
        
        requestAnimationFrame(this.animationApplyFrame.bind(this));
    }

    private animationApplyFrame() {
        for (const path of this.changedPaths) {
            path.draw();
        }
    }

    public allowsDisplayOf(path: Pathlike, considerSection = true, considerAnimation = true) {
        if (
            path.book < this.startingBook ||
            path.book > this.endBook ||
            (considerAnimation && this.isAnimated && path.pathId > this.endId) || 
            (considerSection && this.restrictBySection && path.sectionId > this.endSection) 
        ) {
            return false;
        }

        return true;
    }

    private getFirstPathToDraw() {
        for (let i = 0; i < this.paths.length; i++) {
            const path = this.paths[i];
            if (this.allowsDisplayOf(path)) {
                return i;
            }
        }

        return -1;
    }

    private getPathsToDrawAndUndraw() {
        // No fancy algorithm to allow for non monotonically increasing book numbering (eg. for flashbacks in later books).
        const pathsToDraw: Pathlike[] = [];
        const pathsToUndraw: Pathlike[] = [];
        for (const path of this.paths) {
            if (this.allowsDisplayOf(path)) {
                pathsToDraw.push(path);
            }
            else {
                pathsToUndraw.push(path);
            }
        }
        return { draw: pathsToDraw, undraw: pathsToUndraw };
    }

    public draw() {
        const pathsToDrawAndUndraw = this.getPathsToDrawAndUndraw();
        if (pathsToDrawAndUndraw.draw.length < 1) {
            undrawElementsInGroup(this.drawGroupName);
            return;
        }
        
        for (const path of pathsToDrawAndUndraw.undraw) {
            path.undraw();
        }

        let offset = 0;
        let prevPathLength = 0;
        for (let i = 0; i < pathsToDrawAndUndraw.draw.length; i++) {
            const path = pathsToDrawAndUndraw.draw[i];

            // Offset each path such that it aligns with the previous path's stroke pattern
            // to avoid visible gaps where paths connect.
            const shouldOffset = 
                (path.lineStyle != LineStyle.FULL) &&
                (i > 0 && path.lineStyle == pathsToDrawAndUndraw.draw[i - 1].lineStyle);
            if (shouldOffset) {
                const properties = getStrokeProperties(pathsToDrawAndUndraw.draw[i].lineStyle);
                if (!properties || 
                    properties.dashWidthFactor === undefined || 
                    properties.dashGapFactor === undefined
                ) {
                    console.error("Failed to draw path. Couldn't retrieve stroke properties.");
                    continue;
                }

                const width = properties.dashWidthFactor * path.width;
                const gap = properties.dashGapFactor * path.width;
                const periodLength = width + gap;
                offset = (offset + prevPathLength) % periodLength;
                prevPathLength = path.length;

                path.draw(offset);
            }
            else {
                path.draw();
                offset = 0;
                prevPathLength = path.length;
            }
        }
    }

    public undraw() {
        this.deactivateAnimation();
        undrawElementsInGroup(this.drawGroupName);
    }

    public dispose() {
        this.changeAnimationState(Character.AnimationState.STOP);
        this.undraw();
    }

    protected static createChangedEvent(property: Character.Property): CustomEvent {
        const event = new CustomEvent<Character.PropertyChangedDetail>(
            Character.EVENT_PROPERTY_CHANGED, { detail: { property: property } }
        );
        return event;
    }
}

namespace Character {
    export enum AnimationState {
        INCREASE_FAST = "3",
        INCREASE_MEDIUM = "2",
        INCREASE_SLOW = "1",
        STOP = "0",
        DECREASE_SLOW = "-1",
        DECREASE_MEDIUM = "-2",
        DECREASE_FAST = "-3",
    }

    export enum AnimationDirection {
        INCREASE,
        DECREASE,
    }

    export enum Property {
        STARTING_BOOK,
        END_BOOK,
        IS_ANIMATED,
        RESTRICT_BY_SECTION,
        ANIMATION_STATE,
        END_SECTION,
        MAX_SECTION,
    }

    export interface PropertyChangedDetail {
        property: Character.Property;
    }

    export interface AnimationStateChangedDetail {
        state: Character.AnimationState;
    }
}

export default Character;