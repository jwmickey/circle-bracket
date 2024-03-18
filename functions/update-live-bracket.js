// these are prefixed with MY_ because they are reserved in netlify
const ACCESS_KEY_ID = process.env.MY_AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.MY_AWS_SECRET_ACCESS_KEY;
const BUCKET = 'circlebracket';
const OBJECT_KEY = 'live-bracket.json';
const REFRESH_LIMIT = 1800;  // how long to wait between checks in seconds

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

  // check the last modified date on the stored file to make sure we don't try getting this too often
  try {
    const meta = await s3.headObject({Bucket: BUCKET, Key: OBJECT_KEY}).promise();
    const elapsed = Math.floor((now.getTime() - meta.LastModified.getTime()) / 1000);
    if (elapsed < REFRESH_LIMIT) {
      const mins = Math.ceil((REFRESH_LIMIT - elapsed) / 60);
      const message = `Waiting ${mins} minutes before next refresh`;
      console.log(message);
      return {
        statusCode: 200,
        body: JSON.stringify({message})
      };
    }
  } catch (err) {
    console.warn(err.message);
    // can't get meta info, keep going
  }

  // update the bracket
  try {
    const year = new Date().getFullYear();
    const bracket = await fetchBracket(year, false);
    const bracketJson = JSON.stringify(bracket, null, "\t");
    const objectParams = {
      Bucket: BUCKET,
      Key: OBJECT_KEY,
      Body: bracketJson
    };

    const upload = await s3.putObject(objectParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        upload,
        bracket,
        lastModified: now,
        message: "OK"
      })
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};

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
  const date = new Date(year, 2, 1);
  const add = ((4 - date.getDay() + 7) % 7) + 2 * 7;
  date.setDate(1 + add);
  return date;
}
