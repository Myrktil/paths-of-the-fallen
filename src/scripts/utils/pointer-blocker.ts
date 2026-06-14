export default class PointerBlocker {
    private static _blockerElement: HTMLDivElement;

    private static get blockerElement() {
        if (PointerBlocker._blockerElement) {
            return PointerBlocker._blockerElement;
        }
        
        PointerBlocker._blockerElement = PointerBlocker.createBlockerElement();
        return PointerBlocker._blockerElement;
    }

    public static block() {
        PointerBlocker.blockerElement.style.display = "";
    }

    public static blockFor(ms: number) {
        PointerBlocker.block();
        setTimeout(() => {
            PointerBlocker.unblock();
        }, ms);
    }

    public static unblock() {
        PointerBlocker.blockerElement.style.display = "none";
    }

    private static createBlockerElement() {
        const element = document.createElement("div");
        element.style.position = "fixed";
        element.style.inset = "0";
        element.style.zIndex = "9999";
        element.style.background = "transparent";
        document.body.appendChild(element);
        element.style.display = "none";   

        return element;
    }
}