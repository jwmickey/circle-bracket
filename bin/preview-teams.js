const path = require('path');
const fs = require('fs/promises');

const TEAMS_JSON_FILE = path.join(__dirname, "../src/data/teams.json");

async function getTeams() {
    const raw = await fs.readFile(TEAMS_JSON_FILE);
    return JSON.parse(raw.toString());
}

function renderTeamDiv(team) {
    const bg = team.logo.background || '#fff';
    return `
        <div style="flex:1;border:1px solid #eee;padding:20px;margin:19px;text-align:center;background-color:${bg}">
            <h3 style="background:#fff;padding:5px;border-radius:4px;">${team.name}</h3>
            <img style="max-width: 200px;" src="../src/${team.logo.url}" alt="${team.name}" />
        </div>
    `;
}

async function renderPage() {
    const teams = await getTeams();
    let html = '<html lang="en-us"><body><div style="display:flex;flex-flow:row wrap">';
    Object.values(teams).forEach((team) => {
        html += renderTeamDiv(team);
    })
    html += '</div></body></html>';
    await fs.writeFile(path.resolve( 'dist', 'teams.html'), html);
}

renderPage().catch(console.error);