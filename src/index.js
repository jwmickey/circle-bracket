import canvas from "./components/canvas";
import { drawGrid, fillSlot } from "./draw/grid";
import teams from "./data/ncaa.json";
import "./styles/style.sass";

const margin = 5;
const numEntries = 64;
// let width = window.innerWidth;
// let height = window.innerHeight;
// width = Math.min(width, height);
// height = Math.min(width, height);
let width = 1000;
let height = 1000;

// mount the canvas
const cvs = document.body.appendChild(canvas(width, height));

let slot = 0;
for (let key of Object.keys(teams)) {
  fillSlot(cvs, numEntries, margin, 0, slot++, teams[key]);
}
drawGrid(cvs, numEntries, margin);
