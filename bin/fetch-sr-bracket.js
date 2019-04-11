const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const teams = require("../src/data/teams.json");

const cacheDir = path.join(__dirname, "../cache/");
const dataDir = path.join(__dirname, "../seasons/");

const year = parseInt(process.argv[2]) || new Date().getFullYear();
const useCache = process.argv[3] !== "false";

if (year < 1956) {
  console.log(
    "This tool can only generate brackets from years 1956 to present"
  );
  process.exit(1);
}

const linkPrefix = "https://www.sports-reference.com";

function getRawFile() {
  const sourceUrl = `https://www.sports-reference.com/cbb/postseason/${year}-ncaa.html`;
  const cacheFile = path.join(cacheDir, `sr-${year}.json`);

  return new Promise((resolve, reject) => {
    if (useCache && fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile);
      resolve(JSON.parse(data));
    } else {
      console.warn(`Getting sr html from source!`);
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

getRawFile()
  .then(html => {
    const $ = cheerio.load(html);

    let regions = [];
    let games = [];
    let maxRound = 0;
    $("#brackets > div").each(function() {
      const region = $(this).attr("id");
      if (region !== "national") {
        regions.push({
          name: region,
          position: ""
        });
      }
      $(this)
        .find("div.round")
        .each(function(i, el) {
          const round = i + 1;
          maxRound = Math.max(maxRound, round);
          $(this)
            .find("> div")
            .each(function() {
              if ($(this).find("> div").length === 1) {
                return; // skip champ, this is a single line and we don't need it
              }

              if ($(this).hasClass("bye")) {
                // add bye's, but these will be filtered out later
                games.push({
                  region,
                  round,
                  bye: true
                });
                return;
              }

              // get date, location, and link for game
              const gameInfo = $(this).find("> span");
              const link = gameInfo.find("a").attr("href");
              const location = gameInfo
                .text()
                .replace(/^at /, "")
                .trim();
              const date = link.match(/\d{4}-\d{2}-\d{2}/)[0];

              let game = {
                home: {},
                away: {},
                date,
                location,
                region: region === "national" ? "" : region,
                round: region === "national" ? round + maxRound - 1 : round,
                link: linkPrefix + link,
                isComplete: true
              };

              // get the name, code, seed, and score for both teams.
              const teams = $(this)
                .find("> div")
                .map(function() {
                  const name = $(this)
                    .find("a")
                    .first()
                    .text()
                    .trim();
                  return {
                    name: name,
                    code: lookupTeamCode(name),
                    seed: parseInt(
                      $(this)
                        .find("span")
                        .text()
                    ),
                    score: parseInt(
                      $(this)
                        .find("a")
                        .next()
                        .text()
                    ),
                    winner: false
                  };
                })
                .get();

              // determine winner
              if (teams[0].score > teams[1].score) {
                teams[0].winner = true;
              } else {
                teams[1].winner = true;
              }

              // determine home or away
              let homeIndex, awayIndex;
              if (isNaN(teams[0].seed) || isNaN(teams[1].seed)) {
                homeIndex = 0;
                awayIndex = 1;
              } else {
                homeIndex = teams[0].seed < teams[1].seed ? 0 : 1;
                awayIndex = teams[1].seed <= teams[0].seed ? 0 : 1;
              }

              game.home = teams[homeIndex];
              game.away = teams[awayIndex];

              games.push(game);
            }); // game
        }); // round
    }); //

    // older tournaments did not seed teams, so we'll artificially create seeds for placement purposes only
    const seedless =
      games.find(game => !game.bye && isNaN(game.home.seed)) !== undefined;
    if (seedless) {
      games = assignSeeds(games);
    }

    // return regions and games, filtering out any byes
    return {
      games: games.filter(game => !game.hasOwnProperty("bye")),
      regions,
      displaySeeds: !seedless
    };
  })
  .then(({ games, regions, displaySeeds }) => {
    // now we have our games, but need to determine the regions for the final four and placement of regions
    let regionPlacements = [];

    // how many rounds are there?  this is useful in a couple of places
    const numRounds = games.reduce(
      (total, curr) => Math.max(total, curr.round),
      0
    );

    const champGame = games.find(game => game.round === numRounds);
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
    const ffGames = games.filter(game => game.round === numRounds - 1);
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

    // update name and position of regions
    for (entry of regions) {
      if (regionPlacements[entry.name]) {
        entry.position = regionPlacements[entry.name];
      }
      entry.name =
        entry.name.substring(0, 1).toUpperCase() + entry.name.substring(1);
    }

    return {
      format: "ncaa",
      displaySeeds,
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
  .catch(err => {
    console.log("ERROR", err);
  })
  .finally(() => {
    console.log("Done!");
  });

// artificially assign seeds for slot placement purposes.  these seeds will not be displayed anywhere
function assignSeeds(games) {
  // for each region, determine the number of teams and bye's in the first round.  this will determine seeding
  const firstRoundByRegion = games
    .filter(game => game.region.length > 0 && game.round === 1)
    .reduce((accu, game) => {
      if (!accu.hasOwnProperty(game.region)) {
        accu[game.region] = {
          teams: 0,
          byes: 0,
          byeOrder: ""
        };
      }
      accu[game.region].byes += game.bye ? 1 : 0;
      accu[game.region].teams += game.bye ? 1 : 2;
      accu[game.region].byeOrder += game.bye ? "b" : "g";
      return accu;
    }, {});

  let seedAssignments = {};
  let region = games[0].region;
  let seedIndex = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    if (game.hasOwnProperty("bye") || game.region.length === 0) {
      continue;
    }

    if (seedAssignments[game.home.code]) {
      game.home.seed = seedAssignments[game.home.code];
    }

    if (seedAssignments[game.away.code]) {
      game.away.seed = seedAssignments[game.away.code];
    }

    if (game.region !== region) {
      seedIndex = 0;
    }

    if (!game.home.seed) {
      region = game.region;
      const { teams, byes, byeOrder } = firstRoundByRegion[region];
      game.home.seed = determineSeedForBye(teams, byes, byeOrder, seedIndex++);
      seedAssignments[game.home.code] = game.home.seed;
    }

    if (!game.away.seed) {
      region = game.region;
      const { teams, byes, byeOrder } = firstRoundByRegion[region];
      game.away.seed = determineSeedForBye(teams, byes, byeOrder, seedIndex++);
      seedAssignments[game.away.code] = game.away.seed;
    }
  }
}

// seed orientation can get weird
function determineSeedForBye(teams, byes, byeOrder, index) {
  if (teams === 8 && byes === 0) {
    return [1, 8, 4, 5, 3, 6, 2, 7][index];
  } else if (teams === 7 && byes === 1) {
    if (byeOrder === "bggg" || byeOrder === "gbgg") {
      return [4, 5, 2, 7, 3, 6, 1][index];
    } else {
      return [2, 7, 3, 6, 4, 5, 1][index];
    }
  } else if (teams === 6 && byes === 2) {
    if (byeOrder === "gbgb" || byeOrder === "bggb") {
      return [4, 5, 3, 6, 1, 2][index];
    } else {
      return [4, 5, 3, 6, 1, 2][index];
    }
  } else if (teams === 5 && byes === 3) {
    if (byeOrder === "bgbb" || byeOrder === "gbbb") {
      return [4, 5, 1, 2, 3][index];
    } else {
      return [4, 5, 2, 3, 1][index];
    }
  } else {
    return 0; // oh no
  }
}
