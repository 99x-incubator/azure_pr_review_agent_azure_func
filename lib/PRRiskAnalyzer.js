/**
 * PR Risk Analyzer module
 */
class PRRiskAnalyzer {
    /**
     * Analyze PR risk based on various factors
     * @param {Object} prData - PR data
     * @param {Array} comments - All comments
     * @param {Object} diffInsights - Diff analysis
     * @param {Object} model - AI model for analysis
     * @returns {Promise<Object>} - Risk analysis results
     */
    async analyzePRRisk(prData, comments, diffInsights, model) {
        const riskFactors = {
            security: 0,
            performance: 0,
            maintainability: 0,
            complexity: 0,
            testing: 0
        };

        let totalRiskScore = 0;
        const riskIndicators = [];

        // Analyze comments for risk keywords
        for (const comment of comments) {
            const commentText = comment.comment.toLowerCase();

            if (commentText.includes('security') || commentText.includes('vulnerability') ||
                commentText.includes('injection') || commentText.includes('auth')) {
                riskFactors.security += 2;
                riskIndicators.push({ type: 'security', comment: comment.comment });
            }

            if (commentText.includes('performance') || commentText.includes('memory') ||
                commentText.includes('timeout') || commentText.includes('efficiency')) {
                riskFactors.performance += 1.5;
                riskIndicators.push({ type: 'performance', comment: comment.comment });
            }

            if (commentText.includes('maintainability') || commentText.includes('code quality') ||
                commentText.includes('readability') || commentText.includes('complex')) {
                riskFactors.maintainability += 1;
                riskIndicators.push({ type: 'maintainability', comment: comment.comment });
            }

            if (commentText.includes('complexity') || commentText.includes('cyclomatic') ||
                commentText.includes('nested') || commentText.includes('deep')) {
                riskFactors.complexity += 1.5;
                riskIndicators.push({ type: 'complexity', comment: comment.comment });
            }

            if (commentText.includes('test') || commentText.includes('coverage') ||
                commentText.includes('spec') || commentText.includes('assert')) {
                riskFactors.testing += 1;
                riskIndicators.push({ type: 'testing', comment: comment.comment });
            }
        }

        // Analyze diff insights for additional risk factors
        if (diffInsights) {
            if (diffInsights.largeFiles > 0) {
                riskFactors.complexity += 1;
                riskIndicators.push({ type: 'complexity', comment: `Large files modified: ${diffInsights.largeFiles}` });
            }

            if (diffInsights.criticalFiles > 0) {
                riskFactors.security += 2;
                riskIndicators.push({ type: 'security', comment: `Critical files modified: ${diffInsights.criticalFiles}` });
            }

            if (diffInsights.testFiles === 0 && diffInsights.totalFiles > 5) {
                riskFactors.testing += 2;
                riskIndicators.push({ type: 'testing', comment: 'No test files modified in large change' });
            }
        }

        // Calculate total risk score
        totalRiskScore = Object.values(riskFactors).reduce((sum, score) => sum + score, 0);

        // Determine risk level
        let riskLevel = 'low';
        if (totalRiskScore >= 10) riskLevel = 'high';
        else if (totalRiskScore >= 5) riskLevel = 'medium';

        // Generate recommendations
        const recommendations = this.generateRecommendations(riskFactors, riskLevel);

        return {
            totalScore: totalRiskScore,
            level: riskLevel,
            factors: riskFactors,
            indicators: riskIndicators,
            recommendations,
            analysisTimestamp: new Date().toISOString()
        };
    }

    /**
     * Generate risk-based recommendations
     * @param {Object} riskFactors - Risk factors
     * @param {string} riskLevel - Overall risk level
     * @returns {Array} - Recommendations
     */
    generateRecommendations(riskFactors, riskLevel) {
        const recommendations = [];

        if (riskFactors.security > 0) {
            recommendations.push('🔒 Security review required - address security concerns before merging');
        }

        if (riskFactors.performance > 0) {
            recommendations.push('⚡ Performance testing recommended - validate performance impact');
        }

        if (riskFactors.testing > 0) {
            recommendations.push('🧪 Additional testing required - ensure adequate test coverage');
        }

        if (riskFactors.complexity > 0) {
            recommendations.push('🔧 Code review required - consider refactoring for better maintainability');
        }

        if (riskLevel === 'high') {
            recommendations.push('🚨 High-risk changes - require senior developer review');
        } else if (riskLevel === 'medium') {
            recommendations.push('⚠️ Medium-risk changes - thorough review recommended');
        }

        return recommendations;
    }
}

module.exports = PRRiskAnalyzer;
