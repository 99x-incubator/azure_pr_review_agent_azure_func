/**
 * Comment Categorizer module
 */
class CommentCategorizer {
    /**
     * Categorize comments into different types
     * @param {Array} comments - Array of comments
     * @returns {Object} - Categorized comments
     */
    categorizeComments(comments) {
        const categories = {
            security: [],
            performance: [],
            maintainability: [],
            functionality: [],
            testing: [],
            documentation: [],
            style: [],
            other: []
        };

        for (const comment of comments) {
            const category = this.categorizeComment(comment.comment);
            categories[category].push(comment);
        }

        // Add summary counts
        const summary = {};
        for (const [category, comments] of Object.entries(categories)) {
            summary[category] = comments.length;
        }

        return {
            categories,
            summary,
            totalComments: comments.length
        };
    }

    /**
     * Categorize a single comment
     * @param {string} commentText - Comment text
     * @returns {string} - Category
     */
    categorizeComment(commentText) {
        const text = commentText.toLowerCase();

        // Security related
        if (text.includes('security') || text.includes('vulnerability') ||
            text.includes('injection') || text.includes('auth') ||
            text.includes('encryption') || text.includes('validation') ||
            text.includes('sanitization')) {
            return 'security';
        }

        // Performance related
        if (text.includes('performance') || text.includes('memory') ||
            text.includes('timeout') || text.includes('efficiency') ||
            text.includes('optimization') || text.includes('speed') ||
            text.includes('resource')) {
            return 'performance';
        }

        // Maintainability related
        if (text.includes('maintainability') || text.includes('readability') ||
            text.includes('complexity') || text.includes('refactor') ||
            text.includes('clean') || text.includes('structure') ||
            text.includes('architecture')) {
            return 'maintainability';
        }

        // Functionality related
        if (text.includes('functionality') || text.includes('feature') ||
            text.includes('logic') || text.includes('algorithm') ||
            text.includes('implementation') || text.includes('bug') ||
            text.includes('fix') || text.includes('error')) {
            return 'functionality';
        }

        // Testing related
        if (text.includes('test') || text.includes('coverage') ||
            text.includes('spec') || text.includes('assert') ||
            text.includes('mock') || text.includes('unit')) {
            return 'testing';
        }

        // Documentation related
        if (text.includes('documentation') || text.includes('comment') ||
            text.includes('doc') || text.includes('javadoc') ||
            text.includes('readme')) {
            return 'documentation';
        }

        // Style related
        if (text.includes('style') || text.includes('format') ||
            text.includes('indentation') || text.includes('naming') ||
            text.includes('convention')) {
            return 'style';
        }

        // Default to other
        return 'other';
    }

    /**
     * Get category descriptions
     * @returns {Object} - Category descriptions
     */
    getCategoryDescriptions() {
        return {
            security: 'Security vulnerabilities, authentication, validation issues',
            performance: 'Performance bottlenecks, memory usage, efficiency concerns',
            maintainability: 'Code complexity, readability, architectural issues',
            functionality: 'Logic errors, bugs, feature implementation issues',
            testing: 'Test coverage, testing practices, assertions',
            documentation: 'Missing or inadequate documentation',
            style: 'Code style, formatting, naming conventions',
            other: 'Miscellaneous comments'
        };
    }
}

module.exports = CommentCategorizer;
