#!/usr/bin/env node

/**
 * Updates game links in bracket JSON files from NCAA.com URLs to Sports Reference URLs.
 * 
 * Usage: node bin/update-links-to-sr.js <year>
 * 
 * - Fetches SR bracket HTML (caches for future runs)
 * - Skips play-in games (round 0)
 * - Matches games by team codes
 * - Logs unmatched games
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const cacheDir = path.join(__dirname, "../cache/");
const dataDir = path.join(__dirname, "../seasons/");

const year = parseInt(process.argv[2]) || new Date().getFullYear();

const linkPrefix = "https://www.sports-reference.com";

// Mapping from this app's team codes to Sports Reference team codes
// Add new mappings here as they are discovered
const SR_CODE_MAP = {
  "uconn": "connecticut",
  "north-carolina-st": "north-carolina-state",
  "fla-atlantic": "florida-atlantic",
  "col-of-charleston": "college-of-charleston",
  "st-marys-ca": "saint-marys-ca",
  "texas-am": "texas-am",
  "western-ky": "western-kentucky",
  "long-beach-st": "long-beach-state",
  "michigan-st": "michigan-state",
  "mississippi-st": "mississippi-state",
  "iowa-st": "iowa-state",
  "washington-st": "washington-state",
  "south-dakota-st": "south-dakota-state",
  "morehead-st": "morehead-state",
  "colorado-st": "colorado-state",
  "utah-st": "utah-state",
  "san-diego-st": "san-diego-state",
  "st-peters": "saint-peters",
  "boise-st": "boise-state",
  "montana-st": "montana-state",
  "mcneese": "mcneese-state",
  "grambling": "grambling",
  "uab": "alabama-birmingham",
  "byu": "brigham-young",
  "tcu": "texas-christian",
  "am-corpus-chris": "texas-am-corpus-christi",
  "uc-santa-barbara": "california-santa-barbara",
  "la-lafayette": "louisiana-lafayette",
  "kansas-st": "kansas-state",
  "northern-ky": "northern-kentucky",
  "kent-st": "kent-state",
  "kennesaw-st": "kennesaw-state",
  "penn-st": "penn-state",
  "arizona-st": "arizona-state",
  "unc-asheville": "north-carolina-asheville",
  "vcu": "virginia-commonwealth",
  "georgia-st": "georgia-state",
  "new-mexico-st": "new-mexico-state",
  "cal-st-fullerton": "cal-state-fullerton",
  "norfolk-st": "norfolk-state",
  "murray-st": "murray-state",
  "wright-st": "wright-state",
  "loyola-chicago": "loyola-il",
  "ohio-st": "ohio-state",
  "jacksonville-st": "jacksonville-state",
  "lsu": "louisiana-state",
  "eastern-wash": "eastern-washington",
  "florida-st": "florida-state",
  "oregon-st": "oregon-state",
  "oklahoma-st": "oklahoma-state",
  "cleveland-st": "cleveland-state",
  "unc-greensboro": "north-carolina-greensboro",
  "ole-miss": "mississippi",
  "uc-irvine": "california-irvine",
  "north-dakota-st": "north-dakota-state",
  "ucf": "central-florida",
  "penn": "pennsylvania",
  "wichita-st": "wichita-state",
  "umbc": "maryland-baltimore-county",
  "unc-wilmington": "north-carolina-wilmington",
  "east-tenn-st": "east-tennessee-state",
  "middle-tenn": "middle-tennessee",
  "mt-st-marys": "mount-st-marys",
  "fgcu": "florida-gulf-coast",
  "smu": "southern-methodist",
  "uc-davis": "california-davis",
  "ualr": "arkansas-little-rock",
  "fresno-st": "fresno-state",
  "bakersfield": "cal-state-bakersfield",
  "weber-st": "weber-state",
  "uni": "northern-iowa",
  "alabama-st": "alabama-state",
  "uc-san-diego": "california-san-diego",
  "neb-omaha": "nebraska-omaha",
  "st-johns-ny": "st-johns-ny",
  "siu-edwardsville": "southern-illinois-edwardsville",
};

/**
 * Fetch SR bracket HTML, using cache if available
 */
