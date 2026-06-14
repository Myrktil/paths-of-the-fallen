export let pointerDownTime = 0;

document.addEventListener("pointerdown", () => pointerDownTime = Date.now());