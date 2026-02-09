/**
 * Permissions and Role-Based Access Control
 * Defines permissions for different user roles in the Gully app
 */

export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TEAM_ADMIN: 'team_admin',
    LEAGUE_ADMIN: 'league_admin',
    ACCOUNTS_OFFICER: 'accounts_officer',
    PLAYER: 'player',
    GUEST: 'guest'
};

export const PERMISSIONS = {
    // Team Management
    CREATE_TEAM: 'CREATE_TEAM',
    MANAGE_TEAM: 'MANAGE_TEAM',
    APPROVE_PLAYERS: 'APPROVE_PLAYERS',
    ADD_GUEST_PLAYERS: 'ADD_GUEST_PLAYERS',
    REMOVE_PLAYERS: 'REMOVE_PLAYERS',

    // Match & Scoring
    CREATE_MATCH: 'CREATE_MATCH',
    SCORE_MATCH: 'SCORE_MATCH',
    VIEW_MATCHES: 'VIEW_MATCHES',

    // Social & Community
    CREATE_POST: 'CREATE_POST',
    DELETE_POST: 'DELETE_POST',

    // Financial Management
    MANAGE_FEES: 'MANAGE_FEES',
    APPROVE_EXPENSES: 'APPROVE_EXPENSES',
    VIEW_LEDGER: 'VIEW_LEDGER',
    SUBMIT_EXPENSE: 'SUBMIT_EXPENSE',
    CREATE_FINE: 'CREATE_FINE',
    PAY_FINE: 'PAY_FINE',

    // Schedule & Games
    CREATE_GAME: 'CREATE_GAME',
    EDIT_GAME: 'EDIT_GAME',

    // Profile Management
    EDIT_OWN_PROFILE: 'EDIT_OWN_PROFILE',
    VIEW_PROFILES: 'VIEW_PROFILES',
    EDIT_ANY_PROFILE: 'EDIT_ANY_PROFILE',

    // Availability
    UPDATE_AVAILABILITY: 'UPDATE_AVAILABILITY',
    VIEW_AVAILABILITY: 'VIEW_AVAILABILITY',

    // Tournament & League Management
    CREATE_LEAGUE: 'CREATE_LEAGUE',
    MANAGE_LEAGUE: 'MANAGE_LEAGUE',
    VIEW_LEAGUES: 'VIEW_LEAGUES',
    JOIN_LEAGUE: 'JOIN_LEAGUE',
    GENERATE_SCHEDULE: 'GENERATE_SCHEDULE'
};

