// these are prefixed with MY_ because they are reserved in netlify
const ACCESS_KEY_ID = process.env.MY_AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.MY_AWS_SECRET_ACCESS_KEY;
const BUCKET = 'circlebracket';
const OBJECT_KEY_MEN = 'live-bracket.json';
const OBJECT_KEY_WOMEN = 'live-bracket-women.json';
const REFRESH_LIMIT = 600;  // how long to wait between checks in seconds

const crypto = require("crypto");
const aws = require("aws-sdk");
const fetchBracket = require("./fetchers/ncaa_2021");

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async (event, context) => {
  const now = new Date();
  console.log('Updating live bracket', now);

  // only check during specific times when we expect changes to the bracket
  if (!shouldCheckNow()) {
    console.log('No updates are expected to be available at this time');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "No updates are expected to be available at this time" })
    };
  }

  if (ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
    aws.config.update({
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY
      }
    });
  }
  const s3 = new aws.S3({apiVersion: "2006-03-01"});
  const year = new Date().getFullYear();

  const results = await Promise.allSettled([
    updateBracketForGender(s3, year, "men", OBJECT_KEY_MEN, now),
    updateBracketForGender(s3, year, "women", OBJECT_KEY_WOMEN, now)
  ]);

  const menResult = results[0];
  const womenResult = results[1];

  if (menResult.status === "rejected" && womenResult.status === "rejected") {
    const errorMsg = `Both men's and women's bracket updates failed. Men: ${menResult.reason.toString()}. Women: ${womenResult.reason.toString()}`;
    console.error(errorMsg);
    return { statusCode: 500, body: JSON.stringify({ error: errorMsg, men: menResult.reason.toString(), women: womenResult.reason.toString() }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      men: menResult.status === "fulfilled" ? menResult.value : { error: menResult.reason.toString() },
      women: womenResult.status === "fulfilled" ? womenResult.value : { error: womenResult.reason.toString() },
      lastModified: now,
      message: "OK"
    })
  };
};

async function updateBracketForGender(s3, year, gender, objectKey, now) {
  // check the last modified date on the stored file to make sure we don't try getting this too often
  try {
    const meta = await s3.headObject({Bucket: BUCKET, Key: objectKey}).promise();
    const elapsed = Math.floor((now.getTime() - meta.LastModified.getTime()) / 1000);
    if (elapsed < REFRESH_LIMIT) {
      const mins = Math.ceil((REFRESH_LIMIT - elapsed) / 60);
      const message = `[${gender}] Waiting ${mins} minutes before next refresh`;
      console.log(message);
      return { message };
    }
  } catch (err) {
    console.warn(`[${gender}]`, err.message);
    // can't get meta info, keep going
  }

  const bracket = await fetchBracket(year, false, gender);
  const bracketJson = JSON.stringify(bracket, null, "\t");
  const hasher = crypto.createHash('md5');
  const md5 = hasher.update(bracketJson).digest('base64');
  console.log(`[${gender}] md5`, md5);
  const objectParams = {
    Bucket: BUCKET,
    Key: objectKey,
    Body: bracketJson,
    ContentMD5: md5,
    ContentType: 'application/json',
    CacheControl: 'no-cache, max-age=0, must-revalidate'
  };

  const upload = await s3.putObject(objectParams).promise();
  return { upload, bracket, message: "OK" };
}

function shouldCheckNow() {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay();

  // allow on selection sunday
  if (getSelectionSunday(year).toDateString() === today.toDateString()) {
    return true;
  }

  // allow on champ game or day after, in case of late overtime
  const tournamentEnd = getTournamentEnd(year);
  if (tournamentEnd.toDateString() === today.toDateString() || tournamentEnd.toDateString() === yesterday.toDateString()) {
    return true;
  }

  // no updates before march or after mid-april (2-*, 3-13)
  if (month < 2 || month > 3 || (month === 3 && dayOfMonth > 13)) {
    return false;
  }

  // allow during first four games (Tuesday and Wednesday after Selection Sunday, 8pm-2am Eastern)
  if (isFirstFourGameTime()) {
    return true;
  }

  // only look for updates thursday-sunday (4, 5, 6, 0)
  if (dayOfWeek > 1 && dayOfWeek < 4) {
    return false;
  }

  return true;
}

function getFirstFourDates(year) {
  const selectionSunday = getSelectionSunday(year);
  const ssYear = selectionSunday.getFullYear();
  const ssMonth = selectionSunday.getMonth();
  const ssDate = selectionSunday.getDate();
  const tuesday = new Date(Date.UTC(ssYear, ssMonth, ssDate + 2));
  const wednesday = new Date(Date.UTC(ssYear, ssMonth, ssDate + 3));
  return [tuesday, wednesday];
}

function isFirstFourGameTime() {
  // First four games are on Tuesday and Wednesday after Selection Sunday.
  // Games are expected 8pm-2am Eastern; March is EDT (UTC-4) since DST
  // starts the second Sunday of March, which is always on or before Selection Sunday.
  const now = new Date();
  const edtOffsetMs = 4 * 60 * 60 * 1000;
  const easternNow = new Date(now.getTime() - edtOffsetMs);
  const easternHour = easternNow.getUTCHours();

  if (easternHour >= 20 || easternHour < 2) {
    // Games from 0:00-1:59 ET belong to the previous evening's game date
    const gameDate = new Date(easternNow);
    if (easternHour < 2) {
      gameDate.setUTCDate(gameDate.getUTCDate() - 1);
    }
    const year = gameDate.getUTCFullYear();
    const firstFourDates = getFirstFourDates(year);
    return firstFourDates.some(d => {
      return d.getUTCFullYear() === gameDate.getUTCFullYear() &&
        d.getUTCMonth() === gameDate.getUTCMonth() &&
        d.getUTCDate() === gameDate.getUTCDate();
    });
  }

  return false;
}

function getSelectionSunday(year) {
  const date = getTournamentStart(year);
  date.setDate(date.getDate() - 4);
  return date;
}

function getTournamentStart(year) {
  const date = new Date(year, 2, 1);
  const add = ((4 - date.getDay() + 7) % 7) + 2 * 7;
  date.setDate(1 + add);
  return date;
}

function getTournamentEnd(year) {
  const date = getSelectionSunday(year);
  date.setDate(date.getDate() + 22);
  return date;
}

module.exports.getFirstFourDates = getFirstFourDates;
module.exports.isFirstFourGameTime = isFirstFourGameTime;
module.exports.shouldCheckNow = shouldCheckNow;
