const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced PR Risk Assessment System
 */
class PRRiskAnalyzer {
    constructor(context = null) {
        this.context = context;
    }

    /**
     * Calculate comprehensive risk score for a PR
     */
    async calculatePRRisk(prData, files, comments) {
        const risk = {
            overall: 0,
            breakdown: {
                complexity: 0,
                security: 0,
                testCoverage: 0,
                fileImpact: 0,
                criticalIssues: 0
            },
            level: 'LOW',
            recommendations: []
        };

        // 1. Complexity Risk (0-25 points)
        risk.breakdown.complexity = this.calculateComplexityRisk(files);
        
        // 2. Security Risk (0-30 points)
        risk.breakdown.security = this.calculateSecurityRisk(comments);
        
        // 3. Test Coverage Risk (0-20 points) 
        risk.breakdown.testCoverage = this.calculateTestCoverageRisk(files);
        
        // 4. File Impact Risk (0-15 points)
        risk.breakdown.fileImpact = this.calculateFileImpactRisk(files);
        
        // 5. Critical Issues Risk (0-10 points)
        risk.breakdown.criticalIssues = this.calculateCriticalIssuesRisk(comments);

        // Calculate overall risk
        risk.overall = Object.values(risk.breakdown).reduce((sum, score) => sum + score, 0);
        
        // Determine risk level
        if (risk.overall >= 80) risk.level = 'CRITICAL';
        else if (risk.overall >= 60) risk.level = 'HIGH';
        else if (risk.overall >= 40) risk.level = 'MEDIUM';
        else risk.level = 'LOW';

        // Generate recommendations
        risk.recommendations = this.generateRecommendations(risk);

        return risk;
    }

    calculateComplexityRisk(files) {
        let complexityScore = 0;
        let totalLines = 0;
        let totalFiles = files.length;

        files.forEach(file => {
            const lines = file.content ? file.content.split('\n').length : 0;
            totalLines += lines;
            
            // Large files increase complexity
            if (lines > 500) complexityScore += 8;
            else if (lines > 200) complexityScore += 4;
            else if (lines > 100) complexityScore += 2;
        });

        // Many files touched increases complexity
        if (totalFiles > 10) complexityScore += 10;
        else if (totalFiles > 5) complexityScore += 5;
        else if (totalFiles > 2) complexityScore += 2;

        return Math.min(complexityScore, 25);
    }

    calculateSecurityRisk(comments) {
        let securityScore = 0;
        const securityKeywords = [
            'sql injection', 'xss', 'csrf', 'authentication', 'authorization',
            'password', 'token', 'encryption', 'vulnerability', 'security'
        ];

        comments.forEach(comment => {
            const text = comment.comment.toLowerCase();
            securityKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    if (comment.priority === 'critical') securityScore += 10;
                    else if (comment.priority === 'high') securityScore += 6;
                    else securityScore += 3;
                }
            });
        });

        return Math.min(securityScore, 30);
    }

    calculateTestCoverageRisk(files) {
        const testFiles = files.filter(f => 
            f.path && (f.path.includes('test') || f.path.includes('spec') || f.path.endsWith('.test.js'))
        );
        const codeFiles = files.filter(f => 
            f.path && !f.path.includes('test') && !f.path.includes('spec') && 
            (f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.py'))
        );

        if (codeFiles.length === 0) return 0;
        
        const testRatio = testFiles.length / codeFiles.length;
        
        if (testRatio === 0) return 20; // No tests = max risk
        if (testRatio < 0.3) return 15;  // Low test coverage
        if (testRatio < 0.7) return 8;   // Moderate coverage
        return 2; // Good coverage
    }

    calculateFileImpactRisk(files) {
        let impactScore = 0;
        const criticalFiles = [
            'package.json', 'requirements.txt', 'Dockerfile', 'docker-compose.yml',
            'config', 'settings', 'env', 'database', 'migration', 'schema'
        ];

        files.forEach(file => {
            if (file.path) {
                const filePath = file.path.toLowerCase();
                criticalFiles.forEach(critical => {
                    if (filePath.includes(critical)) {
                        impactScore += 5;
                    }
                });
            }
        });

        return Math.min(impactScore, 15);
    }

    calculateCriticalIssuesRisk(comments) {
        const criticalCount = comments.filter(c => c.priority === 'critical').length;
        const highCount = comments.filter(c => c.priority === 'high').length;
        
        return Math.min((criticalCount * 4) + (highCount * 2), 10);
    }

    generateRecommendations(risk) {
        const recommendations = [];

        if (risk.breakdown.complexity > 15) {
            recommendations.push("🔍 Consider breaking this PR into smaller, focused changes");
        }
        
        if (risk.breakdown.security > 20) {
            recommendations.push("🛡️ Security review required - potential vulnerabilities detected");
        }
        
        if (risk.breakdown.testCoverage > 15) {
            recommendations.push("✅ Add unit tests to cover the new/modified code");
        }
        
        if (risk.breakdown.fileImpact > 10) {
            recommendations.push("⚠️ Critical files modified - extra review attention needed");
        }
        
        if (risk.breakdown.criticalIssues > 6) {
            recommendations.push("🚨 Critical issues found - address before merge");
        }

        if (risk.overall > 80) {
            recommendations.push("🔴 HIGH RISK PR - Consider senior developer review");
        }

        return recommendations;
    }

    /**
     * Generate risk report HTML/Markdown
     */
    generateRiskReport(risk, prId) {
        const riskEmoji = {
            'CRITICAL': '🔴',
            'HIGH': '🟠', 
            'MEDIUM': '🟡',
            'LOW': '🟢'
        };

        return `
## 📊 PR Risk Assessment - ${prId}

### ${riskEmoji[risk.level]} Overall Risk: **${risk.level}** (${risk.overall}/100)

#### 📈 Risk Breakdown:
- **Complexity**: ${risk.breakdown.complexity}/25 ${this.getRiskBar(risk.breakdown.complexity, 25)}
- **Security**: ${risk.breakdown.security}/30 ${this.getRiskBar(risk.breakdown.security, 30)}
- **Test Coverage**: ${risk.breakdown.testCoverage}/20 ${this.getRiskBar(risk.breakdown.testCoverage, 20)}
- **File Impact**: ${risk.breakdown.fileImpact}/15 ${this.getRiskBar(risk.breakdown.fileImpact, 15)}
- **Critical Issues**: ${risk.breakdown.criticalIssues}/10 ${this.getRiskBar(risk.breakdown.criticalIssues, 10)}

#### 💡 Recommendations:
${risk.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Generated by AI PR Risk Analyzer*
        `;
    }

    getRiskBar(score, max) {
        const percentage = (score / max) * 100;
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '🔴'.repeat(filled) + '⚪'.repeat(empty);
    }
}

module.exports = PRRiskAnalyzer;