const ROLE_PERMISSIONS = {
    [USER_ROLES.SUPER_ADMIN]: [
        PERMISSIONS.CREATE_TEAM,
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.APPROVE_PLAYERS,
        PERMISSIONS.ADD_GUEST_PLAYERS,
        PERMISSIONS.REMOVE_PLAYERS,
        PERMISSIONS.CREATE_MATCH,
        PERMISSIONS.SCORE_MATCH,
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.DELETE_POST,
        PERMISSIONS.CREATE_FINE,
        PERMISSIONS.PAY_FINE,
        PERMISSIONS.CREATE_GAME,
        PERMISSIONS.EDIT_GAME,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.EDIT_ANY_PROFILE,
        PERMISSIONS.UPDATE_AVAILABILITY,
        PERMISSIONS.VIEW_AVAILABILITY,
        PERMISSIONS.CREATE_LEAGUE,
        PERMISSIONS.MANAGE_LEAGUE,
        PERMISSIONS.VIEW_LEAGUES,
        PERMISSIONS.JOIN_LEAGUE,
        PERMISSIONS.GENERATE_SCHEDULE
    ],
    [USER_ROLES.TEAM_ADMIN]: [
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.APPROVE_PLAYERS,
        PERMISSIONS.ADD_GUEST_PLAYERS,
        PERMISSIONS.REMOVE_PLAYERS,
        PERMISSIONS.CREATE_MATCH,
        PERMISSIONS.SCORE_MATCH,
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.MANAGE_FEES,
        PERMISSIONS.APPROVE_EXPENSES,
        PERMISSIONS.VIEW_LEDGER,
        PERMISSIONS.SUBMIT_EXPENSE,
        PERMISSIONS.CREATE_FINE,
        PERMISSIONS.CREATE_GAME,
        PERMISSIONS.EDIT_GAME,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.UPDATE_AVAILABILITY,
        PERMISSIONS.VIEW_AVAILABILITY,
        PERMISSIONS.VIEW_LEAGUES,
        PERMISSIONS.JOIN_LEAGUE
    ],
    [USER_ROLES.LEAGUE_ADMIN]: [
        PERMISSIONS.VIEW_LEAGUES,
        PERMISSIONS.CREATE_MATCH,
        PERMISSIONS.SCORE_MATCH,
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.UPDATE_AVAILABILITY,
        PERMISSIONS.VIEW_AVAILABILITY
    ],
    [USER_ROLES.ACCOUNTS_OFFICER]: [
        PERMISSIONS.CREATE_MATCH,
        PERMISSIONS.SCORE_MATCH,
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.MANAGE_FEES,
        PERMISSIONS.APPROVE_EXPENSES,
        PERMISSIONS.VIEW_LEDGER,
        PERMISSIONS.SUBMIT_EXPENSE,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.UPDATE_AVAILABILITY,
        PERMISSIONS.VIEW_AVAILABILITY
    ],
    [USER_ROLES.PLAYER]: [
        PERMISSIONS.CREATE_TEAM,
        PERMISSIONS.CREATE_MATCH,
        PERMISSIONS.SCORE_MATCH,
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.CREATE_POST,
        PERMISSIONS.VIEW_LEDGER,
        PERMISSIONS.SUBMIT_EXPENSE,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.UPDATE_AVAILABILITY,
        PERMISSIONS.VIEW_AVAILABILITY,
        PERMISSIONS.VIEW_LEAGUES,
        PERMISSIONS.JOIN_LEAGUE
    ],
    [USER_ROLES.GUEST]: [
        PERMISSIONS.VIEW_MATCHES,
        PERMISSIONS.EDIT_OWN_PROFILE,
        PERMISSIONS.VIEW_PROFILES,
        PERMISSIONS.VIEW_AVAILABILITY
    ]
};

/**
 * Check if a user role has a specific permission
 * @param {string} userRole - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the user has the permission
 */
export function hasPermission(userRole, permission) {
    if (!userRole || !permission) return false;
    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

/**
 * Require a specific permission, throw error if not authorized
 * @param {string} userRole - The user's role
 * @param {string} permission - The required permission
 * @throws {Error} - If user doesn't have permission
 */
export function requirePermission(userRole, permission) {
    if (!hasPermission(userRole, permission)) {
        throw new Error(`Insufficient permissions: ${permission} required`);
    }
}

/**
 * Check if user can manage a specific team
 * @param {object} userProfile - The user's profile
 * @param {string} teamId - The team ID to check
 * @param {object} teamData - The team data (optional, for optimization)
 * @returns {boolean} - Whether user can manage the team
 */
export function canManageTeam(userProfile, teamId, teamData = null) {
    if (!userProfile || !teamId) return false;

    // Super admins can manage any team
    if (userProfile.role === USER_ROLES.SUPER_ADMIN) return true;

    // Team admins can only manage teams they're admin of
    if (userProfile.role === USER_ROLES.TEAM_ADMIN) {
        if (teamData) {
            return teamData.adminIds?.includes(userProfile.uid) || false;
        }
        // If no team data provided, assume caller will check separately
        return true;
    }

    return false;
}

/**
 * Get all permissions for a role
 * @param {string} userRole - The user's role
 * @returns {string[]} - Array of permission strings
 */
export function getRolePermissions(userRole) {
    return ROLE_PERMISSIONS[userRole] || [];
}
