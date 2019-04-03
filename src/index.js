import canvas from "./components/canvas";
import { drawGrid, fillSlot } from "./draw/grid";
import teams from "./data/teams.json";
import "./styles/style.sass";

const margin = 5;
const numEntries = 64;
// let width = window.innerWidth;
// let height = window.innerHeight;
// width = Math.min(width, height);
// height = Math.min(width, height);
let width = 1200;
let height = 1200;

// mount the canvas
const cvs = document.body.appendChild(canvas(width, height));

function setup() {
  const ctx = cvs.getContext("2d");
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  let slot = 0;
  for (let key of Object.keys(teams).slice(251, 283)) {
    fillSlot(cvs, numEntries, margin, 1, slot++, teams[key]);
  }
  drawGrid(cvs, numEntries, margin);
}

setup();
