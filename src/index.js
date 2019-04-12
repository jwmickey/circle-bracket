import axios from "axios";
import throttle from "lodash.throttle";
import canvas from "./js/components/canvas";
import yearPicker from "./js/components/yearPicker";
import gameInfo from "./js/components/gameInfo";
import downloadLink from "./js/components/downloadLink";
import { initAnalytics, runAnalytics } from "./js/components/analytics";
import Bracket from "./js/bracket";
import "./styles/style.sass";

const trackingId = "UA-137823086-1";
const hash = new URL(document.location).hash;
const minYear = 1956;
const maxYear = new Date().getFullYear();
const options = hash.substring(1).split("/");
const year = parseInt(options[0]) || maxYear;

// determine canvas size.  make canvas 2x size and set css width/height for high resolution displays
const size = Math.min(window.innerWidth, window.innerHeight);
let canvasSize = size;
if (window.devicePixelRatio > 1) {
  canvasSize *= 2;
}
const wrap = document.body.appendChild(canvas(canvasSize, size));

// bracket instance
const bracket = new Bracket(wrap.childNodes[0], { showGameDetails });
drawBracket(year);

// redraw on screen resize, but not too often
window.addEventListener(
  "resize",
  throttle(function() {
    bracket.resize(Math.min(window.innerWidth, window.innerHeight));
  }, 500)
);

// display game info when clicked
let gameInfoElem;
function showGameDetails(game, displaySeeds = true) {
  if (gameInfoElem) {
    gameInfoElem.remove();
  }

  if (game) {
    let info = gameInfo(game, displaySeeds);
    info.querySelector(".close").addEventListener("click", () => {
      showGameDetails(null);
    });
    gameInfoElem = document.body.appendChild(info);
  }
}

// draw a bracket for a given year.  toggles loading on/off for start/finish
function drawBracket(bracketYear) {
  wrap.classList.add("loading");
  axios.get(`/seasons/bracket-${bracketYear}.json`).then(res => {
    bracket.setBracket(res.data);
    bracket
      .render()
      .then(() => {
        wrap.classList.remove("loading");
      })
      .catch(err => {
        console.error("ERROR!", err);
        wrap.classList.remove("loading");
      });
  });
}

// add year chooser and event handler for redrawing bracket on change
document.body.appendChild(
  yearPicker(minYear, maxYear, year, e => {
    const nextYear = e.target.value;
    history.replaceState(null, nextYear.toString(), `#${nextYear}`);
    drawBracket(nextYear);
  })
);

// add download links for three size
const links = document.createElement("div");
links.className = "links";
links.innerText = "Download: ";
links.appendChild(downloadLink(1200, "Medium", bracket));
links.appendChild(downloadLink(2400, "Large", bracket));
links.appendChild(downloadLink(4800, "Huge", bracket));
document.body.appendChild(links);

// add analytics
document.body.appendChild(initAnalytics(trackingId));
document.body.appendChild(runAnalytics(trackingId));
