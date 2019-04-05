import axios from "axios";
import canvas from "./js/components/canvas";
import yearPicker from "./js/components/yearPicker";
import { initAnalytics, runAnalytics } from "./js/components/analytics";
import Bracket from "./js/bracket";
import "./styles/style.sass";

const trackingId = "UA-137823086-1";
const hash = new URL(document.location).hash;
const minYear = 1985;
const maxYear = new Date().getFullYear();
const year = parseInt(hash.substring(1)) || maxYear;

let width = window.innerWidth;
let height = window.innerHeight;
width = Math.min(width, height);
height = Math.min(width, height);
const cvs = document.body.appendChild(canvas(width, height));
const bracket = new Bracket(cvs);

function drawBracket(bracketYear) {
  axios.get(`/seasons/bracket-${bracketYear}.json`).then(res => {
    bracket.setBracket(res.data);
    bracket.render();
  });
}

const years = Array.from(new Array(maxYear - minYear + 1), (x, i) => i + 1985);
document.body.appendChild(
  yearPicker(years, year, e => {
    const nextYear = e.target.value;
    history.replaceState(null, nextYear.toString(), `#${nextYear}`);
    drawBracket(nextYear);
  })
);

drawBracket(year);

document.body.appendChild(initAnalytics(trackingId));
document.body.appendChild(runAnalytics(trackingId));
