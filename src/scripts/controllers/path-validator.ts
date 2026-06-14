import EditPath from "../models/edit-path";
import EditPathlike from "../models/edit-pathlike";
import { distance } from "../utils/helpers";

const SNAPPING_DIST_FACTOR = 3;

export function fullValidate(paths: EditPath[]) {
    for (let i = 0; i < paths.length; i++) {
        validateOrderFor(i, paths);
        snapStartPoint(paths[i], paths);
        snapEndPoint(paths[i], paths);
    }
}

export function validateOrderFrom(index: number, paths: EditPathlike[]) {
    if (index < 0 || index >= paths.length) {
        return;
    }

    for (let i = index; i < paths.length; i++) {
        validateOrderFor(i, paths);
    }
}

export function validateOrderFor(index: number, paths: EditPathlike[]) {
    if (index < 0 || index >= paths.length) {
        return;
    }

    const path = paths[index];
    if (index <= 0) {
        path.pathId = 0;
        path.sectionId = 0;
    }
    else {
        const prevPath = paths[index - 1];
        path.pathId = prevPath.pathId + 1;
        if (prevPath.isEndOfSection) {
            path.sectionId = prevPath.sectionId + 1;
        }
        else {
            path.sectionId = prevPath.sectionId;
        }
    }
}

export function snapStartPoint(path: EditPathlike, paths: EditPathlike[]) {
    const index = paths.indexOf(path);
    if (index <= 0) {
        return;
    }

    const prevPath = paths[index - 1];

    const dist = distance(
        { x: path.startPointX, y: path.startPointY },
        { x: prevPath.endPointX, y: prevPath.endPointY}
    );

    if (dist < SNAPPING_DIST_FACTOR * path.width) {
        path.startPointX = prevPath.endPointX;
        path.startPointY = prevPath.endPointY;
    }
}

export function snapEndPoint(path: EditPathlike, paths: EditPathlike[]) {
    const index = paths.indexOf(path);
    if (index < 0 || index >= paths.length - 1) {
        return;
    }

    const nextPath = paths[index + 1];

    const dist = distance(
        { x: path.endPointX, y: path.endPointY },
        { x: nextPath.startPointX, y: nextPath.startPointY}
    );

    if (dist < SNAPPING_DIST_FACTOR * path.width) {
        path.endPointX = nextPath.startPointX;
        path.endPointY = nextPath.startPointY;
    }
}
