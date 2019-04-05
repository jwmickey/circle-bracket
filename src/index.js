import canvas from "./js/components/canvas";
import Bracket from "./js/bracket";
import teams from "./data/teams.json";
import "./styles/style.sass";

let width = window.innerWidth;
let height = window.innerHeight;
width = Math.min(width, height);
height = Math.min(width, height);
// let width = 1200;
// let height = 1200;

const cvs = document.body.appendChild(canvas(width, height));
const bracket = new Bracket(cvs);

const seedSlotMap = [
  [0, 14, 10, 6, 4, 8, 12, 2, 3, 13, 9, 5, 7, 11, 15, 1], // round 1 seed => slot
  [0, 7, 5, 3, 2, 4, 6, 1, 1, 6, 4, 2, 3, 5, 7, 0], // round 2
  [0, 3, 2, 1, 1, 2, 3, 0, 0, 3, 2, 1, 1, 2, 3, 0], // sweet 16,
  [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // elite 8
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // final 4
];

function translateToSlot(regionCode, round, team) {
  let quadrant;

  if (round >= 5) {
    regionCode = findTeamRegion(team.code);
  }

  switch (regionCode) {
    case "TL":
      quadrant = 2;
      break;
    case "TR":
      quadrant = 3;
      break;
    case "BL":
      quadrant = 1;
      break;
    case "BR":
      quadrant = 0;
      break;
  }

  // TODO: champ game should be handled separately since it spans two quadrants
  if (round === 6) {
    return quadrant === 2 || quadrant === 1 ? 1 : 0;
  } else if (round === 5) {
    return quadrant;
  }

  const slots = 64 / Math.pow(2, round - 1);
  const offset = (slots / 4) * quadrant;
  return offset + seedSlotMap[round - 1][team.seed - 1];
}

function findTeamRegion(teamCode) {
  return bracketData.games.find(game => {
    return game.home.code === teamCode || game.away.code === teamCode;
  }).region;
}

const params = new URL(document.location).searchParams;
const year = params.get("year") || 2019;
const bracketData = require("./data/bracket-" + year + ".json");

const dataset = bracketData.games.filter(
  game => game.round > 0 && game.home.code !== ""
);
for (let i = 0; i < dataset.length; i++) {
  const game = dataset[i];
  const homeTeamSlot = translateToSlot(game.region, game.round, game.home);
  const awayTeamSlot = translateToSlot(game.region, game.round, game.away);

  bracket.fillSlot(game.round - 1, homeTeamSlot, teams[game.home.code], "home");
  bracket.fillSlot(game.round - 1, awayTeamSlot, teams[game.away.code], "away");

  if (game.round === 6) {
    if (game.home.winner) {
      bracket.fillChamp(teams[game.home.code]);
    } else if (game.away.winner) {
      bracket.fillChamp(teams[game.away.code]);
    }
  }
}

setTimeout(bracket.drawGrid, 1000);
