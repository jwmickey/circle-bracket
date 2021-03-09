import fs from "fs";
import path from "path";
import fetchClassic from "../functions/fetchers/ncaa";
import fetchBracket from "../functions/fetchers/ncaa_2021";

const dataDir = path.join(__dirname, "../seasons/");

// CLI INPUTS
const year = parseInt(process.argv[2]) || new Date().getFullYear();
const useCache = process.argv[3] !== "false";
const printOutput = process.argv[4] === "true";

let fetcher;

if (year < 2016) {
  console.log("Sorry, this tool only works from year 2016 and forward");
  process.exit(1);
} else if (year < 2019) {
  fetcher = fetchClassic;
} else {
  fetcher = fetchBracket;
}

fetcher(year, useCache)
  .then(bracket => {
    if (printOutput) {
      console.log('DATA', JSON.stringify(bracket, null, 2));
      return true;
    } else {
      const outFile = path.join(dataDir, `bracket-${year}.json`);
      fs.writeFile(outFile, JSON.stringify(bracket, null, "\t"), err => {
        if (err) {
          console.error(err);
        }
      });
    }
  })
  .catch(err => {
    console.error(err);
  });
