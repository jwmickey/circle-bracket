const axios = require("axios");
const fs = require("fs");
const path = require("path");

const cacheDir = path.join(__dirname, "../cache/");
const linkPrefix = "https://www.ncaa.com";

function fetchBracket(year, useCache = true) {
  return Promise.all([
    getDataFile(year, "setup", useCache),
    getDataFile(year, "bracket", useCache)
  ])
    .then(([setup, bracket]) => {
      // identify regions and their placement
      const regionCodes = ["TL", "TR", "BL", "BR"];
      const regions = setup.regions
        .filter(region => regionCodes.indexOf(region.regionCode) >= 0)
        .map(orig => ({
          position: orig.regionCode,
          name: orig.title
        }));

      // make an easily accessible map of region name to region quadrant
      const regionsMap = regions.reduce((accu, curr) => {
        accu[curr.name] = curr.position;
        return accu;
      }, {});

      // make an easily accessible map of round name to round number
      const roundsMap = setup.rounds.reduce((accu, curr) => {
        accu[curr.title] = curr.roundnumber - 1; // we'll zero-base this so play in = 0, first round = 1, etc.
        return accu;
      }, {});

      const games = bracket.games.map(entry => ({
        home: {
          name: entry.game.home.names.short,
          code: entry.game.home.names.seo,
          seed: parseInt(entry.game.home.seed),
          score: parseInt(entry.game.home.score),
          winner: !!entry.game.home.winner
        },
        away: {
          name: entry.game.away.names.short,
          code: entry.game.away.names.seo,
          seed: parseInt(entry.game.away.seed),
          score: parseInt(entry.game.away.score),
          winner: !!entry.game.away.winner
        },
        date: entry.game.startDate,
        location: entry.game.location,
        region: regionsMap[entry.game.bracketRegion] || "",
        round: roundsMap[entry.game.bracketRound],
        isComplete: entry.game.gameState === "final",
        link: entry.game.url && linkPrefix + entry.game.url
      }));

      return {
        format: "ncaa",
        updated: new Date(),
        year,
        regions,
        games
      };
    })
    .then(data => {
      return data;
    });
}

function getDataFile(year, dataType, useCache) {
  let url = "";
  switch (dataType) {
    case "setup":
      url = `https://data.ncaa.com/carmen/brackets/championships/basketball-men/d1/${year}/definition.json`;
      break;
    case "bracket":
      url = `https://data.ncaa.com/casablanca/carmen/brackets/championships/basketball-men/d1/${year}/data.json`;
      break;
    default:
      return Promise.reject("Invalid data type: " + dataType);
  }

  const cacheFile = path.join(cacheDir, `${dataType}-${year}.json`);

  return new Promise((resolve, reject) => {
    if (useCache && fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile);
      resolve(JSON.parse(data));
    } else {
      console.debug(`Getting ${dataType} from source!`);
      axios
        .get(url)
        .then(res => {
          const data = res.data;
          if (useCache) {
              fs.writeFile(cacheFile, JSON.stringify(data, null, "\t"), err => {
                  if (err) {
                      console.warn("Cannot write to cache file", err);
                  }
              });
          }
          resolve(res.data);
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

module.exports = fetchBracket;
