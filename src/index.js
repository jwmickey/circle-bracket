import axios from "axios";
import canvas from "./js/components/canvas";
import yearPicker from "./js/components/yearPicker";
import gameInfo from "./js/components/gameInfo";
import downloadLink from "./js/components/downloadLink";
import { initAnalytics, runAnalytics } from "./js/components/analytics";
import Bracket from "./js/bracket";
import "./styles/style.sass";

const trackingId = "UA-137823086-1";
const hash = new URL(document.location).hash;
const minYear = 1985;
const maxYear = new Date().getFullYear();
const options = hash.substring(1).split("/");
const year = parseInt(options[0]) || maxYear;

let width = window.innerWidth;
let height = window.innerHeight;
let download = false;

if (options[1] && options[1].length) {
  const customSize = Math.max(parseInt(options[1]), 5000);
  download = true;
  width = height = customSize;
}

width = Math.min(width, height);
height = Math.min(width, height);

const wrap = document.body.appendChild(canvas(width, height));
const bracket = new Bracket(wrap.childNodes[0], { showGameDetails });

let gameInfoElem;
function showGameDetails(game) {
  if (gameInfoElem) {
    gameInfoElem.remove();
  }

  if (game) {
    let info = gameInfo(game);
    info.querySelector(".close").addEventListener("click", () => {
      showGameDetails(null);
    });
    gameInfoElem = document.body.appendChild(info);
  }
}

let bracketInfo;

function drawBracket(bracketYear) {
  wrap.classList.add("loading");
  axios.get(`/seasons/bracket-${bracketYear}.json`).then(res => {
    bracketInfo = res.data;
    bracket.setBracket(bracketInfo);
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

const years = Array.from(
  new Array(maxYear - minYear + 1),
  (x, i) => i + 1985
).reverse();
// add 1983 manually temporarily
years.push(1983);

document.body.appendChild(
  yearPicker(years, year, e => {
    const nextYear = e.target.value;
    history.replaceState(null, nextYear.toString(), `#${nextYear}`);
    drawBracket(nextYear);
  })
);

const optionsDiv = document.createElement("div");
optionsDiv.className = "options";
const links = document.createElement("div");
links.className = "links";
links.innerText = "Download: ";
links.appendChild(downloadLink(1200, "Medium", bracket));
links.appendChild(downloadLink(2400, "Large", bracket));
links.appendChild(downloadLink(4800, "Wow", bracket));
optionsDiv.appendChild(links);

document.body.appendChild(optionsDiv);
document.body.appendChild(initAnalytics(trackingId));
document.body.appendChild(runAnalytics(trackingId));

drawBracket(year);
