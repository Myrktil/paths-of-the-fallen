import PathEditorCollection from "../elements/path-editor-collection-element";
import PathEditor from "../elements/path-editor-element";
import Disposable from "../utils/disposable";

export default class PathEditorReorderer implements Disposable {
    private readonly collection: PathEditorCollection;
    private wrapper: HTMLDivElement;
    private topAutoScrollArea!: HTMLDivElement;
    private bottomAutoScrollArea!: HTMLDivElement;
    private positionMarkerElement!: HTMLDivElement;
    private scrollTimerId: number = -1;
    private currDragPos = { belowIndex: 0, aboveIndex: 1};
    private currDraggedEditor: PathEditor | null = null;
    private isScrolling = false;
    private lastMousePosY = 0;
    private editorGap;
    private readonly AUTO_SCROLL_DELAY = 10;
    private readonly AUTO_SCROLL_AMOUNT = 10;
    private readonly EVENT_SCROLLED = "path-editor:scrolled";

    constructor(collection: PathEditorCollection, wrapper: HTMLDivElement) {
        this.collection = collection;
        this.wrapper = wrapper;
        this.editorGap = parseFloat(getComputedStyle(this.wrapper).rowGap);
        this.createElements();
    }

    public startDrag(e: PointerEvent, editor: PathEditor) {
        if (this.collection.readonlyEditors.length < 2) {
            return;
        }

        document.addEventListener("pointermove", this.handlePointerMove, { passive: false });
        document.addEventListener(this.EVENT_SCROLLED, this.handleScrolled);
        document.addEventListener("pointerup", this.handlePointerUp);

        this.currDraggedEditor = editor;

        this.lastMousePosY = e.clientY;
        this.drag();
    }

    private finishDrag() {
        this.positionMarkerElement.style.display = "none";

        document.removeEventListener("pointermove", this.handlePointerMove);
        document.removeEventListener(this.EVENT_SCROLLED, this.handleScrolled);
        document.removeEventListener("pointerup", this.handlePointerUp);
        this.stopScrolling();

        if (this.currDraggedEditor == null) {
            return;
        }

        if (this.currDragPos.belowIndex < 0) {
            this.collection.moveToPosition(this.currDraggedEditor, 0);
            this.wrapper.scrollTop = 0;
        }
        else if (this.currDragPos.aboveIndex < this.collection.readonlyEditors.length) {
            this.collection.moveBetween(
                this.currDraggedEditor, 
                this.currDragPos.belowIndex, 
                this.currDragPos.aboveIndex
            );
        }
        else {
            this.collection.moveToPosition(
                this.currDraggedEditor, 
                this.collection.readonlyEditors.length - 1
            );
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }

        this.currDraggedEditor.setActive();
    }

    private drag() {
        this.currDragPos = this.getMarkerPosition(this.lastMousePosY);
        this.positionMarkerBelow(this.currDragPos.aboveIndex);
    }

    private startScrollingUp() {
        this.isScrolling = true,
        this.scrollTimerId = setInterval(() => this.scrollUp(), this.AUTO_SCROLL_DELAY);
    }
    
    private scrollUp() {
        this.wrapper.scrollTop -= this.AUTO_SCROLL_AMOUNT;
        document.dispatchEvent(new Event(this.EVENT_SCROLLED));
    }
    
    private startScrollingDown() {
        this.isScrolling = true;
        this.scrollTimerId = setInterval(() => this.scrollDown(), this.AUTO_SCROLL_DELAY);
    }
    
    private scrollDown() {
        this.wrapper.scrollTop += this.AUTO_SCROLL_AMOUNT;
        document.dispatchEvent(new Event(this.EVENT_SCROLLED));
    }
    
    private stopScrolling() {
        this.isScrolling = false;
        clearInterval(this.scrollTimerId);
    }

    private getMarkerPosition(mousePosY: number): { belowIndex: number, aboveIndex: number } {
        const editorsLength = this.collection.readonlyEditors.length;
        for (let i = 0; i < editorsLength; i++) {
            const editor = this.collection.readonlyEditors[i];
            const editorRect = editor.getBoundingClientRect();
            if (mousePosY < editorRect.top + editorRect.height / 2) {
                    return { belowIndex: i - 1, aboveIndex: i};
            }
        } 

        return { belowIndex: editorsLength - 1, aboveIndex: editorsLength };
    }

