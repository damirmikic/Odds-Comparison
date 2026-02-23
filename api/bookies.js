/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BOOKIES — configuration array for the 4 supported bookmakers.
   Alias map getters reference globals from aliases.js (regular script).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { CONFIG } from '../config.js';
import { normTeam, normLeague } from '../utils.js';
import {
  parseMatches,
  isMaxbetBonus,
  parseSoccerbetMatches,
  parseCloudbetMatches,
} from './parsers.js';

export const BOOKIES = [
  {
    key: 'merkur', label: 'MRK', cls: 'm',
    url: 'https://www.merkurxtip.rs/restapi/offer/en/init',
    parse: data => parseMatches(data),
    getTeamAliasMap:   () => new Map(),
    getLeagueAliasMap: () => new Map(),
    rawLeagueAliases:  () => [],
  },
  {
    key: 'maxbet', label: 'MAX', cls: 'b',
    url: 'https://www.maxbet.rs/restapi/offer/en/init',
    parse: data => parseMatches(data).filter(m => !isMaxbetBonus(m)),
    getTeamAliasMap:   () => buildTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildLeagueAliasMap(normLeague),
    rawLeagueAliases:  () => getLeagueAliases(),
  },
  {
    key: 'soccerbet', label: 'SBT', cls: 's',
    url: 'https://www.soccerbet.rs/restapi/offer/en/init',
    parse: data => parseSoccerbetMatches(data),
    getTeamAliasMap:   () => buildSoccerbetTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildSoccerbetLeagueAliasMap(normLeague),
    rawLeagueAliases:  () => getSoccerbetLeagueAliases(),
    getCrossAliasMaps: () => ({
      maxbet: { team: buildMaxbetSbtTeamAliasMap(normTeam), league: buildMaxbetSbtLeagueAliasMap(normLeague) },
    }),
  },
  {
    key: 'cloudbet', label: 'CLB', cls: 'cl',
    url: () => {
      const now = Math.floor(Date.now() / 1000);
      const to = now + CONFIG.CLOUDBET_LOOKAHEAD_DAYS * 24 * 3600;
      return `https://sports-api.cloudbet.com/pub/v2/odds/events?sport=soccer&live=false&from=${now}&to=${to}&markets=soccer.match_odds&markets=soccer.total_goals&players=false&limit=${CONFIG.CLOUDBET_LIMIT}`;
    },
    headers: { 'X-API-Key': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IkhKcDkyNnF3ZXBjNnF3LU9rMk4zV05pXzBrRFd6cEdwTzAxNlRJUjdRWDAiLCJ0eXAiOiJKV1QifQ.eyJhY2Nlc3NfdGllciI6InRyYWRpbmciLCJleHAiOjIwNjE1Mzc1MDIsImlhdCI6MTc0NjE3NzUwMiwianRpIjoiNTU1ODk0NjgtZjJhZi00ZGQ3LWE3MTQtZjNiNjgyMWU4OGRkIiwic3ViIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3IiwidGVuYW50IjoiY2xvdWRiZXQiLCJ1dWlkIjoiOGYwYTk5YTEtNTFhZi00YzJlLWFlNDUtY2MxNjgwNDVjZTc3In0.BW_nXSwTkxTI7C-1UzgxWLnNzo9Bo1Ed8hI9RfVLnrJa6sfsMyvQ1NrtT5t6i_emwhkRHU1hY-9i6c2c5AI4fc2mRLSNBujvrfbVHX67uB58E8TeSOZUBRi0eqfLBL7sYl1JNPZzhFkDBCBNFJZJpn40FIjIrtIiPd-G5ClaaSMRWrFUDiwA1NmyxHSfkfRpeRSnfk15qck7zSIeNeITzPbD7kZGDIeStmcHuiHfcQX3NaHaI0gyw60wmDgan83NpYQYRVLQ9C4icbNhel4n5H5FGFAxQS8IcvynqV8f-vz2t4BRGuYXBU8uhdYKgezhyQrSvX6NpwNPBJC8CWo2fA' },
    parse: data => parseCloudbetMatches(data),
    getTeamAliasMap:   () => buildCloudbetTeamAliasMap(normTeam),
    getLeagueAliasMap: () => buildCloudbetLeagueAliasMap(normLeague),
    rawLeagueAliases:  () => getCloudbetLeagueAliases(),
    getCrossAliasMaps: () => ({
      maxbet:    { team: buildMaxbetClbTeamAliasMap(normTeam),  league: buildMaxbetClbLeagueAliasMap(normLeague) },
      soccerbet: { team: buildSbtClbTeamAliasMap(normTeam),     league: buildSbtClbLeagueAliasMap(normLeague) },
    }),
  },
];
