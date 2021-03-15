import { createImageUrlFromLogo, findTeamByCode } from "../utils";
import teams from "../../data/teams";

export default (game, displaySeeds = false, id = "info") => {
  const root = document.createElement("div");
  root.id = id;
  root.className = "game-info";

  for (const team of [game.home, game.away]) {
    const teamCode = team.code;
    const teamInfo = findTeamByCode(teamCode);
    if (!teamInfo) {
      continue;
    }

    // wrap in an outer div
    const wrap = document.createElement("div");
    wrap.className = "team";

    // logo, prevent drag or context menu as a show of good faith towards logo owners
    const img = document.createElement("img");
    img.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      return false;
    });
    img.addEventListener("mousedown", function(e) {
      e.preventDefault();
      return false;
    });
    if (teamInfo && teamInfo.logo) {
      img.src = createImageUrlFromLogo(teamInfo.logo.url)[0];
    }

    // title (team name and mascot)
    const title = document.createElement("div");
    title.className = "title";

    // name and (optionally) seed
    const teamName = document.createElement("h1");
    teamName.innerText = team.name;
    if (displaySeeds) {
      teamName.innerText += ` (${team.seed})`;
    }

    // mascot
    const mascot = document.createElement("h2");
    mascot.innerText = teamInfo.mascot;
    title.appendChild(teamName);
    title.appendChild(mascot);
    title.style.color = teamInfo.primaryColor;

    // score
    const score = document.createElement("h1");
    score.innerText = team.score;
    score.className = team.winner ? "score winner" : "score";

    // append all child elements to wrap
    wrap.appendChild(img);
    wrap.appendChild(title);
    wrap.appendChild(score);

    // append wrap to root
    root.appendChild(wrap);
  }

  // add game meta info
  const meta = document.createElement("div");
  meta.className = "meta";

  if (game.location) {
    const locElem = document.createElement("p");
    locElem.innerText = game.location;
    meta.appendChild(locElem);
  }

  if (game.date) {
    const date = new Date(game.date);
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      date
    );
    const day = date.getDate();
    const year = date.getFullYear();
    let dateElem = document.createElement("p");
    dateElem.innerText = `${month} ${day}, ${year}`;
    meta.appendChild(dateElem);
  }

  if (game.link.length) {
    const linkElem = document.createElement("p");
    const link = document.createElement("a");
    link.target = "_blank";
    link.href = game.link;
    link.innerHTML = "View Game Summary";
    linkElem.appendChild(link);
    meta.appendChild(linkElem);
  }
  root.appendChild(meta);

  // add closer
  const close = document.createElement("div");
  close.innerText = "×";
  close.className = "close";
  close.title = "Close";
  root.appendChild(close);

  return root;
};
