const mapContainer = document.getElementById("dataCenterMap");
const mapArea = document.getElementById("mapArea");

const startInput = document.getElementById("startLocation");
const endInput = document.getElementById("endLocation");

const findPathButton = document.getElementById("findPathButton");
const clearPathButton = document.getElementById("clearPathButton");

const pathResult = document.getElementById("pathResult");
const routeLine = document.getElementById("routeLine");

/* ==============================
   Map boundaries
============================== */

const firstColumn = 1;
const lastColumn = 100;

const firstRow = 11;
const lastRow = 100;

const horizontalMovementCost = 1;

/* ==============================
   Build map
============================== */

function createDataCenterMap() {
    mapContainer.innerHTML = "";

    for (
        let columnNumber = firstColumn;
        columnNumber <= lastColumn;
        columnNumber += 2
    ) {
        const aisle = createAisle(
            columnNumber,
            columnNumber + 1
        );

        mapContainer.appendChild(aisle);
    }
}

function createAisle(firstAisleColumn, secondAisleColumn) {
    const aisleElement = document.createElement("section");
    aisleElement.classList.add("aisle");

    const columnsContainer = document.createElement("div");
    columnsContainer.classList.add("aisle-columns");

    const firstColumnElement = createColumn(firstAisleColumn);
    columnsContainer.appendChild(firstColumnElement);

    if (secondAisleColumn <= lastColumn) {
        const secondColumnElement = createColumn(secondAisleColumn);
        columnsContainer.appendChild(secondColumnElement);
    }

    aisleElement.appendChild(columnsContainer);

    return aisleElement;
}

function createColumn(columnNumber) {
    const columnElement = document.createElement("div");
    columnElement.classList.add("map-column");

    /*
        Row 11 appears at the top.
        Row 100 appears at the bottom.
    */
    for (
        let rowNumber = firstRow;
        rowNumber <= lastRow;
        rowNumber++
    ) {
        const cell = createCell(columnNumber, rowNumber);
        columnElement.appendChild(cell);
    }

    return columnElement;
}

function createCell(columnNumber, rowNumber) {
    const cell = document.createElement("div");

    cell.classList.add("map-cell");

    cell.id = getCellId(columnNumber, rowNumber);

    cell.dataset.column = columnNumber;
    cell.dataset.row = rowNumber;

    cell.title =
        `Column ${columnNumber}, Row ${rowNumber}`;

    return cell;
}

function getCellId(column, row) {
    return `cell-${column}-${row}`;
}

function getCell(column, row) {
    return document.getElementById(
        getCellId(column, row)
    );
}

/* ==============================
   Read and validate input
============================== */

function parseLocation(value) {
    const cleanedValue = value
        .trim()
        .replace(/\s+/g, "");

    const parts = cleanedValue.split(",");

    if (parts.length !== 2) {
        return null;
    }

    const column = Number(parts[0]);
    const row = Number(parts[1]);

    if (
        !Number.isInteger(column) ||
        !Number.isInteger(row)
    ) {
        return null;
    }

    if (
        column < firstColumn ||
        column > lastColumn
    ) {
        return null;
    }

    if (
        row < firstRow ||
        row > lastRow
    ) {
        return null;
    }

    return {
        column,
        row
    };
}

/* ==============================
   Aisle helpers
============================== */

function getAisleNumber(columnNumber) {
    return Math.floor((columnNumber - 1) / 2) + 1;
}

function getAisleElement(aisleNumber) {
    const aisleElements =
        document.querySelectorAll(".aisle");

    return aisleElements[aisleNumber - 1] || null;
}

/* ==============================
   Calculate top/bottom route
============================== */

function calculateShortestPath(start, end) {
    const horizontalDistance =
        Math.abs(start.column - end.column) *
        horizontalMovementCost;

    /*
        Top route exits through Row 11.
    */
    const topDistance =
        Math.abs(start.row - firstRow) +
        horizontalDistance +
        Math.abs(end.row - firstRow);

    /*
        Bottom route exits through Row 100.
    */
    const bottomDistance =
        Math.abs(lastRow - start.row) +
        horizontalDistance +
        Math.abs(lastRow - end.row);

    if (topDistance <= bottomDistance) {
        return {
            side: "top",
            exitRow: firstRow,
            distance: topDistance,
            topDistance,
            bottomDistance
        };
    }

    return {
        side: "bottom",
        exitRow: lastRow,
        distance: bottomDistance,
        topDistance,
        bottomDistance
    };
}

/* ==============================
   Draw route
============================== */

