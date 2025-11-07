/**
 * Diff Analyzer module for smart diff analysis
 */
class DiffAnalyzer {
    /**
     * Analyze PR changes for insights
     * @param {Array} prChanges - PR change entries
     * @param {Object} prData - PR data
     * @returns {Object} - Diff insights
     */
    analyzeDiff(prChanges, prData) {
        const insights = {
            totalFiles: prChanges.length,
            totalAdditions: 0,
            totalDeletions: 0,
            modifiedFiles: 0,
            addedFiles: 0,
            deletedFiles: 0,
            renamedFiles: 0,
            largeFiles: 0,
            criticalFiles: 0,
            testFiles: 0,
            configFiles: 0,
            fileTypes: {},
            riskIndicators: []
        };

        // Critical file patterns
        const criticalPatterns = [
            /package\.json/i,
            /requirements\.txt/i,
            /gemfile/i,
            /dockerfile/i,
            /kubernetes/i,
            /helm/i,
            /config/i,
            /secret/i,
            /auth/i,
            /database/i,
            /migration/i
        ];

        // Test file patterns
        const testPatterns = [
            /test/i,
            /spec/i,
            /__tests__/i,
            /\.test\./i,
            /\.spec\./i
        ];

        // Config file patterns
        const configPatterns = [
            /config/i,
            /\.env/i,
            /\.yml/i,
            /\.yaml/i,
            /\.json/i,
            /\.xml/i,
            /\.ini/i,
            /\.conf/i
        ];

        for (const change of prChanges) {
            const itemPath = change.item?.path;
            if (!itemPath) continue;

            // Count change types
            switch (change.changeType) {
                case 'add':
                    insights.addedFiles++;
                    break;
                case 'delete':
                    insights.deletedFiles++;
                    break;
                case 'edit':
                    insights.modifiedFiles++;
                    break;
                case 'rename':
                    insights.renamedFiles++;
                    break;
            }

            // Analyze file size (if available)
            if (change.item.size && change.item.size > 100000) { // > 100KB
                insights.largeFiles++;
                insights.riskIndicators.push(`Large file: ${itemPath} (${Math.round(change.item.size / 1024)}KB)`);
            }

            // Check for critical files
            const isCritical = criticalPatterns.some(pattern => pattern.test(itemPath));
            if (isCritical) {
                insights.criticalFiles++;
                insights.riskIndicators.push(`Critical file modified: ${itemPath}`);
            }

            // Check for test files
            const isTest = testPatterns.some(pattern => pattern.test(itemPath));
            if (isTest) {
                insights.testFiles++;
            }

            // Check for config files
            const isConfig = configPatterns.some(pattern => pattern.test(itemPath));
            if (isConfig) {
                insights.configFiles++;
            }

            // Track file types
            const extension = this.getFileExtension(itemPath);
            if (extension) {
                insights.fileTypes[extension] = (insights.fileTypes[extension] || 0) + 1;
            }

            // Accumulate line changes (if available)
            if (change.item.stats) {
                insights.totalAdditions += change.item.stats.adds || 0;
                insights.totalDeletions += change.item.stats.deletes || 0;
            }
        }

        // Calculate change complexity
        insights.changeComplexity = this.calculateChangeComplexity(insights);

        // Generate insights summary
        insights.summary = this.generateDiffSummary(insights, prData);

        return insights;
    }

    /**
     * Get file extension
     * @param {string} filepath - File path
     * @returns {string|null} - File extension
     */
    getFileExtension(filepath) {
        const parts = filepath.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : null;
    }

    /**
     * Calculate change complexity score
     * @param {Object} insights - Diff insights
     * @returns {number} - Complexity score
     */
    calculateChangeComplexity(insights) {
        let complexity = 0;

        complexity += insights.totalFiles * 2;
        complexity += insights.criticalFiles * 5;
        complexity += insights.largeFiles * 3;
        complexity += Math.log10(insights.totalAdditions + insights.totalDeletions + 1) * 10;

        return Math.round(complexity);
    }

    /**
     * Generate diff summary
     * @param {Object} insights - Diff insights
     * @param {Object} prData - PR data
     * @returns {string} - Summary text
     */
    generateDiffSummary(insights, prData) {
        const summary = [];

        summary.push(`📊 **Diff Analysis Summary**`);
        summary.push(`- **Files Changed**: ${insights.totalFiles} (${insights.modifiedFiles} modified, ${insights.addedFiles} added, ${insights.deletedFiles} deleted, ${insights.renamedFiles} renamed)`);
        summary.push(`- **Lines Changed**: +${insights.totalAdditions} -${insights.totalDeletions}`);
        summary.push(`- **Change Complexity**: ${insights.changeComplexity}/100`);

        if (insights.criticalFiles > 0) {
            summary.push(`- ⚠️ **Critical Files**: ${insights.criticalFiles} modified`);
        }

        if (insights.testFiles > 0) {
            summary.push(`- 🧪 **Test Files**: ${insights.testFiles} included`);
        }

        if (insights.largeFiles > 0) {
            summary.push(`- 📁 **Large Files**: ${insights.largeFiles} modified`);
        }

        // Top file types
        const topTypes = Object.entries(insights.fileTypes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([type, count]) => `${type}: ${count}`);

        if (topTypes.length > 0) {
            summary.push(`- 📄 **File Types**: ${topTypes.join(', ')}`);
        }

        return summary.join('\n');
    }
}

module.exports = DiffAnalyzer;
