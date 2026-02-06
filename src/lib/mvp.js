/**
 * MVP Point System for Gully App
 * 
 * Batting:
 * - 1 pt per run
 * - 2 pts per boundary (4)
 * - 5 pts per six (6)
 * - 10 pts for reaching 25 runs
 * - 25 pts for reaching 50 runs
 * - 50 pts for reaching 100 runs
 * - -5 pts for a duck (0 runs, dismissed)
 * 
 * Bowling:
 * - 20 pts per wicket
 * - 10 pts per maiden over
 * - 25 pts for 3+ wickets
 * - 50 pts for 5+ wickets
 * - -1 pt for every wide/no-ball (extras conceded)
 * - 5 pts for economy < 6.0 (if at least 1 over bowled)
 * 
 * Fielding:
 * - 10 pts per catch
 * - 10 pts per stumping
 * - 15 pts per run out
 */

export const calculateMVPs = (scorecard) => {
    if (!scorecard || !scorecard.batting || !scorecard.bowling) return [];

    const playerPoints = {};

    // process batting
    Object.entries(scorecard.batting).forEach(([name, stats]) => {
        if (!playerPoints[name]) playerPoints[name] = 0;

        let points = 0;
        points += stats.runs;
        points += (stats.fours || 0) * 2;
        points += (stats.sixes || 0) * 5;

        if (stats.runs >= 100) points += 50;
        else if (stats.runs >= 50) points += 25;
        else if (stats.runs >= 25) points += 10;

        if (stats.runs === 0 && stats.dismissal) points -= 5;

        playerPoints[name] += points;
    });

    // process bowling
    Object.entries(scorecard.bowling).forEach(([name, stats]) => {
        if (!playerPoints[name]) playerPoints[name] = 0;

        let points = 0;
        points += stats.wickets * 20;
        points += (stats.maidens || 0) * 10;

        if (stats.wickets >= 5) points += 50;
        else if (stats.wickets >= 3) points += 25;

        // penalty for extras (wide/no-ball)
        // this is tricky as extras are often team-based in simple scorecards, 
        // but if we have bowler-specific extras, we'd use them here.
        // Assuming stats.wides and stats.noBalls exist if tracked per bowler.
        points -= (stats.wides || 0);
        points -= (stats.noBalls || 0);

        // economy bonus
        const overs = parseFloat(stats.overs || 0);
        if (overs >= 1.0) {
            const econ = stats.runs / overs;
            if (econ < 6.0) points += 5;
        }

        playerPoints[name] += points;
    });

    // process fielding (parsed from dismissal text)
    Object.values(scorecard.batting).forEach(({ dismissal }) => {
        if (!dismissal) return;

        // Catch: "c Fielder b Bowler" or "c & b Bowler"
        if (dismissal.startsWith('c ')) {
            const fielderMatch = dismissal.match(/^c (.*?) b /);
            if (fielderMatch && fielderMatch[1]) {
                const fielder = fielderMatch[1];
                if (!playerPoints[fielder]) playerPoints[fielder] = 0;
                playerPoints[fielder] += 10;
            } else if (dismissal.includes('c & b')) {
                const bowlerMatch = dismissal.match(/c & b (.*)/);
                if (bowlerMatch && bowlerMatch[1]) {
                    const bowler = bowlerMatch[1];
                    if (!playerPoints[bowler]) playerPoints[bowler] = 0;
                    playerPoints[bowler] += 10;
                }
            }
        }
        // Stumping: "st Keeper b Bowler"
        else if (dismissal.startsWith('st ')) {
            const keeperMatch = dismissal.match(/^st (.*?) b /);
            if (keeperMatch && keeperMatch[1]) {
                const keeper = keeperMatch[1];
                if (!playerPoints[keeper]) playerPoints[keeper] = 0;
                playerPoints[keeper] += 10;
            }
        }
        // Run Out: "run out (Fielder)" or "run out (Fielder1 / Fielder2)"
        else if (dismissal.startsWith('run out')) {
            const fielderPart = dismissal.match(/\((.*)\)/);
            if (fielderPart && fielderPart[1]) {
                const fielders = fielderPart[1].split(' / ');
                fielders.forEach(f => {
                    if (!playerPoints[f]) playerPoints[f] = 0;
                    playerPoints[f] += 15; // split points? No, user said 15 pts/run out.
                });
            }
        }
    });

    // return sorted list of players
    return Object.entries(playerPoints)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points);
};
