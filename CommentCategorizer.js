/**
 * Smart Comment Categorizer - Groups and prioritizes AI comments intelligently
 */
class CommentCategorizer {
    constructor() {
        this.categories = {
            'critical_security': {
                weight: 100,
                icon: '🛡️',
                name: 'Critical Security',
                keywords: ['sql injection', 'xss', 'csrf', 'vulnerability', 'security flaw', 'exploit', 'password', 'authentication'],
                patterns: [/password.*plain.*text/i, /sql.*injection/i, /cross.*site.*scripting/i]
            },
            'bugs_errors': {
                weight: 90,
                icon: '🐛',
                name: 'Bugs & Errors',
                keywords: ['null pointer', 'undefined', 'crash', 'exception', 'error', 'bug', 'fail', 'break'],
                patterns: [/null.*pointer/i, /undefined.*reference/i, /memory.*leak/i]
            },
            'performance': {
                weight: 80,
                icon: '⚡',
                name: 'Performance Issues',
                keywords: ['performance', 'slow', 'optimization', 'inefficient', 'bottleneck', 'memory', 'cpu'],
                patterns: [/o\(n\^?\d+\)/i, /performance.*issue/i, /slow.*query/i]
            },
            'architecture': {
                weight: 70,
                icon: '🏗️',
                name: 'Architecture & Design',
                keywords: ['design pattern', 'architecture', 'structure', 'coupling', 'cohesion', 'separation'],
                patterns: [/tight.*coupling/i, /design.*pattern/i, /single.*responsibility/i]
            },
            'maintainability': {
                weight: 60,
                icon: '🔧',
                name: 'Code Maintainability',
                keywords: ['refactor', 'duplicate', 'complex', 'readable', 'maintainable', 'clean'],
                patterns: [/duplicate.*code/i, /too.*complex/i, /hard.*to.*read/i]
            },
            'testing': {
                weight: 50,
                icon: '✅',
                name: 'Testing & Coverage',
                keywords: ['test', 'coverage', 'unit test', 'integration', 'mock', 'stub'],
                patterns: [/missing.*test/i, /test.*coverage/i, /unit.*test/i]
            },
            'documentation': {
                weight: 40,
                icon: '📚',
                name: 'Documentation',
                keywords: ['comment', 'documentation', 'readme', 'javadoc', 'document'],
                patterns: [/missing.*comment/i, /undocumented/i, /add.*documentation/i]
            },
            'style_formatting': {
                weight: 30,
                icon: '🎨',
                name: 'Style & Formatting',
                keywords: ['formatting', 'style', 'indentation', 'naming', 'convention'],
                patterns: [/naming.*convention/i, /code.*style/i, /formatting/i]
            },
            'minor_suggestions': {
                weight: 20,
                icon: '💡',
                name: 'Minor Suggestions',
                keywords: ['suggestion', 'consider', 'might', 'could', 'optional'],
                patterns: [/consider.*using/i, /you.*might/i, /could.*be/i]
            }
        };
    }

    /**
     * Categorize and intelligently group comments
     */
    categorizeComments(comments) {
        const categorized = {
            byCategory: {},
            prioritizedList: [],
            summary: {
                totalComments: comments.length,
                criticalCount: 0,
                highCount: 0,
                mediumCount: 0,
                lowCount: 0
            }
        };

        // Initialize categories
        Object.keys(this.categories).forEach(key => {
            categorized.byCategory[key] = [];
        });

        // Categorize each comment
        comments.forEach((comment, index) => {
            const category = this.determineCategory(comment);
            const enhancedComment = {
                ...comment,
                id: index + 1,
                category: category,
                categoryInfo: this.categories[category],
                smartPriority: this.calculateSmartPriority(comment, category),
                actionRequired: this.determineActionRequired(comment, category)
            };

            categorized.byCategory[category].push(enhancedComment);
            categorized.prioritizedList.push(enhancedComment);
        });

        // Sort by smart priority
        categorized.prioritizedList.sort((a, b) => b.smartPriority - a.smartPriority);

        // Update summary counts
        categorized.prioritizedList.forEach(comment => {
            if (comment.smartPriority >= 90) categorized.summary.criticalCount++;
            else if (comment.smartPriority >= 70) categorized.summary.highCount++;
            else if (comment.smartPriority >= 50) categorized.summary.mediumCount++;
            else categorized.summary.lowCount++;
        });

        return categorized;
    }