    private positionMarkerBelow(aboveIndex: number) {
        const wrapperRect = this.wrapper.getBoundingClientRect();
        const editor = this.collection.readonlyEditors[aboveIndex];
        // Place above first editor.
        if (aboveIndex == 0) {
            // Set position to fixed so marker is still visible outside container.
            // Position fixed breaks "width=100%" formatting. Save width as px value so 
            // width stays the same.
            const widthInPx = this.positionMarkerElement.getBoundingClientRect().width;
            this.positionMarkerElement.style.width = widthInPx.toString() + "px";
            this.positionMarkerElement.style.display = "";
            this.positionMarkerElement.style.position = "fixed";
            const newTop = wrapperRect.top - 5;
            this.positionMarkerElement.style.top = newTop.toString() + "px";
        }
        // Place in the middle of two editors.
        else if (aboveIndex < this.collection.readonlyEditors.length) {
            const editorRect = editor.getBoundingClientRect();
            const editorOffset = editorRect.top - wrapperRect.top;
            this.positionMarkerElement.style.width = "100%";
            this.positionMarkerElement.style.display = "";
            this.positionMarkerElement.style.position = "absolute";
            const newTop = editorOffset + this.wrapper.scrollTop - (this.editorGap / 2);
            this.positionMarkerElement.style.top = newTop.toString() + "px";
        }
        // Place below the last editor.
        else {
            const widthInPx = this.positionMarkerElement.getBoundingClientRect().width;
            this.positionMarkerElement.style.width = widthInPx.toString() + "px";
            this.positionMarkerElement.style.position = "fixed";
            this.positionMarkerElement.style.display = "";
            const newTop = wrapperRect.top + wrapperRect.height + 5;
            this.positionMarkerElement.style.top = newTop.toString() + "px";
        }
    }

    private handlePointerMove = (e: PointerEvent) => {
        // Scroll area pointer events are set to none to allow interacting with path editor
        // beneath. For that reason, mouseenter and mouseleave events, which start scrolling,
        // need to be implemented manually.
        const topRect = this.topAutoScrollArea.getBoundingClientRect();
        const bottomRect = this.bottomAutoScrollArea.getBoundingClientRect();
        if (topRect.x <= e.clientX && e.clientX <= topRect.x + topRect.width 
            && topRect.y <= e.clientY && e.clientY <= topRect.y + topRect.height) {
            if (!this.isScrolling) {
                this.startScrollingUp();
            }
        }
        else if (bottomRect.x <= e.clientX && e.clientX <= bottomRect.x + bottomRect.width 
            && bottomRect.y <= e.clientY && e.clientY <= bottomRect.y + bottomRect.height) {
            if (!this.isScrolling) {
                this.startScrollingDown();
            }
        }
        else {
            if (this.isScrolling) {
                this.stopScrolling();
            }
        }
    
        this.lastMousePosY = e.clientY;
        this.drag();
        e.preventDefault();
    }
    
    private handleScrolled = () => {
        this.drag();
    }
    
    private handlePointerUp = () => {
        this.finishDrag();
    }

    public dispose() {
        document.removeEventListener("pointermove", this.handlePointerMove);
        document.removeEventListener(this.EVENT_SCROLLED, this.handleScrolled);
        document.removeEventListener("pointerup", this.handlePointerUp);
    }

    private createElements() {
        const topAutoScrollArea = document.createElement("div");
        topAutoScrollArea.classList.add("auto-scroll-area");
        topAutoScrollArea.classList.add("top");
        this.collection.appendChild(topAutoScrollArea);
        this.topAutoScrollArea = topAutoScrollArea;

        const positionMarker = document.createElement("div");
        positionMarker.classList.add("position-marker");
        positionMarker.style.display = "none";
        this.wrapper.appendChild(positionMarker);
        this.positionMarkerElement = positionMarker;

        const bottomAutoScrollArea = document.createElement("div");
        bottomAutoScrollArea.classList.add("auto-scroll-area");
        bottomAutoScrollArea.classList.add("bottom");
        this.collection.appendChild(bottomAutoScrollArea);
        this.bottomAutoScrollArea = bottomAutoScrollArea;
    }
}