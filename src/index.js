import axios from "axios";
import canvas from "./js/components/canvas";
import yearPicker from "./js/components/yearPicker";
import gameInfo from "./js/components/gameInfo";
import downloadLink from "./js/components/downloadLink";
import { aboutLink, aboutOverlay } from "./js/components/about";
import Bracket from "./js/bracket";
import { getSelectionSunday } from "./js/utils";
import "./styles/style.sass";

const hash = new URL(document.location).hash;
const minYear = 1956;
const maxYear = new Date().getFullYear();
const options = hash.substring(1).split("/");
const initialYear = parseInt(options[0]) || maxYear;
let year = initialYear;

// pre-determine canvas size and scale for high resolution displays
const size = Math.min(window.innerWidth, window.innerHeight, 1600);
const scale = Math.ceil(window.devicePixelRatio);
const wrap = document.body.appendChild(canvas(size * scale, size));

// bracket instance
const bracket = new Bracket(wrap.childNodes[0], { showGameDetails, scale });
drawBracket(year);

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

    if (window.gtag) {
      gtag("event", "view", {
        event_category: "Game",
        event_label: `${year} - ${game.home.name} vs. ${game.away.name}`
      });
    }
  }
}

// draw a bracket for a given year.  toggles loading on/off for start/finish
function drawBracket(bracketYear) {
  wrap.classList.remove("error");
  let showBracket = true;
  let bracketUrl = `/seasons/bracket-${bracketYear}.json`;

  if (bracketYear === maxYear) {
    const today = new Date();
    const selection = getSelectionSunday(maxYear);
    const days = Math.ceil((selection.getTime() - today.getTime()) / 86400000);
    if (days > -1) {
      let msg = `
        <div style="text-align: center">
          <h3>The ${maxYear} bracket arrives in<br/>${days} days!</h3>
          <h5>Use the year selector to see more brackets - all the way back to ${minYear}</h5>
        </div>
      `;
      wrap.classList.add("error");
      wrap.getElementsByClassName("msg")[0].innerHTML = msg;
      showBracket = false;
    } else {
      bracketUrl = 'https://circlebracket.s3.amazonaws.com/live-bracket.json';
    }
  }

  if (showBracket) {
    wrap.classList.add("loading");
    axios
      .get(bracketUrl)
      .then(res => {
        bracket.setBracket(res.data);
        return bracket.render();
      })
      .catch(err => {
        console.error(err);
        let msg = `Sorry, could not create a bracket for year ${bracketYear}`;
        wrap.classList.add("error");
        wrap.getElementsByClassName("msg")[0].innerText = msg;
      })
      .finally(() => {
        wrap.classList.remove("loading");
      });
  }
}

// add year chooser and event handler for redrawing bracket on change
document.body.appendChild(
  yearPicker(minYear, maxYear, initialYear, e => {
    year = parseInt(e.target.value);
    history.replaceState(null, year.toString(), `#${year}`);
    drawBracket(year);

    if (window.gtag) {
      gtag("event", "view", {
        event_category: "Bracket",
        event_label: year
      });
    }
  })
);

// add download links for three size and the about link
const links = document.createElement("div");
links.className = "links";
links.innerText = "Download: ";
links.appendChild(downloadLink(1200, "Medium", bracket));
links.appendChild(downloadLink(2400, "Large", bracket));
links.appendChild(downloadLink(4800, "Huge", bracket));
links.appendChild(aboutLink());
document.body.appendChild(links);

// add about overlay
document.body.appendChild(aboutOverlay());