function fetchSrHtml() {
  const sourceUrl = `https://www.sports-reference.com/cbb/postseason/${year}-ncaa.html`;
  const htmlCacheFile = path.join(cacheDir, `sr-${year}.html`);
  const jsonCacheFile = path.join(cacheDir, `sr-${year}.json`);

  return new Promise((resolve, reject) => {
    // Check for HTML cache first
    if (fs.existsSync(htmlCacheFile)) {
      console.log(`Using cached SR HTML for ${year}`);
      const data = fs.readFileSync(htmlCacheFile, "utf8");
      resolve(data);
    // Then check for JSON cache (from fetch-sr-bracket.js)
    } else if (fs.existsSync(jsonCacheFile)) {
      console.log(`Using cached SR JSON for ${year}`);
      const data = fs.readFileSync(jsonCacheFile, "utf8");
      resolve(JSON.parse(data));
    } else {
      console.log(`Fetching SR bracket from ${sourceUrl}...`);
      axios
        .get(sourceUrl)
        .then(res => {
          const data = res.data;
          // Cache for future runs
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          fs.writeFileSync(jsonCacheFile, JSON.stringify(data, null, "\t"));
          console.log(`Cached SR data to ${jsonCacheFile}`);
          resolve(data);
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

/**
 * Convert app team code to SR team code
 */
function toSrCode(code) {
  return SR_CODE_MAP[code] || code;
}

/**
 * Extract SR team code from school URL
 * e.g., "/cbb/schools/alabama/men/2024.html" -> "alabama"
 * e.g., "/cbb/schools/college-of-charleston/men/2024.html" -> "college-of-charleston"
 */
function extractSrCodeFromUrl(url) {
  const match = url.match(/\/cbb\/schools\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Parse SR HTML and build a lookup map of games
 * Key format: sorted team codes joined with "-"
 * Returns: Map<string, string> where value is the boxscore link
 */
function parseSrGames(html) {
  const $ = cheerio.load(html);
  const games = new Map();

  // Find all game containers - they contain two team divs and a span with the boxscore link
  $("#brackets > div").each(function () {
    $(this)
      .find("div.round")
      .each(function () {
        $(this)
          .find("> div")
          .each(function () {
            const teamDivs = $(this).find("> div");
            
            // Skip if not a game (need exactly 2 team divs)
            if (teamDivs.length !== 2) {
              return;
            }

            // Skip byes
            if ($(this).hasClass("bye")) {
              return;
            }

            // Extract team codes from school links
            const srCodes = [];
            teamDivs.each(function () {
              const schoolLink = $(this).find('a[href*="/cbb/schools/"]').attr("href");
              if (schoolLink) {
                const code = extractSrCodeFromUrl(schoolLink);
                if (code) {
                  srCodes.push(code);
                }
              }
            });

            if (srCodes.length !== 2) {
              return;
            }

            // Get the boxscore link from the game info span or from score links
            let boxscoreLink = null;
            
            // Try the span at the bottom (location link)
            const infoSpan = $(this).find("> span a[href*='/boxscores/']");
            if (infoSpan.length) {
              boxscoreLink = infoSpan.attr("href");
            }
            
            // Or get it from one of the score links
            if (!boxscoreLink) {
              const scoreLink = $(this).find("div a[href*='/boxscores/']").first();
              if (scoreLink.length) {
                boxscoreLink = scoreLink.attr("href");
              }
            }

            if (!boxscoreLink) {
              return;
            }

            // Create lookup key (sorted to handle home/away order differences)
            const sortedCodes = [...srCodes].sort();
            const key = sortedCodes.join("-");

            games.set(key, linkPrefix + boxscoreLink);
          });
      });
  });

  return games;
}

/**
 * Main execution
 */
async function main() {
  console.log(`\nUpdating links for ${year} bracket...\n`);

  // Load existing bracket
  const bracketPath = path.join(dataDir, `bracket-${year}.json`);
  if (!fs.existsSync(bracketPath)) {
    console.error(`Bracket file not found: ${bracketPath}`);
    process.exit(1);
  }

  const bracket = JSON.parse(fs.readFileSync(bracketPath, "utf8"));

  // Fetch SR bracket HTML
  let srHtml;
  try {
    srHtml = await fetchSrHtml();
  } catch (err) {
    console.error(`\nFailed to fetch SR bracket: ${err.message}`);
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers['retry-after'];
      console.error(`Rate limited. Try again in ${retryAfter ? Math.ceil(retryAfter / 60) + ' minutes' : 'a while'}.`);
    }
    process.exit(1);
  }

  const srGames = parseSrGames(srHtml);
  console.log(`Found ${srGames.size} games on Sports Reference\n`);

  // Track statistics
  let updated = 0;
  let skipped = 0;
  let unmatched = 0;
  let alreadyCorrect = 0;

  // Process each game
  for (const game of bracket.games) {
    // Skip play-in games
    if (game.round === 0) {
      skipped++;
      continue;
    }

    const homeCode = game.home.code;
    const awayCode = game.away.code;

    // Create lookup key using SR codes (sorted alphabetically)
    const srHomeSorted = toSrCode(homeCode);
    const srAwaySorted = toSrCode(awayCode);
    const sortedCodes = [srHomeSorted, srAwaySorted].sort();
    const key = sortedCodes.join("-");

    // Try to find matching SR game
    const srLink = srGames.get(key);

    if (!srLink) {
      console.log(`❌ UNMATCHED: ${game.home.name} vs ${game.away.name} (Round ${game.round})`);
      console.log(`   Lookup key: ${key}`);
      unmatched++;
      continue;
    }

    // Check if already using SR link
    if (game.link === srLink) {
      alreadyCorrect++;
      continue;
    }

    // Update the link
    game.link = srLink;
    console.log(`✔ Updated: ${game.home.name} vs ${game.away.name}`);
    updated++;
  }

  // Save updated bracket
  bracket.updated = new Date().toISOString();
  fs.writeFileSync(bracketPath, JSON.stringify(bracket, null, "\t"));

  // Print summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`SUMMARY for ${year}:`);
  console.log(`${"=".repeat(50)}`);
  console.log(`✔ Updated:           ${updated}`);
  console.log(`✔ Already correct:   ${alreadyCorrect}`);
  console.log(`⏭ Skipped (play-in): ${skipped}`);
  console.log(`❌ Unmatched:         ${unmatched}`);
  console.log(`${"=".repeat(50)}\n`);

  if (unmatched > 0) {
    console.log("Some games could not be matched. Check the SR_CODE_MAP for missing team code mappings.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