    /**
     * Determine the best category for a comment
     */
    determineCategory(comment) {
        const text = comment.comment.toLowerCase();
        let bestCategory = 'minor_suggestions';
        let highestScore = 0;

        Object.entries(this.categories).forEach(([categoryKey, categoryData]) => {
            let score = 0;

            // Check keywords
            categoryData.keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    score += categoryData.weight * 0.1;
                }
            });

            // Check patterns
            categoryData.patterns.forEach(pattern => {
                if (pattern.test(text)) {
                    score += categoryData.weight * 0.2;
                }
            });

            // Boost based on existing priority
            if (comment.priority === 'critical') score += 50;
            else if (comment.priority === 'high') score += 30;
            else if (comment.priority === 'medium') score += 15;

            if (score > highestScore) {
                highestScore = score;
                bestCategory = categoryKey;
            }
        });

        return bestCategory;
    }

    /**
     * Calculate smart priority combining category weight and content analysis
     */
    calculateSmartPriority(comment, category) {
        let priority = this.categories[category].weight;
        const text = comment.comment.toLowerCase();

        // Boost for urgency indicators
        if (text.includes('critical') || text.includes('urgent')) priority += 15;
        if (text.includes('must') || text.includes('required')) priority += 10;
        if (text.includes('should') || text.includes('recommend')) priority += 5;

        // Boost for file criticality
        if (comment.file && comment.file.includes('config')) priority += 8;
        if (comment.file && comment.file.includes('security')) priority += 12;
        if (comment.file && comment.file.includes('database')) priority += 10;

        // Reduce for minor issues
        if (text.includes('minor') || text.includes('nitpick')) priority -= 20;
        if (text.includes('optional') || text.includes('consider')) priority -= 10;

        return Math.max(0, Math.min(100, priority));
    }

    /**
     * Determine what action is required for this comment
     */
    determineActionRequired(comment, category) {
        const priority = this.calculateSmartPriority(comment, category);
        
        if (priority >= 90) return 'IMMEDIATE_ACTION_REQUIRED';
        if (priority >= 70) return 'ACTION_NEEDED';
        if (priority >= 50) return 'REVIEW_RECOMMENDED';
        return 'INFORMATIONAL';
    }

    /**
     * Generate intelligent summary report
     */
    generateCategoryReport(categorizedComments) {
        const { byCategory, summary, prioritizedList } = categorizedComments;
        
        let report = `## 🎯 Smart Comment Analysis\n\n`;
        
        // Executive Summary
        report += `### 📊 Executive Summary\n`;
        report += `- **Total Issues Found**: ${summary.totalComments}\n`;
        report += `- **🔴 Critical**: ${summary.criticalCount} | **🟠 High**: ${summary.highCount} | **🟡 Medium**: ${summary.mediumCount} | **⚪ Low**: ${summary.lowCount}\n\n`;

        // Top Priority Issues
        const topIssues = prioritizedList.slice(0, 5);
        report += `### 🚨 Top 5 Priority Issues\n`;
        topIssues.forEach((comment, index) => {
            const actionIcon = this.getActionIcon(comment.actionRequired);
            report += `${index + 1}. ${actionIcon} **${comment.categoryInfo.icon} ${comment.categoryInfo.name}** (Priority: ${comment.smartPriority})\n`;
            report += `   📝 ${comment.comment}\n`;
            report += `   📁 \`${comment.file || 'Unknown file'}\`\n\n`;
        });

        // Category Breakdown
        report += `### 📋 Issues by Category\n`;
        Object.entries(byCategory).forEach(([categoryKey, comments]) => {
            if (comments.length > 0) {
                const categoryInfo = this.categories[categoryKey];
                report += `#### ${categoryInfo.icon} ${categoryInfo.name} (${comments.length})\n`;
                comments.forEach(comment => {
                    const actionIcon = this.getActionIcon(comment.actionRequired);
                    report += `- ${actionIcon} ${comment.comment.substring(0, 100)}${comment.comment.length > 100 ? '...' : ''}\n`;
                });
                report += `\n`;
            }
        });

        return report;
    }

    getActionIcon(actionRequired) {
        switch (actionRequired) {
            case 'IMMEDIATE_ACTION_REQUIRED': return '🚨';
            case 'ACTION_NEEDED': return '⚠️';
            case 'REVIEW_RECOMMENDED': return '💡';
            default: return 'ℹ️';
        }
    }
}

module.exports = CommentCategorizer;
