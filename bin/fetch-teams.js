const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const http = require("https");

const TEAMS_JSON_FILE = path.join(__dirname, "../src/data/teams.json");
const LOGO_DIR = path.join(__dirname, "../src/img/logos/");
const CONF_PAGE_URL =
  "https://www.ncaa.com/standings/basketball-men/d1/all-conferences";

const TEAM_TEMPLATE = {
  name: "",
  abbr: "",
  mascot: "",
  primaryColor: "",
  secondaryColor: "",
  logo: {
    url: "",
    attribution: "",
    background: ""
  },
  conference: ""
};

if (fs.existsSync(TEAMS_JSON_FILE)) {
  console.warn("TEAMS FILE ALREADY EXISTS, EXITING");
  process.exit(0);
}

axios
  .get(CONF_PAGE_URL)
  .then(res => {
    // get raw data as an array of objects with team name and logo url
    const $ = cheerio.load(res.data);
    let teams = [];
    $("td.standings-team").each(function(i, elem) {
      teams.push({
        ...TEAM_TEMPLATE,
        ...{
          name: $(this).text(),
          logo: {
            url: $(this)
              .children("img")
              .attr("src"),
            attribution: "",
            background: ""
          }
        }
      });
    });
    return teams;
  })
  .then(teams => {
    // convert to team-name indexed object and save to JSON file
    const asObj = teams.reduce((accu, curr) => {
      const x = curr.logo.url.lastIndexOf("/") + 1;
      const y = curr.logo.url.indexOf(".svg");
      const index = curr.logo.url.substring(x, y);
      accu[index] = curr;
      return accu;
    }, {});

    fs.writeFile(TEAMS_JSON_FILE, JSON.stringify(asObj, null, "\t"), err => {
      if (err) {
        console.error("Error writing JSON file", err);
      }
    });

    return asObj;
  })
  .then(teams => {
    // get logos
    for (const [key, val] of Object.entries(teams)) {
      http
        .get(val.logo.url, res => {
          const file = fs.createWriteStream(path.join(LOGO_DIR, `${key}.svg`));
          res.pipe(file);
          file.on("finish", () => file.close());
        })
        .on("error", err => {
          console.error(`Error getting logo for ${key}`, err);
        });
    }
  })
  .then(() => {
    // make logo urls relative to project

    fs.readFile(TEAMS_JSON_FILE, (err, data) => {
      if (err) {
        console.error("Error reading JSON file", err);
        return;
      }

      let teams = JSON.parse(data);
      for (const key of Object.keys(teams)) {
        teams[key].logo.url = `img/logos/${key}.svg`;
      }

      fs.writeFile(TEAMS_JSON_FILE, JSON.stringify(teams, null, "\t"), err => {
        if (err) {
          console.error("Error writing JSON file", err);
        } else {
          console.log("Done!");
        }
      });
    });
  })
  .catch(err => {
    console.error(err);
  });
