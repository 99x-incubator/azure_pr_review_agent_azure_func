const fs = require('fs').promises;
const path = require('path');

/**
 * Analytics module for logging detailed PR review decisions and insights
 */
class AIDecisionAnalytics {
    constructor(logDirectory = 'analytics') {
        this.logDirectory = logDirectory;
    }

    /**
     * Log comprehensive PR analytics
     * @param {Object} prData - PR data
     * @param {Array} allComments - All generated comments
     * @param {Array} prioritizedComments - Selected prioritized comments
     * @param {Object} riskAnalysis - Risk analysis results
     * @param {Object} categorization - Comment categorization
     * @param {Object} diffInsights - Diff analysis insights
     * @param {Object} config - Configuration
     */
    async logPRAnalytics(prData, allComments, prioritizedComments, riskAnalysis, categorization, diffInsights, config) {
        const timestamp = new Date().toISOString();
        const prId = prData.pullRequestId;
        const repoName = prData.repository?.name || 'unknown';

        const analyticsData = {
            timestamp,
            pr: {
                id: prId,
                title: prData.title,
                description: prData.description,
                sourceBranch: prData.sourceRefName,
                targetBranch: prData.targetRefName,
                repository: repoName,
                organization: config.ORG,
                project: config.PROJECT
            },
            analysis: {
                totalFilesAnalyzed: diffInsights.totalFiles || 0,
                totalCommentsGenerated: allComments.length,
                prioritizedCommentsCount: prioritizedComments.length,
                idealCommentLimit: config.IDEAL_COMMENT_NUMBER
            },
            comments: {
                all: allComments,
                prioritized: prioritizedComments
            },
            riskAnalysis,
            categorization,
            diffInsights,
            model: {
                type: config.MODEL_TYPE,
                processingTime: diffInsights.processingTime || 0
            }
        };

        // Ensure log directory exists
        await fs.mkdir(this.logDirectory, { recursive: true });

        // Create filename with PR ID and timestamp
        const filename = `pr-${prId}-${repoName}-${timestamp.split('T')[0]}.json`;
        const filepath = path.join(this.logDirectory, filename);

        // Write analytics to file
        await fs.writeFile(filepath, JSON.stringify(analyticsData, null, 2), 'utf8');

        console.log(`PR analytics logged to: ${filepath}`);
        return filepath;
    }

    /**
     * Get analytics summary for a PR
     * @param {number} prId - PR ID
     * @param {string} repoName - Repository name
     * @returns {Promise<Object|null>} - Analytics data or null if not found
     */
    async getPRAnalytics(prId, repoName) {
        try {
            const files = await fs.readdir(this.logDirectory);
            const prFiles = files.filter(file =>
                file.startsWith(`pr-${prId}-${repoName}-`) && file.endsWith('.json')
            );

            if (prFiles.length === 0) return null;

            // Get the most recent file
            const latestFile = prFiles.sort().pop();
            const filepath = path.join(this.logDirectory, latestFile);
            const data = await fs.readFile(filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading PR analytics:', error);
            return null;
        }
    }

    /**
     * Get all analytics files
     * @returns {Promise<Array>} - List of analytics files
     */
    async getAllAnalyticsFiles() {
        try {
            return await fs.readdir(this.logDirectory);
        } catch (error) {
            console.error('Error reading analytics directory:', error);
            return [];
        }
    }
}

module.exports = AIDecisionAnalytics;
