/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIG — pure constants, no dependencies
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export const CONFIG = {
  // Merge time windows (mergeMatches — Merkur vs MaxBet)
  MERGE_TIME_WIN:    45 * 60 * 1000,  // ±45 min for exact/fuzzy passes
  MERGE_TIME_STRICT: 30 * 60 * 1000,  // ±30 min for partial pass

  // Merge time windows (mergeBookmaker — when 2+ bookies already agree, use wider window)
  MERGE_TIME_WIN_CONSENSUS:    120 * 60 * 1000,  // ±120 min (consensus)
  MERGE_TIME_STRICT_CONSENSUS:  60 * 60 * 1000,  // ±60 min (consensus partial)

  // Timezone offset detection
  TIMEZONE_SAMPLE_SIZE: 20,           // max samples for median computation
  TIMEZONE_TOLERANCE:   5 * 60 * 1000, // within 5 min of a whole hour = correction

  // Kickoff time consensus (resolveKickOffTime)
  CONSENSUS_WIN: 5 * 60 * 1000,       // 5-minute tolerance for "same" time

  // Fuzzy team matching
  JACCARD_THRESHOLD: 0.5,             // minimum Jaccard score for a fuzzy match

  // Value bet detection
  VALUE_MIN_EV: 0.01,                 // minimum expected value edge (1%)

  // Drop detection thresholds
  DROP_MIN_PCT:     3,                // ignore drops below 3%
  DROP_STRONG_PCT:  7,                // ≥7% = strong
  DROP_EXTREME_PCT: 15,               // ≥15% = extreme

  // Stale data cleanup
  STALE_DATA_HOURS: 3,                // delete odds_drops older than 3 hours

  // Cloudbet API
  CLOUDBET_LOOKAHEAD_DAYS: 7,         // days ahead to fetch
  CLOUDBET_LIMIT: 2000,               // max events per request

  // Auto-refresh
  AUTO_REFRESH_SECS: 60,             // seconds between automatic data refreshes

  // Odds history for mini-charts
  ODDS_HISTORY_SIZE: 10,             // rolling window size (snapshots)
};

export const FLAGS = {
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Spain': '🇪🇸', 'Germany': '🇩🇪', 'Italy': '🇮🇹', 'France': '🇫🇷',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Turkey': '🇹🇷',
  'Russia': '🇷🇺', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'USA': '🇺🇸',
  'Mexico': '🇲🇽', 'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Poland': '🇵🇱',
  'Czech Republic': '🇨🇿', 'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Romania': '🇷🇴',
  'Ukraine': '🇺🇦', 'Greece': '🇬🇷', 'Denmark': '🇩🇰', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
  'China': '🇨🇳', 'Australia': '🇦🇺', 'International': '🌐', 'UEFA': '🇪🇺',
  'CAF': '🌍', 'Africa': '🌍', 'Asia': '🌏', 'South America': '🌎',
  'North America': '🌎', 'CONMEBOL': '🌎', 'Hungary': '🇭🇺', 'Slovakia': '🇸🇰',
  'Bulgaria': '🇧🇬', 'Israel': '🇮🇱', 'Slovenia': '🇸🇮', 'Bosnia': '🇧🇦',
  'Montenegro': '🇲🇪', 'Albania': '🇦🇱', 'Kosovo': '🇽🇰', 'Ireland': '🇮🇪',
  'Cyprus': '🇨🇾', 'Malta': '🇲🇹', 'Morocco': '🇲🇦', 'Egypt': '🇪🇬',
  'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Colombia': '🇨🇴', 'Chile': '🇨🇱',
  'Uruguay': '🇺🇾', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪',
  'Iran': '🇮🇷', 'India': '🇮🇳', 'Belarus': '🇧🇾', 'Lithuania': '🇱🇹',
  'Latvia': '🇱🇻', 'Estonia': '🇪🇪', 'Georgia': '🇬🇪', 'Armenia': '🇦🇲',
  'Azerbaijan': '🇦🇿', 'Kazakhstan': '🇰🇿', 'Iceland': '🇮🇸', 'Luxembourg': '🇱🇺',
  'Andorra': '🇦🇩', 'Uganda': '🇺🇬', 'Cameroon': '🇨🇲', 'Senegal': '🇸🇳',
  'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'South Africa': '🇿🇦', 'Kenya': '🇰🇪',
  'Tanzania': '🇹🇿', 'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼', 'Angola': '🇦🇴',
  'Mozambique': '🇲🇿', 'Congo': '🇨🇬', 'Ethiopia': '🇪🇹', 'Libya': '🇱🇾',
  'Sudan': '🇸🇩', 'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Guatemala': '🇬🇹',
  'Panama': '🇵🇦', 'El Salvador': '🇸🇻', 'Nicaragua': '🇳🇮', 'Other': '🏳',
};

export const ABBREV = {
  '\batl\b': 'atletico',
  '\bind\b': 'independiente',
  '\bsp\b': 'sporting',
  '\bfc\b': '',
  '\bac\b': '',
  '\bsc\b': '',
  '\bcd\b': '',
  '\bcf\b': '',
  '\bfk\b': '',
  '\bsk\b': '',
  '\bnk\b': '',
  '\bif\b': '',
  '\bbk\b': '',
  '\bik\b': '',
  '\bgif\b': '',
  '\bais\b': '',
  '\bde\b': '',
  '\bdel\b': '',
  '\bla\b': '',
  '\blas\b': '',
  '\blos\b': '',
  '\bel\b': '',
  '\breal\b': 'real',
  '\bsj\b': 'san jose',
  '\bba\b': '',
  '\bca\b': '',
  '\bclub\b': '',
  '\bsport\b': '',
  '\bdeportivo\b': 'dep',
  '\bdef\b': 'defensa',
};
