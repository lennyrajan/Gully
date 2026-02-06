/**
 * Duckworth-Lewis-Stern (DLS) Logic Utility
 * Simplified version based on the Standard Edition resource tables.
 */

// Resource percentages based on overs remaining and wickets lost
// Table format: { oversRemaining: { wicketsLost: percentage } }
const RESOURCE_TABLE_T20 = {
    20: [100, 93.4, 85.1, 74.9, 62.7, 49.0, 34.9, 22.0, 11.9, 4.7, 0],
    15: [82.2, 77.8, 72.1, 64.7, 55.4, 44.6, 32.7, 21.1, 11.7, 4.7, 0],
    10: [61.1, 58.6, 55.1, 50.3, 44.0, 36.4, 27.8, 18.8, 10.8, 4.6, 0],
    5: [34.7, 33.7, 32.3, 30.3, 27.5, 23.9, 19.3, 14.0, 8.8, 4.1, 0],
    2: [15.4, 15.1, 14.7, 14.1, 13.3, 12.1, 10.5, 8.3, 5.7, 3.0, 0],
    1: [8.1, 8.0, 7.8, 7.6, 7.3, 6.8, 6.0, 4.9, 3.5, 2.0, 0],
    0: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

/**
 * Interpolate resource percentage for a given overs and wickets
 * @param {number} oversRemaining 
 * @param {number} wicketsLost 
 * @returns {number} Resource percentage
 */
export const getResourcePercentage = (oversRemaining, wicketsLost) => {
    const table = RESOURCE_TABLE_T20; // Default to T20 for now
    const keys = Object.keys(table).map(Number).sort((a, b) => b - a);

    // Find the closest keys for interpolation
    let upperKey = keys[0];
    let lowerKey = keys[keys.length - 1];

    for (let i = 0; i < keys.length; i++) {
        if (keys[i] >= oversRemaining) upperKey = keys[i];
        if (keys[i] <= oversRemaining) {
            lowerKey = keys[i];
            break;
        }
    }

    if (upperKey === lowerKey) return table[upperKey][wicketsLost];

    const upperVal = table[upperKey][wicketsLost];
    const lowerVal = table[lowerKey][wicketsLost];

    // Linear interpolation
    const ratio = (oversRemaining - lowerKey) / (upperKey - lowerKey);
    return lowerVal + ratio * (upperVal - lowerVal);
};

/**
 * Calculate DLS Par Score (Team 2 score and wickets)
 * @param {number} team1Score Total score by Team 1
 * @param {number} team1Resources % resources used by Team 1
 * @param {number} team2Resources % resources available to Team 2
 * @returns {number} Par Score
 */
export const calculateParScore = (team1Score, team1Resources, team2Resources) => {
    if (team2Resources >= team1Resources) {
        // If Team 2 has more resources (unlikely in rain scenarios but possible if Team 1 was reduced)
        // Rev target = S + G * (R2 - R1) / 100 where G is avg score (approx 150 for T20)
        const G = 150;
        return Math.floor(team1Score + G * (team2Resources - team1Resources) / 100);
    } else {
        // Standard rain reduction
        return Math.floor(team1Score * (team2Resources / team1Resources));
    }
};

/**
 * Calculate Revised Target
 */
export const calculateRevisedTarget = (team1Score, team1Resources, team2Resources) => {
    return calculateParScore(team1Score, team1Resources, team2Resources) + 1;
};