function drawShortestPath() {
    clearPath(false);

    const start = parseLocation(startInput.value);
    const end = parseLocation(endInput.value);

    if (!start || !end) {
        showMessage(
            "Use columns 1–100 and rows 11–100. Example: 50,20",
            "error"
        );

        return;
    }

    const startCell = getCell(
        start.column,
        start.row
    );

    const endCell = getCell(
        end.column,
        end.row
    );

    if (!startCell || !endCell) {
        showMessage(
            "One of the locations was not found.",
            "error"
        );

        return;
    }

    startCell.classList.add("start-location");
    endCell.classList.add("end-location");

    const startAisle = getAisleNumber(start.column);
    const endAisle = getAisleNumber(end.column);

    /*
        Special case:
        Both locations are inside the same aisle.
    */
    if (startAisle === endAisle) {
        drawSameAislePath(
            startCell,
            endCell,
            startAisle
        );

        const sameAisleDistance =
            Math.abs(start.row - end.row);

        showMessage(
            `Same aisle route selected. ` +
            `Distance: ${sameAisleDistance}.`,
            "success"
        );

        return;
    }

    /*
        Normal case:
        Locations are in different aisles.
    */
    const path = calculateShortestPath(start, end);

    const startExitCell = getCell(
        start.column,
        path.exitRow
    );

    const endExitCell = getCell(
        end.column,
        path.exitRow
    );

    startExitCell.classList.add("route-exit");
    endExitCell.classList.add("route-exit");

    const startPoint = getCellCenter(startCell);
    const startExitPoint = getCellCenter(startExitCell);
    const endExitPoint = getCellCenter(endExitCell);
    const endPoint = getCellCenter(endCell);

    const points = [
        startPoint,
        startExitPoint,
        endExitPoint,
        endPoint
    ];

    setRoutePoints(points);

    showMessage(
        `${capitalize(path.side)} path selected. ` +
        `Distance: ${path.distance}. ` +
        `Top: ${path.topDistance}, ` +
        `Bottom: ${path.bottomDistance}.`,
        "success"
    );
}

/* ==============================
   Same-aisle route
============================== */

function drawSameAislePath(
    startCell,
    endCell,
    aisleNumber
) {
    const aisleElement =
        getAisleElement(aisleNumber);

    if (!aisleElement) {
        return;
    }

    const startPoint = getCellCenter(startCell);
    const endPoint = getCellCenter(endCell);

    const aisleCenterX =
        getElementCenterX(aisleElement);

    /*
        Route:
        Start location
        → center of aisle
        → move vertically
        → destination
    */
    const points = [
        startPoint,

        {
            x: aisleCenterX,
            y: startPoint.y
        },

        {
            x: aisleCenterX,
            y: endPoint.y
        },

        endPoint
    ];

    setRoutePoints(points);
}

/* ==============================
   Coordinate helpers
============================== */

function getCellCenter(cell) {
    const cellRect = cell.getBoundingClientRect();
    const mapRect = mapArea.getBoundingClientRect();

    return {
        x:
            cellRect.left -
            mapRect.left +
            cellRect.width / 2,

        y:
            cellRect.top -
            mapRect.top +
            cellRect.height / 2
    };
}

function getElementCenterX(element) {
    const elementRect =
        element.getBoundingClientRect();

    const mapRect =
        mapArea.getBoundingClientRect();

    return (
        elementRect.left -
        mapRect.left +
        elementRect.width / 2
    );
}

function setRoutePoints(points) {
    const pointsText = points
        .map(point => `${point.x},${point.y}`)
        .join(" ");

    routeLine.setAttribute(
        "points",
        pointsText
    );
}

/* ==============================
   Clear route
============================== */

function clearPath(resetMessage = true) {
    routeLine.setAttribute("points", "");

    const highlightedCells =
        document.querySelectorAll(
            ".start-location, " +
            ".end-location, " +
            ".route-exit"
        );

    highlightedCells.forEach(cell => {
        cell.classList.remove(
            "start-location",
            "end-location",
            "route-exit"
        );
    });

    if (resetMessage) {
        pathResult.className = "path-result";
        pathResult.textContent =
            "Enter locations as column,row";
    }
}

/* ==============================
   Messages
============================== */

function showMessage(message, type) {
    pathResult.textContent = message;
    pathResult.className =
        `path-result ${type}`;
}

function capitalize(value) {
    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}

/* ==============================
   Events
============================== */

findPathButton.addEventListener(
    "click",
    drawShortestPath
);

clearPathButton.addEventListener(
    "click",
    () => {
        clearPath(true);
    }
);

startInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            drawShortestPath();
        }
    }
);

endInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            drawShortestPath();
        }
    }
);

window.addEventListener(
    "resize",
    () => {
        const start =
            parseLocation(startInput.value);

        const end =
            parseLocation(endInput.value);

        if (start && end) {
            drawShortestPath();
        }
    }
);

/* ==============================
   Start application
============================== */

createDataCenterMap();
