const aws = require("aws-sdk");
const fetchBracket = require("./fetchers/ncaa");

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
export async function handler(event, context) {
  if (false) { // !shouldCheckNow()) {
    return {
      statusCode: 200,
      body: "No updates are expected to be available at this time"
    }
  }

  try {
    const year = new Date().getFullYear();
    const bracket = await fetchBracket(year, false);
    const bracketJson = JSON.stringify(bracket, null, "\t");
    const objectParams = {
      Bucket: 'circlebracket',
      Key: 'live-bracket.json',
      Body: bracketJson
    };
    const upload = await new aws.S3({apiVersion: "2006-03-01"}).putObject(objectParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: upload
      })
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
}

function shouldCheckNow() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay();

  // allow on selection sunday
  if (getSelectionSunday(year).toDateString() === today.toDateString()) {
    return true;
  }

  // no updates before march or after mid-april (2-*, 3-13)
  if (month < 2 || month > 3 || (month === 3 && dayOfMonth > 13)) {
    return false;
  }

  // only look for updates thursday-sunday (4, 5, 6, 0)
  if (dayOfWeek > 1 && dayOfWeek < 4) {
    return false;
  }

  return true;
}

function getSelectionSunday(year) {
  const date = getTournamentStart(year);
  date.setDate(date.getDate() - 4);
  return date;
}

function getTournamentStart(year) {
  let date = new Date(year, 2, 1),
      add = ((4 - date.getDay() + 7) % 7) + 2 * 7;
  date.setDate(1 + add);
  return date;
}