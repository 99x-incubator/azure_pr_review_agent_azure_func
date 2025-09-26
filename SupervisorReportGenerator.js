const fs = require('fs').promises;
const path = require('path');

/**
 * AI Decision Quality Analyzer - Generate supervisor reports
 * Shows AI shortlisting effectiveness across multiple PRs
 */
class SupervisorReportGenerator {
    constructor(analyticsDir = './ai-analytics') {
        this.analyticsDir = analyticsDir;
    }

    /**
     * Generate comprehensive supervisor report
     */
    async generateSupervisorReport() {
        console.log('📊 Generating Supervisor Report - AI Decision Quality Analysis');
        
        try {
            // 1. Load all PR analysis data
            const analyticsFiles = await this.loadAllAnalyticsFiles();
            console.log(`📁 Found ${analyticsFiles.length} PR analysis files`);
            
            if (analyticsFiles.length === 0) {
                return this.generateNoDataReport();
            }

            // 2. Analyze AI decision quality
            const qualityAnalysis = this.analyzeAIDecisionQuality(analyticsFiles);
            
            // 3. Generate visual reports
            const report = this.createSupervisorReport(qualityAnalysis);
            
            // 4. Save report
            const reportPath = path.join(this.analyticsDir, `SUPERVISOR-REPORT-${new Date().toISOString().split('T')[0]}.md`);
            await fs.writeFile(reportPath, report);
            
            console.log(`✅ Supervisor report generated: ${reportPath}`);
            return { reportPath, analysis: qualityAnalysis };
            
        } catch (error) {
            console.error('Failed to generate supervisor report:', error);
            throw error;
        }
    }

