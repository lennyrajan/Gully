/**
 * Cricket-specific constants and data
 * Player roles, batting styles, bowling styles based on ESPN Cricinfo standards
 */

export const PLAYER_ROLES = {
    BATSMAN: 'batsman',
    BOWLER: 'bowler',
    ALL_ROUNDER: 'all-rounder',
    WICKETKEEPER: 'wicketkeeper'
};

export const PLAYER_ROLE_OPTIONS = [
    { value: 'batsman', label: 'Batsman' },
    { value: 'bowler', label: 'Bowler' },
    { value: 'all-rounder', label: 'All-Rounder' },
    { value: 'wicketkeeper', label: 'Wicketkeeper' }
];

export const BATTING_STYLES = {
    RIGHT_HAND: 'right-hand',
    LEFT_HAND: 'left-hand'
};

export const BATTING_STYLE_OPTIONS = [
    { value: 'right-hand', label: 'Right-hand bat' },
    { value: 'left-hand', label: 'Left-hand bat' }
];

export const BOWLING_STYLES = {
    // Pace
    RIGHT_ARM_FAST: 'right-arm-fast',
    LEFT_ARM_FAST: 'left-arm-fast',
    RIGHT_ARM_MEDIUM: 'right-arm-medium',
    LEFT_ARM_MEDIUM: 'left-arm-medium',

    // Spin
    RIGHT_ARM_OFF_BREAK: 'right-arm-off-break',
    LEFT_ARM_ORTHODOX: 'left-arm-orthodox',
    RIGHT_ARM_LEG_BREAK: 'right-arm-leg-break',
    LEFT_ARM_CHINAMAN: 'left-arm-chinaman'
};

export const BOWLING_STYLE_OPTIONS = [
    { value: null, label: 'None (Batsman only)' },
    { value: 'right-arm-fast', label: 'Right-arm fast' },
    { value: 'left-arm-fast', label: 'Left-arm fast' },
    { value: 'right-arm-medium', label: 'Right-arm medium' },
    { value: 'left-arm-medium', label: 'Left-arm medium' },
    { value: 'right-arm-off-break', label: 'Right-arm off-break (Off-spin)' },
    { value: 'left-arm-orthodox', label: 'Left-arm orthodox (Left-arm spin)' },
    { value: 'right-arm-leg-break', label: 'Right-arm leg-break (Leg-spin)' },
    { value: 'left-arm-chinaman', label: 'Left-arm chinaman (Left-arm wrist spin)' }
];

export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
];

/**
 * Get display label for player role
 * @param {string} role - The role value
 * @returns {string} - Display label
 */
export function getPlayerRoleLabel(role) {
    const option = PLAYER_ROLE_OPTIONS.find(opt => opt.value === role);
    return option?.label || role || 'Not specified';
}

/**
 * Get display label for batting style
 * @param {string} style - The batting style value
 * @returns {string} - Display label
 */
export function getBattingStyleLabel(style) {
    const option = BATTING_STYLE_OPTIONS.find(opt => opt.value === style);
    return option?.label || style || 'Not specified';
}

/**
 * Get display label for bowling style
 * @param {string} style - The bowling style value
 * @returns {string} - Display label
 */
export function getBowlingStyleLabel(style) {
    if (!style) return 'None';
    const option = BOWLING_STYLE_OPTIONS.find(opt => opt.value === style);
    return option?.label || style;
}
