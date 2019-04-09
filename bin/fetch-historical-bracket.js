const axios = require("axios");
const fs = require("fs");
const path = require("path");
const teams = require("../src/data/teams.json");

const cacheDir = path.join(__dirname, "../cache/");
const dataDir = path.join(__dirname, "../seasons/");

const year = parseInt(process.argv[2]) || new Date().getFullYear();
const useCache = process.argv[3] !== "false";

if (year < 1985) {
  console.log("Sorry, this tool only works from 1985 and later");
  process.exit(1);
}

if (year > 2015) {
  console.log(
    "This tool is intended to be used for historical brackets only.  You probably want to use fetch-ncaa-bracket instead"
  );
  process.exit(0);
}

function getDataFile() {
  const sourceUrl = `https://raw.githubusercontent.com/danvk/march-madness-data/master/data/${year}.json`;
  const cacheFile = path.join(cacheDir, `historical-${year}.json`);

  return new Promise((resolve, reject) => {
    if (useCache && fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile);
      resolve(JSON.parse(data));
    } else {
      console.warn(`Getting historical data from source!`);
      axios
        .get(sourceUrl)
        .then(res => {
          const data = res.data;
          fs.writeFile(cacheFile, JSON.stringify(data, null, "\t"), err => {
            if (err) {
              console.warn("Cannot write to cache file", err);
            }
          });
          resolve(res.data);
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

function lookupTeamCode(name) {
  // remove/replace some special chars from our source data
  const compare = name
    .replace("–", "-")
    .replace(/#*/g, "")
    .trim();
  for (const [code, team] of Object.entries(teams)) {
    if (team.name === compare) {
      return code;
    } else if (team.abbr === compare) {
      return code;
    } else if (
      code.toLowerCase() ===
      compare
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/\./g, "")
    ) {
      return code;
    } else if (team.alternates && team.alternates.indexOf(compare) >= 0) {
      return code;
    }
  }

  console.warn("Cannot find code for " + name);
  return "";
}

const roundMap = {
  64: 1,
  32: 2,
  16: 3,
  8: 4,
  4: 5,
  2: 6
};

getDataFile()
  .then(data => {
    // console.log(data.regions[0]);
    // get all games in a flat array
    let games = [];
    for (let i = 0; i < data.regions.length; i++) {
      // this is the actual region
      const regionNumber = i + 1;
      const regions = data.regions[i];

      // this is rounds within a region
      for (let j = 0; j < regions.length; j++) {
        const rounds = regions[j];

        for (let k = 0; k < rounds.length; k++) {
          const game = rounds[k];

          // home team has the higher seed
          let homeIndex, awayIndex;
          if (game[0].seed > game[1].seed) {
            homeIndex = 1;
            awayIndex = 0;
          } else {
            homeIndex = 0;
            awayIndex = 1;
          }

          // finally we are looking at games
          games.push({
            home: {
              name: game[homeIndex].team,
              code: lookupTeamCode(game[homeIndex].team), // don't know this yet
              seed: game[homeIndex].seed,
              score: game[homeIndex].score,
              winner: game[homeIndex].score > game[awayIndex].score
            },
            away: {
              name: game[awayIndex].team,
              code: lookupTeamCode(game[awayIndex].team), // don't know this yet
              seed: game[awayIndex].seed,
              score: game[awayIndex].score,
              winner: game[awayIndex].score > game[homeIndex].score
            },
            date: "",
            region: regionNumber,
            round: roundMap[game[homeIndex].round_of],
            isComplete: true,
            link: ""
          });
        }
      }
    }

    // add final four games
    for (let i = 0; i < data.finalfour.length; i++) {
      for (let j = 0; j < data.finalfour[i].length; j++) {
        const game = data.finalfour[i][j];

        // home team has the higher seed, or if the seeds are equal home is the first team listed
        let homeIndex, awayIndex;
        if (game[0].seed > game[1].seed) {
          homeIndex = 1;
          awayIndex = 0;
        } else {
          homeIndex = 0;
          awayIndex = 1;
        }

        games.push({
          home: {
            name: game[homeIndex].team,
            code: lookupTeamCode(game[homeIndex].team), // don't know this yet
            seed: game[homeIndex].seed,
            score: game[homeIndex].score,
            winner: game[homeIndex].score > game[awayIndex].score
          },
          away: {
            name: game[awayIndex].team,
            code: lookupTeamCode(game[awayIndex].team), // don't know this yet
            seed: game[awayIndex].seed,
            score: game[awayIndex].score,
            winner: game[awayIndex].score > game[homeIndex].score
          },
          date: "",
          region: "",
          round: roundMap[game[homeIndex].round_of],
          isComplete: true,
          link: ""
        });
      }
    }

    // now we have our games, but need to determine the regions for the final four and placement of regions

    let regionPlacements = [];

    const champGame = games.find(game => game.round === 6);
    const t1Code = champGame.home.code;
    const t1Region = games.find(
      game => game.home.code === t1Code || game.away.code === t1Code
    ).region;
    regionPlacements[t1Region] = "TL";

    const t2Code = champGame.away.code;
    const t2Region = games.find(
      game => game.home.code === t2Code || game.away.code === t2Code
    ).region;
    regionPlacements[t2Region] = "TR";

    // now we have the region placement for champ teams.  the other FF teams go in the lower slots corresponding to opponents
    const ffGames = games.filter(game => game.round === 5);
    for (const ffGame of ffGames) {
      let oppCode, placement;
      if (ffGame.home.code === t1Code) {
        oppCode = ffGame.away.code;
        placement = "BL";
      } else if (ffGame.away.code === t1Code) {
        oppCode = ffGame.home.code;
        placement = "BL";
      } else if (ffGame.home.code === t2Code) {
        oppCode = ffGame.away.code;
        placement = "BR";
      } else if (ffGame.away.code === t2Code) {
        oppCode = ffGame.home.code;
        placement = "BR";
      } else {
        continue;
      }

      // find region of opponent
      const oppRegion = games.find(
        game => game.home.code === oppCode || game.away.code === oppCode
      ).region;
      regionPlacements[oppRegion] = placement;
    }

    // now go through every game and update the region number with the region code
    games.forEach(game => {
      if (game.region !== "") {
        game.region = regionPlacements[game.region];
      }
    });

    const regions = regionPlacements.slice(1).map(placement => ({
      name: "", // sorry, don't know this
      position: placement
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
    if (true) {
      // TODO: allow spitting out to the console instead of to a file
      const outFile = path.join(dataDir, `bracket-${year}.json`);
      fs.writeFile(outFile, JSON.stringify(data, null, "\t"), err => {
        if (err) {
          console.error(err);
          return false;
        }
        return true;
      });
    } else {
      console.log(data);
      return true;
    }
  })
  .finally(() => {
    console.log("Done!");
  });
