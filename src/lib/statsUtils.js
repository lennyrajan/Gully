/**
 * Cricket Statistics Utility Functions
 * Provides calculations and aggregations for player and team analytics
 */

/**
 * Calculate batting average (runs / dismissals)
 * @param {number} runs - Total runs scored
 * @param {number} innings - Total innings played
 * @param {number} notOuts - Number of not out innings
 * @returns {string} - Batting average formatted to 2 decimal places
 */
export function calculateBattingAverage(runs, innings, notOuts = 0) {
    const dismissals = innings - notOuts;
    if (dismissals === 0) return runs > 0 ? '∞' : '0.00';
    return (runs / dismissals).toFixed(2);
}

/**
 * Calculate bowling average (runs conceded / wickets)
 * @param {number} runsConceded - Total runs conceded
 * @param {number} wickets - Total wickets taken
 * @returns {string} - Bowling average formatted to 2 decimal places
 */
export function calculateBowlingAverage(runsConceded, wickets) {
    if (wickets === 0) return '-';
    return (runsConceded / wickets).toFixed(2);
}

/**
 * Calculate batting strike rate (runs / balls * 100)
 * @param {number} runs - Total runs scored
 * @param {number} balls - Total balls faced
 * @returns {string} - Strike rate formatted to 2 decimal places
 */
export function calculateStrikeRate(runs, balls) {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 100).toFixed(2);
}

/**
 * Calculate bowling economy rate (runs / overs)
 * @param {number} runs - Runs conceded
 * @param {number} overs - Overs bowled (can include fractions like 3.4)
 * @returns {string} - Economy rate formatted to 2 decimal places
 */
export function calculateEconomyRate(runs, overs) {
    if (overs === 0) return '0.00';
    // Convert overs to balls then back to decimal overs for calculation
    const oversPart = Math.floor(overs);
    const ballsPart = (overs % 1) * 10; // e.g., 3.4 -> 4 balls
    const totalBalls = oversPart * 6 + ballsPart;
    const decimalOvers = totalBalls / 6;
    if (decimalOvers === 0) return '0.00';
    return (runs / decimalOvers).toFixed(2);
}

/**
 * Aggregate player stats from match innings data
 * @param {Array} matches - Array of match objects with innings data
 * @param {string} playerName - Name of the player to aggregate stats for
 * @returns {object} - Aggregated batting and bowling stats
 */
export function aggregatePlayerStats(matches, playerName) {
    const stats = {
        batting: {
            matches: 0,
            innings: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            notOuts: 0,
            highScore: 0,
            fifties: 0,
            hundreds: 0
        },
        bowling: {
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            bestFigures: { wickets: 0, runs: 999 }
        },
        recentMatches: []
    };

    matches.forEach(match => {
        let playerBatted = false;
        let playerBowled = false;
        let matchBattingStats = null;
        let matchBowlingStats = null;

        // Check both innings formats
        const inningsArray = match.inningsHistory || [match];

        inningsArray.forEach(innings => {
            // Check batting stats
            if (innings.scorecard?.batting?.[playerName]) {
                const batting = innings.scorecard.batting[playerName];
                playerBatted = true;
                stats.batting.innings++;
                stats.batting.runs += batting.runs || 0;
                stats.batting.balls += batting.balls || 0;
                stats.batting.fours += batting.fours || 0;
                stats.batting.sixes += batting.sixes || 0;

                if (!batting.dismissal || batting.dismissal === 'not out') {
                    stats.batting.notOuts++;
                }

                if ((batting.runs || 0) > stats.batting.highScore) {
                    stats.batting.highScore = batting.runs;
                }

                if (batting.runs >= 100) stats.batting.hundreds++;
                else if (batting.runs >= 50) stats.batting.fifties++;

                matchBattingStats = batting;
            }

            // Check bowling stats
            if (innings.scorecard?.bowling?.[playerName]) {
                const bowling = innings.scorecard.bowling[playerName];
                playerBowled = true;
                stats.bowling.overs += parseFloat(bowling.overs || 0);
                stats.bowling.maidens += bowling.maidens || 0;
                stats.bowling.runs += bowling.runs || 0;
                stats.bowling.wickets += bowling.wickets || 0;

                // Track best bowling figures
                if ((bowling.wickets || 0) > stats.bowling.bestFigures.wickets ||
                    ((bowling.wickets || 0) === stats.bowling.bestFigures.wickets &&
                        (bowling.runs || 0) < stats.bowling.bestFigures.runs)) {
                    stats.bowling.bestFigures = {
                        wickets: bowling.wickets || 0,
                        runs: bowling.runs || 0
                    };
                }

                matchBowlingStats = bowling;
            }
        });

        if (playerBatted || playerBowled) {
            stats.batting.matches++;
            stats.recentMatches.push({
                date: match.date || match.createdAt,
                opponent: match.opponent || match.teams,
                batting: matchBattingStats,
                bowling: matchBowlingStats
            });
        }
    });

    // Keep only last 5 matches for recent matches
    stats.recentMatches = stats.recentMatches.slice(-5).reverse();

    return stats;
}

