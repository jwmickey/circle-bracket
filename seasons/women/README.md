# Women's Tournament Bracket Data

This directory contains bracket data for the NCAA Women's Basketball Tournament.

Files are named `bracket-{year}.json` and follow the same format as the men's brackets
in the parent directory, with an additional `"gender": "women"` field.

The NCAA Women's Basketball Tournament started in 1982. To fetch bracket data for a given year
(2019 and later), run:

```
node bin/fetch-ncaa-bracket.js <year> true false women
```
