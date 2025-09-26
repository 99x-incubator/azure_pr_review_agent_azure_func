/**
 * Smart Diff Analyzer - Analyzes code changes to provide context-aware insights
 */
class DiffAnalyzer {
    constructor() {
        this.patterns = {
            // Security patterns
            security: {
                patterns: [
                    /password\s*=\s*["'][^"']*["']/i,
                    /api[_-]?key\s*=\s*["'][^"']*["']/i,
                    /token\s*=\s*["'][^"']*["']/i,
                    /secret\s*=\s*["'][^"']*["']/i,
                    /eval\s*\(/i,
                    /innerHTML\s*=/i,
                    /document\.write/i,
                    /exec\s*\(/i
                ],
                severity: 'CRITICAL'
            },
            
            // Performance patterns
            performance: {
                patterns: [
                    /for\s*\(\s*\w+\s+in\s+\w+\)\s*\{[\s\S]*for\s*\(/i, // Nested loops
                    /\.length\s*\)\s*\{[\s\S]*\.length/i, // Multiple length calls in loop
                    /JSON\.parse\s*\(\s*JSON\.stringify/i, // Deep clone anti-pattern
                    /new\s+Date\s*\(\s*\)\s*\.getTime\s*\(\s*\)/i, // Inefficient timestamp
                    /document\.getElementById[\s\S]*document\.getElementById/i // Multiple DOM queries
                ],
                severity: 'HIGH'
            },
            
            // Code quality patterns
            quality: {
                patterns: [
                    /console\.log/i,
                    /debugger/i,
                    /alert\s*\(/i,
                    /var\s+\w+/i, // var usage instead of let/const
                    /==\s*[^=]/i, // == instead of ===
                    /!=\s*[^=]/i, // != instead of !==
                    /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/i // Empty catch blocks
                ],
                severity: 'MEDIUM'
            },
            
            // Best practices
            bestPractices: {
                patterns: [
                    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{200,}\}/i, // Large functions
                    /if\s*\([^)]*\)\s*\{[\s\S]*if\s*\([^)]*\)\s*\{[\s\S]*if/i, // Deep nesting
                    /(\w+)\s*=\s*\1\s*\|\|\s*/i, // Default value anti-pattern
                    /new\s+Array\s*\(/i, // Array constructor
                    /new\s+Object\s*\(/i // Object constructor
                ],
                severity: 'MEDIUM'
            }
        };
    }

    /**
     * Analyze diff content for patterns and insights
     */
    analyzeDiff(diffContent, fileName = '') {
        const analysis = {
            fileName,
            insights: [],
            metrics: {
                linesAdded: 0,
                linesRemoved: 0,
                complexity: 0,
                securityIssues: 0,
                performanceIssues: 0,
                qualityIssues: 0
            },
            suggestions: [],
            riskLevel: 'LOW'
        };

        // Parse diff lines
        const lines = diffContent.split('\n');
        const addedLines = lines.filter(line => line.startsWith('+')).map(line => line.substring(1));
        const removedLines = lines.filter(line => line.startsWith('-')).map(line => line.substring(1));

        analysis.metrics.linesAdded = addedLines.length;
        analysis.metrics.linesRemoved = removedLines.length;

        // Analyze added lines for patterns
        addedLines.forEach((line, index) => {
            this.analyzeLineForPatterns(line, index + 1, analysis, 'ADDED');
        });

        // Analyze removed lines to understand what was changed
        removedLines.forEach((line, index) => {
            this.analyzeLineForPatterns(line, index + 1, analysis, 'REMOVED');
        });

        // Calculate complexity
        analysis.metrics.complexity = this.calculateComplexity(addedLines);

        // Determine risk level
        analysis.riskLevel = this.determineRiskLevel(analysis.metrics);

        // Generate contextual suggestions
        analysis.suggestions = this.generateSuggestions(analysis);

        return analysis;
    }

    /**
     * Analyze a single line for various patterns
     */
    analyzeLineForPatterns(line, lineNumber, analysis, changeType) {
        Object.entries(this.patterns).forEach(([category, patternData]) => {
            patternData.patterns.forEach(pattern => {
                if (pattern.test(line)) {
                    const insight = {
                        category,
                        severity: patternData.severity,
                        line: lineNumber,
                        changeType,
                        content: line.trim(),
                        issue: this.getPatternDescription(pattern, category),
                        suggestion: this.getPatternSuggestion(pattern, category)
                    };

                    analysis.insights.push(insight);

                    // Update metrics
                    switch (category) {
                        case 'security':
                            analysis.metrics.securityIssues++;
                            break;
                        case 'performance':
                            analysis.metrics.performanceIssues++;
                            break;
                        default:
                            analysis.metrics.qualityIssues++;
                    }
                }
            });
        });
    }

    /**
     * Calculate code complexity score
     */
    calculateComplexity(lines) {
        let complexity = 0;
        const complexityPatterns = [
            /if\s*\(/g,          // Conditional statements
            /for\s*\(/g,         // Loops
            /while\s*\(/g,       // While loops
            /catch\s*\(/g,       // Exception handling
            /switch\s*\(/g,      // Switch statements
            /case\s+/g,          // Case statements
            /&&|\|\|/g,          // Logical operators
            /\?\s*.*\s*:/g       // Ternary operators
        ];

        lines.forEach(line => {
            complexityPatterns.forEach(pattern => {
                const matches = line.match(pattern);
                if (matches) {
                    complexity += matches.length;
                }
            });
        });

        return complexity;
    }

    /**
     * Determine overall risk level based on metrics
     */
    determineRiskLevel(metrics) {
        let riskScore = 0;

        // Security issues are high risk
        riskScore += metrics.securityIssues * 10;
        
        // Performance issues are medium-high risk
        riskScore += metrics.performanceIssues * 6;
        
        // Quality issues are low-medium risk
        riskScore += metrics.qualityIssues * 3;
        
        // High complexity increases risk
        if (metrics.complexity > 20) riskScore += 8;
        else if (metrics.complexity > 10) riskScore += 4;
        
        // Large changes increase risk
        if (metrics.linesAdded > 200) riskScore += 6;
        else if (metrics.linesAdded > 100) riskScore += 3;

        if (riskScore >= 25) return 'CRITICAL';
        if (riskScore >= 15) return 'HIGH';
        if (riskScore >= 8) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Generate contextual suggestions based on analysis
     */
    generateSuggestions(analysis) {
        const suggestions = [];
        const { metrics, insights } = analysis;

        // Security suggestions
        if (metrics.securityIssues > 0) {
            suggestions.push({
                type: 'SECURITY',
                priority: 'CRITICAL',
                message: '🛡️ Security review required - potential vulnerabilities detected',
                details: `Found ${metrics.securityIssues} security-related patterns`
            });
        }

        // Performance suggestions
        if (metrics.performanceIssues > 0) {
            suggestions.push({
                type: 'PERFORMANCE',
                priority: 'HIGH',
                message: '⚡ Performance optimization needed',
                details: `Found ${metrics.performanceIssues} performance anti-patterns`
            });
        }

        // Complexity suggestions
        if (metrics.complexity > 15) {
            suggestions.push({
                type: 'COMPLEXITY',
                priority: 'MEDIUM',
                message: '🧩 Consider refactoring for better maintainability',
                details: `Cyclomatic complexity score: ${metrics.complexity}`
            });
        }

        // Large change suggestions
        if (metrics.linesAdded > 150) {
            suggestions.push({
                type: 'SIZE',
                priority: 'MEDIUM',
                message: '📏 Consider breaking this change into smaller PRs',
                details: `${metrics.linesAdded} lines added in single change`
            });
        }

        // Quality suggestions based on patterns found
        const consoleLogs = insights.filter(i => /console\.log/i.test(i.content));
        if (consoleLogs.length > 0) {
            suggestions.push({
                type: 'QUALITY',
                priority: 'LOW',
                message: '🧹 Remove debug statements before merging',
                details: `Found ${consoleLogs.length} console.log statements`
            });
        }

        return suggestions;
    }

    /**
     * Get human-readable description for pattern
     */
    getPatternDescription(pattern, category) {
        const descriptions = {
            security: {
                '/password\\s*=\\s*["\'][^"\']*["\']': 'Hardcoded password detected',
                '/api[_-]?key\\s*=\\s*["\'][^"\']*["\']': 'Hardcoded API key detected',
                '/eval\\s*\\(': 'Use of eval() function - security risk',
                '/innerHTML\\s*=': 'Potential XSS vulnerability with innerHTML'
            },
            performance: {
                '/for\\s*\\(.*for\\s*\\(': 'Nested loops detected - potential O(n²) complexity',
                '/JSON\\.parse\\s*\\(\\s*JSON\\.stringify': 'Inefficient deep clone method',
                '/new\\s+Date\\s*\\(\\s*\\)\\.getTime': 'Use Date.now() instead for better performance'
            },
            quality: {
                '/console\\.log': 'Debug statement found',
                '/var\\s+\\w+': 'Consider using let/const instead of var',
                '/==\\s*[^=]': 'Use strict equality (===) instead of loose equality (==)'
            }
        };

        return descriptions[category]?.[pattern.source] || `${category} issue detected`;
    }

    /**
     * Get suggestion for fixing pattern
     */
    getPatternSuggestion(pattern, category) {
        const suggestions = {
            security: 'Move sensitive data to environment variables or secure configuration',
            performance: 'Consider algorithm optimization or caching strategies',
            quality: 'Follow coding best practices and style guidelines',
            bestPractices: 'Refactor to improve code maintainability and readability'
        };

        return suggestions[category] || 'Consider reviewing this code pattern';
    }

    /**
     * Generate comprehensive diff report
     */
    generateDiffReport(analysisResults) {
        if (!Array.isArray(analysisResults)) {
            analysisResults = [analysisResults];
        }

        let report = `## 🔍 Smart Diff Analysis Report\n\n`;

        // Overall summary
        const totalInsights = analysisResults.reduce((sum, result) => sum + result.insights.length, 0);
        const criticalIssues = analysisResults.reduce((sum, result) => 
            sum + result.insights.filter(i => i.severity === 'CRITICAL').length, 0
        );
        const highIssues = analysisResults.reduce((sum, result) => 
            sum + result.insights.filter(i => i.severity === 'HIGH').length, 0
        );

        report += `### 📊 Summary\n`;
        report += `- **Files Analyzed**: ${analysisResults.length}\n`;
        report += `- **Total Issues**: ${totalInsights}\n`;
        report += `- **🔴 Critical**: ${criticalIssues} | **🟠 High**: ${highIssues}\n\n`;

        // File-by-file analysis
        analysisResults.forEach(result => {
            if (result.insights.length > 0 || result.suggestions.length > 0) {
                const riskEmoji = this.getRiskEmoji(result.riskLevel);
                report += `### ${riskEmoji} \`${result.fileName}\` (Risk: ${result.riskLevel})\n`;
                
                // Metrics
                report += `**Metrics**: +${result.metrics.linesAdded} lines, Complexity: ${result.metrics.complexity}\n\n`;
                
                // Top insights
                const topInsights = result.insights
                    .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
                    .slice(0, 3);
                    
                if (topInsights.length > 0) {
                    report += `**Key Issues**:\n`;
                    topInsights.forEach(insight => {
                        const severityEmoji = this.getSeverityEmoji(insight.severity);
                        report += `- ${severityEmoji} Line ${insight.line}: ${insight.issue}\n`;
                    });
                    report += `\n`;
                }

                // Suggestions
                if (result.suggestions.length > 0) {
                    report += `**Suggestions**:\n`;
                    result.suggestions.forEach(suggestion => {
                        const priorityEmoji = this.getPriorityEmoji(suggestion.priority);
                        report += `- ${priorityEmoji} ${suggestion.message}\n`;
                    });
                    report += `\n`;
                }
            }
        });

        return report;
    }

    getRiskEmoji(riskLevel) {
        const emojis = {
            'CRITICAL': '🔴',
            'HIGH': '🟠',
            'MEDIUM': '🟡',
            'LOW': '🟢'
        };
        return emojis[riskLevel] || '⚪';
    }

    getSeverityEmoji(severity) {
        const emojis = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️',
            'MEDIUM': '💡',
            'LOW': 'ℹ️'
        };
        return emojis[severity] || 'ℹ️';
    }

    getPriorityEmoji(priority) {
        return this.getSeverityEmoji(priority);
    }

    getSeverityWeight(severity) {
        const weights = {
            'CRITICAL': 4,
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };
        return weights[severity] || 0;
    }
}

module.exports = DiffAnalyzer;
