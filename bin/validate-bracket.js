/**
 * Validates that a bracket is complete and ready to be committed to the repo
 */

const fs = require('fs/promises');
const path = require('path');

const year = process.argv[2];

async function loadBracket(year) {
    const bracketPath = path.resolve( 'seasons', `bracket-${year}.json`);
    const raw = await fs.readFile(bracketPath, 'utf8');
    return JSON.parse(raw.toString());
}

function validateBracket(bracket) {
    expect(bracket.year === parseInt(year), 'bracket year matches')
    expect(bracket.games.length > 0, 'there is at least 1 game')
    bracket.games.forEach(game => {
        expect(game.isComplete && game.home.winner || game.away.winner,
            `Round ${game.round}: ${game.home.name} vs ${game.away.name} is complete`)
    })
}

function expect(assertion, errorString) {
    if (!assertion) {
        isValid = false;
    }
    console.log(assertion ? '✔' : '❌', errorString);
}

let isValid = true;
async function run() {
    const bracket = await loadBracket(year);
    validateBracket(bracket);
    if (!isValid) {
        console.error('❌ Invalid bracket!');
        process.exit(1);
    } else {
        console.log('✔ Valid bracket!');
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
})