/**
 * Get top performers from a list of aggregated player stats
 * @param {Array} playerStatsList - Array of {playerName, stats} objects
 * @param {string} category - 'runs', 'wickets', 'average', 'strikeRate'
 * @param {number} limit - Number of top performers to return
 * @returns {Array} - Sorted array of top performers
 */
export function getTopPerformers(playerStatsList, category, limit = 5) {
    return playerStatsList
        .map(({ playerName, stats }) => {
            let value = 0;
            switch (category) {
                case 'runs':
                    value = stats.batting.runs;
                    break;
                case 'wickets':
                    value = stats.bowling.wickets;
                    break;
                case 'average':
                    const avg = calculateBattingAverage(
                        stats.batting.runs,
                        stats.batting.innings,
                        stats.batting.notOuts
                    );
                    value = avg === '∞' ? 999999 : parseFloat(avg);
                    break;
                case 'strikeRate':
                    value = parseFloat(calculateStrikeRate(stats.batting.runs, stats.batting.balls)) || 0;
                    break;
                default:
                    value = 0;
            }
            return { playerName, stats, value };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

/**
 * Calculate team statistics from matches
 * @param {Array} matches - Array of match objects
 * @param {string} teamId - Team ID to calculate stats for
 * @returns {object} - Team stats including wins, losses, ties
 */
export function calculateTeamStats(matches, teamId) {
    const stats = {
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        winPercentage: '0.00'
    };

    matches.forEach(match => {
        if (match.teamId === teamId || match.homeTeamId === teamId || match.awayTeamId === teamId) {
            stats.played++;

            if (match.result) {
                if (match.winnerId === teamId) {
                    stats.won++;
                } else if (match.result === 'tie') {
                    stats.tied++;
                } else if (match.result === 'no result') {
                    stats.noResult++;
                } else if (match.winnerId && match.winnerId !== teamId) {
                    stats.lost++;
                }
            }
        }
    });

    if (stats.played > 0) {
        stats.winPercentage = ((stats.won / stats.played) * 100).toFixed(2);
    }

    return stats;
}

/**
 * Format overs for display (e.g., 10.3 -> "10.3")
 * @param {number} overs - Overs value
 * @returns {string} - Formatted overs string
 */
export function formatOvers(overs) {
    const whole = Math.floor(overs);
    const balls = Math.round((overs % 1) * 10);
    if (balls >= 6) {
        return `${whole + 1}.0`;
    }
    return balls > 0 ? `${whole}.${balls}` : `${whole}.0`;
}

/**
 * Format best bowling figures
 * @param {object} figures - { wickets, runs }
 * @returns {string} - Formatted as "W/R" (e.g., "3/24")
 */
export function formatBestBowling(figures) {
    if (!figures || figures.wickets === 0) return '-';
    return `${figures.wickets}/${figures.runs}`;
}
