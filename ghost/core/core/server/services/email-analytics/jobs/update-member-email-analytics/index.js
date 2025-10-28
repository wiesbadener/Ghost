const queries = require('../../lib/queries');

/**
 * Updates email analytics for a specific member
 *
 * @param {Object} options - The options object
 * @param {string} options.memberId - The ID of the member to update analytics for
 * @returns {Promise<void>}
 */
module.exports = async function updateMemberEmailAnalytics({memberId}) {
    await queries.aggregateMemberStats(memberId);
};