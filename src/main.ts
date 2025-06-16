import "./style.css";
import { getStroke } from "perfect-freehand";
import rough from "roughjs";
import { createColorPicker, type RGB } from "./colorPicker";

interface IBaseElement {
  id: number;
  style: {
    strokeColor: string;
    fillColor?: string;
    lineWidth: number;
    dashArray?: number[];
  };
}

interface IFreehandElement extends IBaseElement {
  type: "freehand";
  points: [[number, number], ...[number, number][]];
}

interface IShapeElement extends IBaseElement {
  type: "rectangle" | "ellipse" | "line";
  bounds: {
    anchor: [number, number];
    extent: [number, number];
  };
}

interface ITextElement extends IBaseElement {
  type: "text";
  font: string;
  position: [number, number];
  content: string;
}

type TTool = "freehand" | "rectangle" | "ellipse" | "text" | "line";
type TElement = IFreehandElement | IShapeElement | ITextElement;
type TBuffer = Array<TElement>;
type TState = {
  buffer: TBuffer;
  offset: [number, number];
  scale: number;
  selectedElementId: number;
  selectedTool: TTool;
  isDrawing: boolean;
};
let toolGroup = document.getElementsByName(
  "tools",
) as NodeListOf<HTMLInputElement>;
toolGroup.forEach((element) => {
  element.addEventListener("click", () => {
    toolGroup.forEach((element) => {
      element.checked && (State.selectedTool = element.value as TTool);
    });
  });
});
const State: TState = {
  buffer: [],
  offset: [0, 0],
  scale: 1,
  selectedElementId: 0,
  selectedTool: "text",
  isDrawing: false,
};

const average = (a: number, b: number) => (a + b) / 2;
const getSvgPathFromStroke = (points: number[][], closed = true) => {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1],
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2,
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
};

const Canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!Canvas) throw new Error("canvas not found!!!");
Canvas.height = window.innerHeight;
Canvas.width = window.innerWidth;
const textarea = document.querySelector<HTMLTextAreaElement>("#input-txt");
if (!textarea) throw new Error("textarea not found!!!");

const Rc = rough.canvas(Canvas);

const Ctx = Canvas.getContext("2d");
if (!Ctx) throw new Error("can't get context!!");

window.addEventListener("resize", () => {
  // Store previous dimensions
  const prevWidth = Canvas.width;
  const prevHeight = Canvas.height;

  // Get new dimensions
  const dpr = window.devicePixelRatio || 1;
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  // Update canvas dimensions
  Canvas.width = newWidth * dpr;
  Canvas.height = newHeight * dpr;
  Canvas.style.width = `${newWidth}px`;
  Canvas.style.height = `${newHeight}px`;

  // Adjust offset to maintain center position
  const centerRatioX = (State.offset[0] + prevWidth / 2) / prevWidth;
  const centerRatioY = (State.offset[1] + prevHeight / 2) / prevHeight;

  State.offset[0] = newWidth * centerRatioX - newWidth / 2;
  State.offset[1] = newHeight * centerRatioY - newHeight / 2;

  // Reset context properties
  Ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  redraw();
});

const redraw = () => {
  Ctx.resetTransform();
  Ctx.clearRect(0, 0, Canvas.width, Canvas.height);

  Ctx.translate(State.offset[0], State.offset[1]);
  Ctx.scale(State.scale, State.scale);

  State.buffer.forEach((element) => {
    switch (element.type) {
      case "freehand": {
        const outlinePoints = getStroke(element.points, {
          size: element.style.lineWidth,
        });
        const pathData = getSvgPathFromStroke(outlinePoints);
        const myPath = new Path2D(pathData);
        Ctx.fillStyle = element.style.strokeColor;
        Ctx.fill(myPath);
        break;
      }
      case "rectangle":
        Rc.rectangle(
          element.bounds.anchor[0],
          element.bounds.anchor[1],
          element.bounds.extent[0],
          element.bounds.extent[1],
          {
            stroke: element.style.strokeColor,
          },
        );
        break;
      case "line":
        Rc.line(
          element.bounds.anchor[0],
          element.bounds.anchor[1],
          element.bounds.extent[0],
          element.bounds.extent[1],
          {
            stroke: element.style.strokeColor,
          },
        );
        break;
      case "ellipse":
        Rc.ellipse(
          element.bounds.anchor[0],
          element.bounds.anchor[1],
          element.bounds.extent[0],
          element.bounds.extent[1],
          {
            stroke: element.style.strokeColor,
          },
        );
        break;
      case "text":
        Ctx.font = element.font;
        Ctx.fillStyle = element.style.strokeColor;
        Ctx.textBaseline = "top";
        Ctx.fillText(element.content, element.position[0], element.position[1]);
        break;
    }
  });
};

