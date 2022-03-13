import axios from "axios";
import canvas from "./lib/components/canvas";
import yearPicker from "./lib/components/yearPicker";
import gameInfo from "./lib/components/gameInfo";
import downloadLink from "./lib/components/downloadLink";
import { aboutLink, aboutOverlay } from "./lib/components/about";
import Bracket from "./lib/bracket";
import { getSelectionSunday } from "./lib/utils";
import "./styles/style.sass";
import { Game } from "./lib/types/Bracket";

const hash = window.location.hash;
const minYear = 1956;
const maxYear = new Date().getFullYear();
const options = hash.substring(1).split("/");
const initialYear = parseInt(options[0]) || maxYear;
let year = initialYear;

// pre-determine canvas size and scale for high resolution displays
const size = Math.min(window.innerWidth, window.innerHeight, 1600);
const scale = Math.ceil(window.devicePixelRatio);
const cvs = canvas(size * scale, size);
const wrap = document.body.appendChild(cvs);

// bracket instance
const bracket = new Bracket(cvs.childNodes[0] as HTMLCanvasElement, {
  showGameDetails,
  scale,
});
drawBracket(year);

// display game info when clicked
let gameInfoElem: HTMLElement;
function showGameDetails(game: Game, displaySeeds = true) {
  if (gameInfoElem) {
    gameInfoElem.remove();
  }

  if (game) {
    let info = gameInfo(game, displaySeeds);
    info.querySelector(".close").addEventListener("click", () => {
      showGameDetails(null);
    });
    gameInfoElem = document.body.appendChild(info);

    if (window.hasOwnProperty("gtag")) {
      // @ts-ignore
      window.gtag("event", "view", {
        event_category: "Game",
        event_label: `${year} - ${game.home.name} vs. ${game.away.name}`,
      });
    }
  }
}

// draw a bracket for a given year.  toggles loading on/off for start/finish
function drawBracket(bracketYear: number) {
  wrap.classList.remove("error");
  wrap.classList.remove("message");
  let showBracket = true;
  let bracketUrl = `/seasons/bracket-${bracketYear}.json`;

  if (bracketYear === maxYear) {
    const today = new Date();
    const selection = getSelectionSunday(maxYear);
    const days = Math.ceil((selection.getTime() - today.getTime()) / 86400000);
    if (days > 0) {
      let msg = `
        <div style="text-align: center">
          <h3>The ${maxYear} bracket arrives in<br/>${days} days!</h3>
          <h5>Use the year selector to see more brackets - all the way back to ${minYear}</h5>
        </div>
      `;
      wrap.classList.add("message");
      wrap.getElementsByClassName("msg")[0].innerHTML = msg;
      showBracket = false;
      bracket.setBracket(undefined);
      bracket.render();
    } else {
      bracketUrl = "https://circlebracket.s3.amazonaws.com/live-bracket.json";

      if (days === 0 && today.getHours() < 18) {
        let msg = `
        <div style="text-align: center">
          <h3>The ${maxYear} bracket will be announced soon!</h3>
        </div>
      `;
        wrap.classList.add("message");
        wrap.getElementsByClassName("msg")[0].innerHTML = msg;
      }
    }
  }

  if (showBracket) {
    wrap.classList.add("loading");
    axios
      .get(bracketUrl)
      .then((res) => {
        bracket.setBracket(res.data);
        return bracket.render();
      })
      .catch((err) => {
        console.error(err);
        let msg = `Sorry, could not create a bracket for year ${bracketYear}`;
        wrap.classList.add("error");
        wrap.getElementsByClassName("msg").item(0).textContent = msg;
      })
      .finally(() => {
        wrap.classList.remove("loading");
      });
  }
}

// add year chooser and event handler for redrawing bracket on change
document.body.appendChild(
  yearPicker(minYear, maxYear, initialYear, (e: Event) => {
    year = parseInt((e.target as HTMLInputElement).value);
    history.replaceState(null, year.toString(), `#${year}`);
    drawBracket(year);

    if (window.hasOwnProperty("gtag")) {
      // @ts-ignore
      gtag("event", "view", {
        event_category: "Bracket",
        event_label: year,
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
