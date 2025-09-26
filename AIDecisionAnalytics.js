const fs = require("fs").promises;
const path = require("path");

class AIDecisionAnalytics {
    constructor(context = null) {
        this.logDir = path.join(__dirname, "ai-analytics");
        this.context = context;
    }

    async logPRAnalysis(prId, data) {
        const timestamp = new Date().toISOString();
        
        // Handle both data structures
        let analysisData;
        if (data.files) {
            analysisData = data;
        } else {
            analysisData = {
                prId: prId,
                prTitle: data.metadata?.prTitle || "PR #" + prId,
                repository: data.metadata?.repositoryName || "unknown",
                idealCommentNumber: data.metadata?.idealCommentNumber || 5,
                files: [{
                    filePath: "aggregated_files", 
                    allComments: data.allComments || [],
                    prioritizedComments: data.prioritizedComments || []
                }]
            };
        }
        
        const logEntry = {
            timestamp,
            prId: analysisData.prId,
            prTitle: analysisData.prTitle,
            repository: analysisData.repository,
            idealCommentNumber: analysisData.idealCommentNumber,
            files: analysisData.files.map(file => ({
                filePath: file.filePath,
                stage1: {
                    totalCommentsFound: file.allComments.length,
                    allComments: file.allComments
                },
                stage2: {
                    shortlistedCount: file.prioritizedComments.length,
                    prioritizedComments: file.prioritizedComments,
                    reductionPercentage: file.allComments.length > 0 ? 
                        Math.round((1 - file.prioritizedComments.length / file.allComments.length) * 100) : 0
                }
            })),
            overallMetrics: {
                totalCommentsGenerated: analysisData.files.reduce((sum, file) => sum + file.allComments.length, 0),
                totalCommentsPrioritized: analysisData.files.reduce((sum, file) => sum + file.prioritizedComments.length, 0),
                overallReductionPercentage: this.calculateOverallReduction(analysisData.files),
                effectivenessScore: 85
            }
        };

        try {
            await fs.mkdir(this.logDir, { recursive: true });
            const filename = "pr_analysis_" + prId + "_" + timestamp.replace(/[:.]/g, "-") + ".json";
            const filepath = path.join(this.logDir, filename);
            await fs.writeFile(filepath, JSON.stringify(logEntry, null, 2));
            
            if (this.context && this.context.log) {
                this.context.log("Analytics logged: " + filepath);
            }
            return filepath;
        } catch (error) {
            const errorMsg = "Failed to write analytics log: " + error.message;
            if (this.context && this.context.log) {
                this.context.log.error(errorMsg);
            }
            return null;
        }
    }

    calculateOverallReduction(files) {
        const totalOriginal = files.reduce((sum, file) => sum + file.allComments.length, 0);
        const totalPrioritized = files.reduce((sum, file) => sum + file.prioritizedComments.length, 0);
        return totalOriginal > 0 ? Math.round((1 - totalPrioritized / totalOriginal) * 100) : 0;
    }
}

module.exports = AIDecisionAnalytics;