const getCanvasCoords = (e: MouseEvent | WheelEvent): [number, number] => {
  const x = (e.clientX - State.offset[0]) / State.scale;
  const y = (e.clientY - State.offset[1]) / State.scale;
  return [x, y];
};

Canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (event.ctrlKey) {
    // Zoom to center
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const newScale = State.scale * zoomFactor;
    const constrainedScale = Math.min(Math.max(newScale, 0.1), 4);

    // Calculate center coordinates
    const centerX = Canvas.width / 2;
    const centerY = Canvas.height / 2;

    // Adjust offset to maintain center
    State.offset[0] =
      centerX - ((centerX - State.offset[0]) / State.scale) * constrainedScale;
    State.offset[1] =
      centerY - ((centerY - State.offset[1]) / State.scale) * constrainedScale;

    State.scale = constrainedScale;
    redraw();
  } else if (event.shiftKey) {
    if (event.deltaY > 0) {
      State.offset[0] += 7;
    } else if (event.deltaY < 0) {
      State.offset[0] -= 7;
    }
  } else {
    if (event.deltaY > 0) {
      State.offset[1] += 7;
    } else if (event.deltaY < 0) {
      State.offset[1] -= 7;
    }
  }
  Ctx.translate(State.offset[0], State.offset[1]);
  redraw();
});

const textArea = document.createElement("textarea");
document.body.appendChild(textArea);

textArea.addEventListener("click", (e) => {
  e.preventDefault();
});

textArea.addEventListener("input", (e) => {
  if (e instanceof InputEvent && e.data === null) {
    textArea.blur();
    return;
  }
  const index = State.selectedElementId;
  if (State.buffer[index].type === "text") {
    State.buffer[index].content = textArea.value;
    redraw();
  }
});
let defaultColor = [255, 255, 255] as RGB;
const colorPicker = document.querySelector("#color-picker");
colorPicker?.addEventListener("click", () => {
  createColorPicker({
    initialColor: defaultColor,
    position: { x: 10, y: 10 },
    onColorChange: (color) => {
      defaultColor = color;
    },
  });
});

const createElement = (tool: TTool, anchor: [number, number]): TElement => {
  const base = {
    id: State.buffer.length,
    style: {
      strokeColor: `rgb(${defaultColor[0]},${defaultColor[1]},${defaultColor[2]})`,
      lineWidth: 3,
    },
  };
  textArea.value = "";
  State.selectedElementId = base.id;
  switch (tool) {
    case "freehand":
      return { ...base, type: tool, points: [anchor] };
    case "text":
      textArea.style.position = "fixed";
      textArea.style.top = `${anchor[1] + State.offset[1]}px`;
      textArea.style.left = `${anchor[0] + State.offset[0]}px`;
      textArea.style.zIndex = "-10";
      textArea.focus();
      return {
        ...base,
        type: tool,
        font: "50px sans-serif",
        position: anchor,
        content: "",
      };
    case "line":
      return {
        ...base,
        type: tool,
        bounds: {
          anchor: anchor,
          extent: anchor,
        },
      };
    case "rectangle":
    case "ellipse":
      return {
        ...base,
        type: tool,
        bounds: {
          anchor: anchor,
          extent: [0, 0],
        },
      };
  }
};

Canvas.addEventListener("mousedown", (event) => {
  event.preventDefault();
  State.isDrawing = true;
  const anchor = getCanvasCoords(event);
  const element = createElement(State.selectedTool, anchor);
  State.buffer.push(element);
  redraw();
});

const updateElement = (extent: [number, number]) => {
  switch (State.buffer[State.buffer.length - 1].type) {
    case "freehand":
      (State.buffer[State.buffer.length - 1] as IFreehandElement).points.push(
        extent,
      );
      break;
    case "ellipse": {
      const lastEllipse = State.buffer[
        State.buffer.length - 1
      ] as IShapeElement;
      const size: [number, number] = [
        (extent[0] - lastEllipse.bounds.anchor[0]) * 2,
        (extent[1] - lastEllipse.bounds.anchor[1]) * 2,
      ];
      lastEllipse.bounds.extent = size;
      break;
    }
    case "rectangle": {
      const lastRect = State.buffer[State.buffer.length - 1] as IShapeElement;
      const size: [number, number] = [
        extent[0] - lastRect.bounds.anchor[0],
        extent[1] - lastRect.bounds.anchor[1],
      ];
      lastRect.bounds.extent = size;
      break;
    }
    case "line":
      (State.buffer[State.buffer.length - 1] as IShapeElement).bounds.extent =
        extent;
      break;
    case "text":
      break;
  }
};
Canvas.addEventListener("mousemove", (event) => {
  if (State.isDrawing) {
    const extent = getCanvasCoords(event);
    updateElement(extent);
    redraw();
  }
});

Canvas.addEventListener("mouseup", () => {
  State.isDrawing = false;
});
