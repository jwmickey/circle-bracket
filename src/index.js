import Axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';
import canvas from "./js/components/canvas";
import yearPicker from "./js/components/yearPicker";
import genderPicker from "./js/components/genderPicker";
import gameInfo from "./js/components/gameInfo";
import downloadLink from "./js/components/downloadLink";
import { aboutLink, aboutOverlay } from "./js/components/about";
import Bracket from "./js/bracket";
import { getSelectionSunday } from "./js/utils";
import "./styles/style.sass";

const axiosInstance = Axios.create();
const axios = setupCache(axiosInstance, {
  location: 'client'
});

const hash = new URL(document.location).hash;
const MEN_MIN_YEAR = 1956;
const WOMEN_MIN_YEAR = 1982;
const maxYear = new Date().getFullYear();
const options = hash.substring(1).split("/");
const initialYear = parseInt(options[0]) || maxYear;
const initialGender = (options[1] === "women") ? "women" : "men";
let year = initialYear;
let gender = initialGender;

// pre-determine canvas size and scale for high resolution displays
const size = Math.min(window.innerWidth, window.innerHeight, 1600);
const scale = Math.ceil(window.devicePixelRatio);
const wrap = document.body.appendChild(canvas(size * scale, size));

// bracket instance
const bracket = new Bracket(wrap.childNodes[0], { showGameDetails, scale });
drawBracket(year, gender);

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

function updateHash() {
  const hashStr = gender === "women" ? `${year}/women` : `${year}`;
  history.replaceState(null, year.toString(), `#${hashStr}`);
}

// draw a bracket for a given year and gender.  toggles loading on/off for start/finish
function drawBracket(bracketYear, bracketGender) {
  let useAxiosCache = true;
  wrap.classList.remove("error");
  wrap.classList.remove("message");
  let showBracket = true;
  let bracketUrl = bracketGender === "women"
    ? `/seasons/women/bracket-${bracketYear}.json`
    : `/seasons/bracket-${bracketYear}.json`;

  if (bracketYear === maxYear) {
    const now = new Date();
    const endLiveBracket = new Date(now.getFullYear(), 3, 11);
    const selection = getSelectionSunday(bracketYear);
    // Selection announcement is at 6pm Eastern Time (EDT in March = UTC-4, so 22:00 UTC)
    // Selection Sunday is always in March, which is EDT (Daylight Saving Time)
    const utcHour = 22; // 6 PM EDT = 10 PM UTC
    selection.setUTCHours(utcHour, 0, 0, 0);
    
    const msUntilSelection = selection.getTime() - now.getTime();
    const days = Math.floor(msUntilSelection / 86400000);
    
    if (msUntilSelection > 0) {
      if (days >= 1) {
        // More than 1 day away - show days countdown
        let msg = `
          <div style="text-align: center">
            <h3>The ${maxYear} bracket arrives in<br/>${days} days!</h3>
            <h5>Use the year selector to see more brackets - all the way back to ${bracketGender === "women" ? WOMEN_MIN_YEAR : MEN_MIN_YEAR}</h5>
          </div>
        `;
        wrap.classList.add("message");
        wrap.getElementsByClassName("msg")[0].innerHTML = msg;
        showBracket = false;
        bracket.setBracket(undefined);
        bracket.render();
      } else {
        // Less than 1 day away - show countdown timer
        const updateCountdown = () => {
          const now = new Date();
          const remaining = selection.getTime() - now.getTime();
          
          if (remaining <= 0) {
            // Time's up! Reload to show bracket
            location.reload();
            return;
          }
          
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          
          const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          let msg = `
            <div style="text-align: center">
              <h3>The ${maxYear} bracket arrives in:</h3>
              <h2 style="font-size: 3em; margin: 0.5em 0; font-family: monospace;">${timeStr}</h2>
              <h5>Use the year selector to see more brackets - all the way back to ${bracketGender === "women" ? WOMEN_MIN_YEAR : MEN_MIN_YEAR}</h5>
            </div>
          `;
          wrap.getElementsByClassName("msg")[0].innerHTML = msg;
        };
        
        wrap.classList.add("message");
        updateCountdown();
        setInterval(updateCountdown, 1000);
        showBracket = false;
        bracket.setBracket(undefined);
        bracket.render();
      }
    } else if (now <= endLiveBracket) {
      useAxiosCache = false;
      bracketUrl = bracketGender === "women"
        ? 'https://circlebracket.s3.amazonaws.com/live-bracket-women.json'
        : 'https://circlebracket.s3.amazonaws.com/live-bracket.json';
    }
  }

  if (showBracket) {
    wrap.classList.add("loading");
    // NOTE: { override: true } forces a fresh network request, bypassing any previously cached entry.
    // For ETag-based revalidation to work, the S3 bucket CORS policy must expose the ETag response
    // header and allow both GET and HEAD methods for the origin(s) accessing this resource.
    axios
      .get(bracketUrl, { cache: useAxiosCache ? undefined : { override: true } })
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

// controls container for year and gender pickers
const controls = document.createElement("div");
controls.className = "controls";

// add gender chooser
const genderPickerElem = genderPicker(initialGender, e => {
  gender = e.target.value;
  const minYear = gender === "women" ? WOMEN_MIN_YEAR : MEN_MIN_YEAR;
  // clamp year to valid range for selected gender
  if (year < minYear) {
    year = minYear;
  }
  // rebuild year picker with updated min year and current year
  const newYearPicker = yearPicker(minYear, maxYear, year, onYearChange);
  yearPickerElem.replaceWith(newYearPicker);
  yearPickerElem = newYearPicker;
  updateHash();
  drawBracket(year, gender);

  if (window.gtag) {
    gtag("event", "view", {
      event_category: "Bracket",
      event_label: `${year}-${gender}`
    });
  }
});
controls.appendChild(genderPickerElem);

// add year chooser and event handler for redrawing bracket on change
function onYearChange(e) {
  year = parseInt(e.target.value);
  updateHash();
  drawBracket(year, gender);

  if (window.gtag) {
    gtag("event", "view", {
      event_category: "Bracket",
      event_label: year
    });
  }
}

const minYear = gender === "women" ? WOMEN_MIN_YEAR : MEN_MIN_YEAR;
let yearPickerElem = yearPicker(minYear, maxYear, initialYear, onYearChange);
controls.appendChild(yearPickerElem);

document.body.appendChild(controls);

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