    /**
     * Load all analytics files from directory
     */
    async loadAllAnalyticsFiles() {
        try {
            const files = await fs.readdir(this.analyticsDir);
            const analyticsFiles = [];
            
            for (const file of files) {
                if (file.startsWith('pr_analysis_') && file.endsWith('.json')) {
                    const filePath = path.join(this.analyticsDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    analyticsFiles.push(data);
                }
            }
            
            // Sort by timestamp
            return analyticsFiles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('Error loading analytics files:', error);
            return [];
        }
    }

    /**
     * Analyze AI decision quality across all PRs
     */
    analyzeAIDecisionQuality(analyticsFiles) {
        const analysis = {
            summary: {
                totalPRs: analyticsFiles.length,
                totalAllComments: 0,
                totalShortlistedComments: 0,
                averageShortlistingRatio: 0,
                totalFilesAnalyzed: 0
            },
            prBreakdown: [],
            qualityMetrics: {
                criticalIssuesFoundRatio: 0,
                highPriorityIssuesFoundRatio: 0,
                categoryDistribution: {},
                shortlistingEffectiveness: 'EXCELLENT' // POOR/FAIR/GOOD/EXCELLENT
            },
            trends: {
                improvingOverTime: false,
                consistentQuality: true,
                averageCommentsPerPR: 0
            }
        };

        let totalCritical = 0;
        let totalHigh = 0;
        let shortlistedCritical = 0;
        let shortlistedHigh = 0;

        // Analyze each PR
        analyticsFiles.forEach((pr, index) => {
            const prAnalysis = {
                prId: pr.prId,
                prTitle: pr.prTitle,
                timestamp: pr.timestamp,
                allComments: 0,
                shortlistedComments: 0,
                shortlistRatio: 0,
                filesAnalyzed: pr.files ? pr.files.length : 0,
                categories: {},
                qualityScore: 0
            };

            // Count comments from files or direct arrays
            if (pr.files && pr.files.length > 0) {
                pr.files.forEach(file => {
                    if (file.stage1 && file.stage1.allComments) {
                        prAnalysis.allComments += file.stage1.allComments.length;
                        analysis.summary.totalAllComments += file.stage1.allComments.length;
                        
                        // Count priorities
                        file.stage1.allComments.forEach(comment => {
                            if (comment.priority === 'critical') totalCritical++;
                            if (comment.priority === 'high') totalHigh++;
                        });
                    }
                    
                    if (file.stage2 && file.stage2.shortlistedComments) {
                        prAnalysis.shortlistedComments += file.stage2.shortlistedComments.length;
                        analysis.summary.totalShortlistedComments += file.stage2.shortlistedComments.length;
                        
                        // Count shortlisted priorities
                        file.stage2.shortlistedComments.forEach(comment => {
                            if (comment.priority === 'critical') shortlistedCritical++;
                            if (comment.priority === 'high') shortlistedHigh++;
                        });
                    }
                });
            } else if (pr.allComments && pr.prioritizedComments) {
                // Handle direct comment arrays
                prAnalysis.allComments = pr.allComments.length;
                prAnalysis.shortlistedComments = pr.prioritizedComments.length;
                analysis.summary.totalAllComments += pr.allComments.length;
                analysis.summary.totalShortlistedComments += pr.prioritizedComments.length;
                
                pr.allComments.forEach(comment => {
                    if (comment.priority === 'critical') totalCritical++;
                    if (comment.priority === 'high') totalHigh++;
                });
                
                pr.prioritizedComments.forEach(comment => {
                    if (comment.priority === 'critical') shortlistedCritical++;
                    if (comment.priority === 'high') shortlistedHigh++;
                });
            }

            prAnalysis.shortlistRatio = prAnalysis.allComments > 0 ? 
                (prAnalysis.shortlistedComments / prAnalysis.allComments * 100).toFixed(1) : 0;
            
            prAnalysis.qualityScore = this.calculateQualityScore(prAnalysis);
            analysis.summary.totalFilesAnalyzed += prAnalysis.filesAnalyzed;
            analysis.prBreakdown.push(prAnalysis);
        });

        // Calculate summary metrics
        if (analysis.summary.totalPRs > 0) {
            analysis.summary.averageShortlistingRatio = 
                (analysis.summary.totalShortlistedComments / analysis.summary.totalAllComments * 100).toFixed(1);
            analysis.trends.averageCommentsPerPR = 
                (analysis.summary.totalAllComments / analysis.summary.totalPRs).toFixed(1);
        }

        // Quality metrics
        analysis.qualityMetrics.criticalIssuesFoundRatio = totalCritical > 0 ? 
            (shortlistedCritical / totalCritical * 100).toFixed(1) : 100;
        analysis.qualityMetrics.highPriorityIssuesFoundRatio = totalHigh > 0 ? 
            (shortlistedHigh / totalHigh * 100).toFixed(1) : 100;

        // Determine effectiveness
        const criticalRatio = parseFloat(analysis.qualityMetrics.criticalIssuesFoundRatio);
        const highRatio = parseFloat(analysis.qualityMetrics.highPriorityIssuesFoundRatio);
        
        if (criticalRatio >= 90 && highRatio >= 80) analysis.qualityMetrics.shortlistingEffectiveness = 'EXCELLENT';
        else if (criticalRatio >= 75 && highRatio >= 70) analysis.qualityMetrics.shortlistingEffectiveness = 'GOOD';
        else if (criticalRatio >= 60 && highRatio >= 60) analysis.qualityMetrics.shortlistingEffectiveness = 'FAIR';
        else analysis.qualityMetrics.shortlistingEffectiveness = 'NEEDS_IMPROVEMENT';

        return analysis;
    }

    /**
     * Calculate quality score for a PR
     */
    calculateQualityScore(prAnalysis) {
        let score = 0;
        
        // Base score for having comments
        if (prAnalysis.allComments > 0) score += 20;
        
        // Score for good shortlisting ratio (20-40% is ideal)
        const ratio = parseFloat(prAnalysis.shortlistRatio);
        if (ratio >= 15 && ratio <= 35) score += 30;
        else if (ratio >= 10 && ratio <= 50) score += 20;
        else score += 10;
        
        // Score for processing multiple files
        if (prAnalysis.filesAnalyzed > 1) score += 25;
        
        // Score for finding reasonable number of issues
        if (prAnalysis.allComments >= 5 && prAnalysis.allComments <= 20) score += 25;
        
        return Math.min(100, score);
    }

    /**
     * Create supervisor report
     */
    createSupervisorReport(analysis) {
        const effectivenessEmoji = {
            'EXCELLENT': '🟢',
            'GOOD': '🟡', 
            'FAIR': '🟠',
            'NEEDS_IMPROVEMENT': '🔴'
        };

        return `# 📊 AI PR Review Agent - Supervisor Quality Report

**Generated on**: ${new Date().toISOString().split('T')[0]}
**Analysis Period**: ${analysis.prBreakdown.length} PRs analyzed

## 🎯 Executive Summary

${effectivenessEmoji[analysis.qualityMetrics.shortlistingEffectiveness]} **AI Shortlisting Quality**: **${analysis.qualityMetrics.shortlistingEffectiveness}**

### 📈 Key Metrics
- **Total PRs Analyzed**: ${analysis.summary.totalPRs}
- **Total Comments Generated**: ${analysis.summary.totalAllComments}
- **Comments Shortlisted**: ${analysis.summary.totalShortlistedComments}
- **Average Shortlisting Ratio**: ${analysis.summary.averageShortlistingRatio}%
- **Files Analyzed**: ${analysis.summary.totalFilesAnalyzed}
- **Average Comments per PR**: ${analysis.trends.averageCommentsPerPR}

### 🎯 AI Decision Quality
- **Critical Issues Detection**: ${analysis.qualityMetrics.criticalIssuesFoundRatio}% ✅
- **High Priority Issues Detection**: ${analysis.qualityMetrics.highPriorityIssuesFoundRatio}% ✅
- **Overall Effectiveness**: ${analysis.qualityMetrics.shortlistingEffectiveness}

---

## 📋 PR-by-PR Analysis

${analysis.prBreakdown.map((pr, index) => `
### PR #${index + 1}: ${pr.prId}
**Title**: ${pr.prTitle}
**Date**: ${new Date(pr.timestamp).toLocaleDateString()}

| Metric | Value | Quality |
|--------|-------|---------|
| All Comments | ${pr.allComments} | ${pr.allComments >= 5 ? '✅' : '⚠️'} |
| Shortlisted | ${pr.shortlistedComments} | ${pr.shortlistedComments >= 3 ? '✅' : '⚠️'} |
| Shortlist Ratio | ${pr.shortlistRatio}% | ${parseFloat(pr.shortlistRatio) >= 15 && parseFloat(pr.shortlistRatio) <= 35 ? '✅' : '⚠️'} |
| Files Analyzed | ${pr.filesAnalyzed} | ${pr.filesAnalyzed > 0 ? '✅' : '❌'} |
| **Quality Score** | **${pr.qualityScore}/100** | ${pr.qualityScore >= 80 ? '🟢' : pr.qualityScore >= 60 ? '🟡' : '🔴'} |
`).join('\n')}

---

## 📊 Quality Assessment

### ✅ **Strengths Observed**
${analysis.qualityMetrics.criticalIssuesFoundRatio >= 80 ? '- Excellent at identifying critical security and bug issues' : ''}
${analysis.qualityMetrics.highPriorityIssuesFoundRatio >= 70 ? '- Strong performance detecting high-priority problems' : ''}
${analysis.summary.averageShortlistingRatio >= 15 && analysis.summary.averageShortlistingRatio <= 35 ? '- Optimal shortlisting ratio - not too aggressive, not too lenient' : ''}
${analysis.trends.averageCommentsPerPR >= 5 ? '- Comprehensive analysis generating adequate feedback' : ''}

### 🔍 **Areas for Monitoring**
${parseFloat(analysis.summary.averageShortlistingRatio) < 15 ? '- Shortlisting ratio might be too aggressive (< 15%)' : ''}
${parseFloat(analysis.summary.averageShortlistingRatio) > 40 ? '- Shortlisting ratio might be too lenient (> 40%)' : ''}
${analysis.trends.averageCommentsPerPR < 5 ? '- Low average comments per PR - might miss issues' : ''}

---

## 🚀 **Recommendation for Production Use**

Based on the analysis of ${analysis.summary.totalPRs} PRs:

${analysis.qualityMetrics.shortlistingEffectiveness === 'EXCELLENT' ? 
`🟢 **APPROVED FOR PRODUCTION**
- AI demonstrates excellent decision-making quality
- Critical and high-priority issue detection is outstanding
- Shortlisting ratio is well-calibrated
- Ready for enterprise deployment` :
analysis.qualityMetrics.shortlistingEffectiveness === 'GOOD' ?
`🟡 **APPROVED WITH MONITORING**
- AI shows good decision-making quality
- Minor adjustments may be needed over time
- Recommend continued monitoring for 2-3 more PRs` :
`🔴 **NEEDS IMPROVEMENT**
- AI decision quality requires tuning
- Recommend parameter adjustments before production use`}

---

## 📈 **Data Summary for Technical Review**

\`\`\`json
{
  "totalAnalyzed": ${analysis.summary.totalPRs},
  "overallEffectiveness": "${analysis.qualityMetrics.shortlistingEffectiveness}",
  "criticalDetectionRate": "${analysis.qualityMetrics.criticalIssuesFoundRatio}%",
  "averageShortlistRatio": "${analysis.summary.averageShortlistingRatio}%",
  "qualityScore": "${analysis.prBreakdown.reduce((sum, pr) => sum + pr.qualityScore, 0) / analysis.prBreakdown.length}/100"
}
\`\`\`

---
*Report generated by AI Decision Quality Analyzer*
*All data based on actual PR analysis results*
`;
    }

    /**
     * Generate report when no data is available
     */
    generateNoDataReport() {
        return `# 📊 AI PR Review Agent - Supervisor Quality Report

**Status**: No analysis data found

## 🔍 Next Steps
1. Run the AI PR Review Agent on 3-5 PRs
2. Analytics data will be automatically collected
3. Re-run this report generator to see quality metrics

The system is ready to analyze PRs and will automatically track:
- All AI comments vs shortlisted comments
- Decision quality metrics  
- Effectiveness over time
- Detailed PR-by-PR analysis

Contact the development team to initiate PR analysis.
`;
    }
}

module.exports = SupervisorReportGenerator;

// CLI usage
if (require.main === module) {
    const generator = new SupervisorReportGenerator();
    generator.generateSupervisorReport()
        .then(result => {
            console.log('\n🎯 SUPERVISOR REPORT READY!');
            console.log(`📄 Report saved to: ${result.reportPath}`);
            console.log(`📊 Quality: ${result.analysis.qualityMetrics.shortlistingEffectiveness}`);
            console.log(`📈 PRs analyzed: ${result.analysis.summary.totalPRs}`);
        })
        .catch(error => {
            console.error('Failed to generate report:', error);
            process.exit(1);
        });
}
