const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { default: axios } = require('axios');
const azdev = require('azure-devops-node-api');
const GitApi = require('azure-devops-node-api/GitApi');
const GitInterfaces = require('azure-devops-node-api/interfaces/GitInterfaces');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { AzureChatOpenAI, ChatOpenAI } = require('@langchain/openai');
// Add imports for new models
const { ChatDeepSeek } = require('@langchain/deepseek');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGroq } = require('@langchain/groq');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { CheerioWebBaseLoader } = require('@langchain/community/document_loaders/web/cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv/config');
 
// Interfaces for AI comments and file corrections
/**
 * @typedef {Object} AIComment
 * @property {number} lineNumber - Line number for the comment
 * @property {string} comment - The comment text
 */
 
/**
 * @typedef {Object} AICommentResult
 * @property {AIComment[]} comments - Array of comments
 * @property {string} newContent - New content with suggested changes
 */
 
/**
 * @typedef {Object} FileCorrection
 * @property {string} path - File path
 * @property {string} originalContent - Original file content
 * @property {string} correctedContent - Corrected file content
 */
 
/**
 * Azure Function for PR review with AI suggestions
 * @param {Object} context - Azure Function context
 * @param {Object} req - HTTP request
 */
module.exports = async function (context, req) {
    context.log('PR Review Function triggered by webhook');  
   
    try {
        // Validate webhook payload
        if (!req.body) {
            context.res = {
                status: 400,
                body: "Invalid webhook payload: Body is empty"
            };
            return;
        }        
 
        // Check if this is a pull request event
        const eventType = req.body.eventType;
        if (!eventType) {
            context.log('Missing eventType in payload');
            context.res = {
                status: 400,
                body: "Missing eventType in payload"
            };
            return;
        }
 
        if (!eventType.startsWith('git.pullrequest.')) {
            context.log(`Ignoring non-PR event: ${eventType}`);
            context.res = {
                status: 200,
                body: `Ignoring non-PR event: ${eventType}`
            };
            return;
        }
 
        // Extract PR information from the webhook payload
        const resource = req.body.resource;
        if (!resource || !resource.pullRequestId) {
            context.log('Missing PR information in payload');
            context.res = {
                status: 400,
                body: "Missing PR information in payload"
            };
            return;
        }
 
        const prTitle = resource.title || '';
        if (prTitle.toLowerCase().startsWith('ai:') ||
            prTitle.includes('[AI Suggested Fixes]')) {
            context.log(`Skipping AI-generated PR: ${prTitle}`);
            context.res = {
                status: 200,
                body: "Skipped AI-generated PR"
            };
            return;
        }
 
        const repository = resource?.repository;
        const remoteUrl = repository.remoteUrl;
        let orgFromUrl;
        const url = new URL(remoteUrl);
        const pathParts = url.pathname.split('/').filter(p => p);
       
        // Expected URL format: /{organization}/{project}/_git/{repo}
        if (pathParts.length < 3) {
            throw new Error("URL path doesn't contain enough segments");
        }
        orgFromUrl = pathParts[0]; // First non-empty path segment is organization
 
        // Get configuration from environment variables
        const config = {
            PAT: process.env.AZURE_PAT,
            ORG: orgFromUrl,
            PROJECT: resource.repository?.project?.name || process.env.AZURE_PROJECT,
            REPO_NAME: resource.repository?.name || process.env.AZURE_REPO,
            PR_ID: resource.pullRequestId,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
            AZURE_OPENAI_API_INSTANCE_NAME: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            AZURE_OPENAI_API_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview",
            // Add new API keys for additional models
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            GROQ_API_KEY: process.env.GROQ_API_KEY,
            INSTRUCTION_SOURCE: process.env.INSTRUCTION_SOURCE,
            MODEL_TYPE: process.env.MODEL_TYPE,
            CREATE_NEW_PR: process.env.CREATE_NEW_PR ?
                process.env.CREATE_NEW_PR.toLowerCase() === 'true' : false
        };
 
 
        // Validate required configuration
        const requiredVars = ['AZURE_PAT', 'INSTRUCTION_SOURCE'];
        const missingVars = [];
       
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }
       
        if (missingVars.length > 0) {
            const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
            context.log.error(errorMsg);
            context.res = {
                status: 500,
                body: errorMsg
            };
            return;
        }
       
 
        // Load review guidelines
        let guidelines;
        try {
            guidelines = await loadGuidelines(config.INSTRUCTION_SOURCE);
            context.log('Successfully loaded review guidelines');
        } catch (error) {
            const errorMsg = `Failed to load review guidelines: ${error.message || error}`;
            context.log.error(errorMsg);
            context.res = {
                status: 500,
                body: errorMsg
            };
            return;
        }
       
        // Process the PR
        const result = await processPullRequest(context, config, guidelines);        
       
    } catch (error) {
        const errorMsg = `PR review failed: ${error.message || error}`;
        context.log.error(errorMsg);
        context.log.error('Stack trace:', error.stack);
        context.res = {
            status: 500,
            body: errorMsg
        };
    }
};
 
/**
 * Initialize AI model based on available API keys
 * @param {Object} config - Configuration object
 * @returns {Object} - Initialized AI model
 */
function initializeAIModel(config,context) {
    const modelType = config.MODEL_TYPE.toLowerCase();
    context.log(`Initializing AI model with type: ${modelType}`);
   
    switch (modelType) {
        case 'azure':
            if (!config.AZURE_OPENAI_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'azure' but AZURE_OPENAI_API_KEY is missing");
            }
            return new AzureChatOpenAI({
                azureOpenAIApiKey: config.AZURE_OPENAI_API_KEY,
                azureOpenAIApiInstanceName: config.AZURE_OPENAI_API_INSTANCE_NAME,
                azureOpenAIApiDeploymentName: config.AZURE_OPENAI_API_DEPLOYMENT_NAME,
                azureOpenAIApiVersion: config.AZURE_OPENAI_API_VERSION,
                modelName: "gpt-4",
                temperature: 0.7,
                maxTokens: 4096,
            });
 
        case 'openai':
            if (!config.OPENAI_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'openai' but OPENAI_API_KEY is missing");
            }
            return new ChatOpenAI({
                openAIApiKey: config.OPENAI_API_KEY,
                modelName: "gpt-4",
                temperature: 0.7,
                maxTokens: 4096,
            });
 
        case 'gemini':
            if (!config.GEMINI_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'gemini' but GEMINI_API_KEY is missing");
            }
            return new ChatGoogleGenerativeAI({
                modelName: "gemini-2.0-flash",
                apiKey: config.GEMINI_API_KEY,
                temperature: 0.7,
                maxOutputTokens: 8192,
            });      
 
        // DeepSeek R1 case
        case 'deepseek':
        case 'deepseek-r1':
            if (!config.DEEPSEEK_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'deepseek' but DEEPSEEK_API_KEY is missing");
            }
            context.log("Using DeepSeek-R1 model via Azure Inference Client");
            const modelClient = new ModelClient(
                "https://aimodeldeepsee3528484348.services.ai.azure.com/models",
                new AzureKeyCredential(config.DEEPSEEK_API_KEY)
            );
            // Add a type identifier to the model
            modelClient.modelType = 'deepseek';
            context.log(`ModelClient instance created: ${modelClient ? 'yes' : 'no'}`);
            return modelClient;
           
        // Anthropic Claude case
        case 'anthropic':
        case 'claude':
            if (!config.ANTHROPIC_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'anthropic' but ANTHROPIC_API_KEY is missing");
            }
            return new ChatAnthropic({
                anthropicApiKey: config.ANTHROPIC_API_KEY,
                modelName: "claude-3-5-sonnet-20240620",
                temperature: 0.7,
                maxTokens: 8192,
            });
           
        // Groq case
        case 'groq':
            if (!config.GROQ_API_KEY) {
                throw new Error("MODEL_TYPE is set to 'groq' but GROQ_API_KEY is missing");
            }
            return new ChatGroq({
                apiKey: config.GROQ_API_KEY,
                modelName: "llama-3.3-70b-versatile",
                temperature: 0.7,
                maxTokens: 8192,
                maxRetries: 2
            });
 
        default:
            throw new Error(`Invalid MODEL_TYPE: ${config.MODEL_TYPE}. Valid values: azure, openai, gemini, deepseek, anthropic, groq`);
    }
}
 
/**
 * Check if AI comments already exist for this PR
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {number} prId - PR ID
 * @param {string} project - Project name
 * @returns {Promise<boolean>} - Whether AI comments already exist
 */
async function hasExistingAIComments(gitApi, repoId, prId, project) {
    try {
        // Get all threads for the PR
        const threads = await gitApi.getThreads(repoId, prId, project);
       
        // Check if any thread contains an AI comment
        for (const thread of threads) {
            for (const comment of thread.comments || []) {
                if (comment.content && comment.content.includes('[AI Review]')) {
                    return true;
                }
            }
        }
       
        return false;
    } catch (error) {
        console.error('Error checking for existing AI comments:', error);
        // If we can't check, assume no comments to be safe
        return false;
    }
}
 
/**
 * Process a pull request
 * @param {Object} context - Azure Function context
 * @param {Object} config - Configuration object
 * @param {string} guidelines - Review guidelines
 * @returns {Promise<Object>} - Processing result
 */
async function processPullRequest(context, config, guidelines) {
    // Initialize AI model
    const model = initializeAIModel(config,context);
    const corrections = [];
 
    if (!model) {
        throw new Error("Failed to initialize AI model. Check API key configuration.");
    }
   
    // 1. Authenticate with Azure DevOps
    const authHandler = azdev.getPersonalAccessTokenHandler(config.PAT);
    const connection = new azdev.WebApi(`https://dev.azure.com/${config.ORG}`, authHandler);
    const gitApi = await connection.getGitApi();
 
    // 2. Get target repository
    const repos = await gitApi.getRepositories(config.PROJECT);
    const repo = repos.find(r => r.name === config.REPO_NAME);
    if (!repo?.id) throw new Error("Repository not found");
 
    // 3. Get target pull request
    const targetPR = await gitApi.getPullRequest(repo.id, config.PR_ID, config.PROJECT);
   
    // Check for draft PR
    if (targetPR.isDraft) {
        context.log("Skipping draft pull request");
        return { message: "Skipped draft pull request" };
    }
 
    if (!targetPR?.pullRequestId || !targetPR.sourceRefName || !targetPR.targetRefName) {
        throw new Error("PR not found or missing ref names");
    }
 
    //Check if AI comments already exist for this PR
    const hasComments = await hasExistingAIComments(gitApi, repo.id, targetPR.pullRequestId, config.PROJECT);
    if (hasComments) {
        context.log("AI comments already exist for this PR, skipping");
        return { message: "AI comments already exist for this PR, skipping" };
    }
 
    // 4. Get PR changes using iterations
    const iterations = await gitApi.getPullRequestIterations(repo.id, targetPR.pullRequestId, config.PROJECT);
    const latestIterationId = iterations[iterations.length - 1]?.id;
    if (!latestIterationId) throw new Error("No iterations found");
   
    const prChanges = await gitApi.getPullRequestIterationChanges(
        repo.id,
        targetPR.pullRequestId,
        latestIterationId,
        config.PROJECT
    );
 
    // 5. Process each changed file
    // Use Promise.all to process all files in parallel but wait for all to complete
    const fileProcessingPromises = [];
   
    for (const change of prChanges.changeEntries || []) {
        const itemPath = change.item?.path;
        if (!itemPath || change.item?.isFolder) continue;
 
        // Create a promise for processing this file
        const filePromise = (async () => {
            // Get file content from both branches
            const [oldContent, newContent] = await Promise.all([
                getFileContent(gitApi, repo.id, itemPath, targetPR.targetRefName, config.PROJECT),
                getFileContent(gitApi, repo.id, itemPath, targetPR.sourceRefName, config.PROJECT)
            ]);
 
            // Generate AI comments
            context.log(`Generating comments for ${itemPath}`);
            const analysis = await generateComments(oldContent, newContent, itemPath, guidelines, model,context);
            context.log(`Generated ${analysis.comments.length} comments for ${itemPath}`);
           
            // Post comments to Azure DevOps
            for (const comment of analysis.comments) {
                await createCommentThread(
                    gitApi,
                    repo.id,
                    targetPR.pullRequestId,
                    comment.comment,
                    itemPath,
                    comment.lineNumber,
                    config.PROJECT
                );
            }
 
            // Update the correction collection
            if (analysis.newContent !== newContent && validateCorrection(newContent, analysis.newContent)) {
                corrections.push({
                    path: itemPath,
                    originalContent: newContent,
                    correctedContent: analysis.newContent
                });
            }
        })();
       
        fileProcessingPromises.push(filePromise);
    }
   
    // Wait for all file processing to complete
    await Promise.all(fileProcessingPromises);
 
    // Create a new PR with corrections if enabled
    if (corrections.length > 0) {
        if (config.CREATE_NEW_PR) {
          try {
            await createCorrectionPR(
                gitApi,
                repo.id,
                targetPR,
                corrections,
                config.PROJECT
            );
            context.log("Created new PR with AI-suggested changes");            
        } catch (prError) {
            context.log.error("PR creation failed but comments were posted:", prError.message);
        }
      }
    } else {
        context.log("No AI-suggested changes to apply.");        
    }
}
 
/**
 * Load review guidelines from a file or URL
 * @param {string} source - Source path or URL
 * @returns {Promise<string>} - Guidelines content
 */
async function loadGuidelines(source) {
    try {
        let loader;
       
        if (source.startsWith('http://') || source.startsWith('https://')) {
            loader = new CheerioWebBaseLoader(source);
        } else {
            // Resolve absolute path for local files
            const filePath = path.isAbsolute(source)
                ? source
                : path.join(process.cwd(), source);
            loader = new TextLoader(filePath);
        }
 
        const docs = await loader.load();
        return docs.map(doc => doc.pageContent).join('\n');
    } catch (error) {
        console.error('Failed to load guidelines:', error);
        throw new Error(`Failed to load review guidelines: ${error.message || error}`);
    }
}
 
/**
 * Get file content from a repository
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {string} path - File path
 * @param {string} ref - Git reference
 * @param {string} project - Project name
 * @returns {Promise<string>} - File content
 */
async function getFileContent(gitApi, repoId, path, ref, project) {
    try {
        const versionDescriptor = {
            versionType: GitInterfaces.GitVersionType.Branch,
            version: ref.replace("refs/heads/", "")
        };
       
        const stream = await gitApi.getItemContent(repoId, path, project, undefined, undefined, undefined, undefined, undefined, versionDescriptor);
        const content = await streamToString(stream);  
        return content;
    } catch (error) {
        console.error(`Error fetching ${path} from ${ref}:`, error instanceof Error ? error.message : error);
        throw new Error(`Failed to retrieve content for ${path}: ${error.message || error}`);
    }
}
 
 
/**
 * Convert a stream to string
 * @param {Object} stream - Readable stream
 * @returns {Promise<string>} - Stream content as string
 */
function streamToString(stream) {
    return new Promise((resolve, reject) => {
        let data = '';
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
    });
}
 
/**
 * Split content into lines
 * @param {string} content - Content to split
 * @returns {string[]} - Array of lines
 */
function splitLines(content) {
    return content.split(/\r?\n/);
}
 
/**
 * Add line numbers to content
 * @param {string} content - Content to number
 * @returns {string} - Numbered content
 */
function numberLines(content) {
    return splitLines(content)
        .map((line, index) => `${index + 1}: ${line}`)
        .join('\n');
}
 
/**
 * Generate AI comments for a file
 * @param {string} oldContent - Old file content
 * @param {string} newContent - New file content
 * @param {string} filePath - File path
 * @param {string} guidelines - Review guidelines
 * @param {Object} model - AI model
 * @returns {Promise<AICommentResult>} - AI comments and suggested content
 */
 
async function generateComments(oldContent, newContent, filePath, guidelines, model,context) {
    context.log(`Generating comments for file: ${filePath}`);
    context.log(`Model type: ${model?.constructor?.name || 'unknown'}`);
    context.log(`Model properties: ${JSON.stringify(Object.keys(model || {}))}`);
   
    // Check if model has the deepseek type identifier
    const isDeepSeekModel = model && model.modelType === 'deepseek';
   
    context.log(`Is DeepSeek model: ${isDeepSeekModel}`);
   
    if (oldContent === newContent) {
        context.log(`WARNING: Contents are identical for ${filePath}, skipping analysis`);
        return { comments: [], newContent: newContent };
    }
 
    const numberedOld = numberLines(oldContent);
    const numberedNew = numberLines(newContent);
    const newLines = splitLines(newContent);
 
    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI model request timed out after 240 seconds')), 240000);
    });
   
    context.log(`Starting analysis for ${filePath} using ${isDeepSeekModel ? 'DeepSeek' : 'other'} model`);
    try {
        if (isDeepSeekModel) {
            context.log(`[DeepSeek] Starting analysis for ${filePath}`);
            // DeepSeek-R1 via Azure Inference Client
            const messages = [{
                role: "system",
                content: `You are a senior code reviewer. Follow these guidelines:\n${guidelines}\n\nIMPORTANT: Do not include any thinking process or analysis in your response. Only provide the JSON response as specified.`
            }, {
                role: "user",
                content: `ANALYZE THESE CHANGES:
                - OLD VERSION (numbered):
                ${numberedOld}
           
                - NEW VERSION (numbered):
                ${numberedNew}
           
                INSTRUCTIONS:
                1. Only comment on changed lines
                2. Use EXACT line numbers from NEW VERSION
                3. Reference guidelines like: [Guideline X]
                4. Generate corrected version of the FULL FILE
                5. Maintain original code structure where possible
                6. If no changes are needed, add a comment indicating no changes are required
                7. DO NOT include any thinking process or analysis in your response
                8. ONLY provide the JSON response as specified below
 
                RESPONSE FORMAT (JSON):
                {
                    "comments": [{
                        "lineNumber": <ACTUAL_NEW_LINE_NUMBER>,
                        "comment": "[Guideline] - <TEXT>"
                    }],
                    "newContent": "<FULL_CORRECTED_CODE_WITHOUT_LINE_NUMBERS>"
                }
           
                EXAMPLE:
                {
                    "comments": [{
                        "lineNumber": 42,
                        "comment": "[Security 3.1] - Fix SQL injection risk"
                    }],
                    "newContent": "function safe() {\\n  // fixed code\\n}"
                }`
            }];
 
            context.log(`[DeepSeek] Sending request to model with ${messages[1].content.length} characters`);
            const deepseekPromise = model.path("/chat/completions").post({
                body: {
                    messages,
                    max_tokens: 32768,
                    temperature: 0.7,
                    model: "DeepSeek-R1",
                    response_format: { type: "json_object" }
                }
            });
            const response = await Promise.race([
                deepseekPromise,
                timeoutPromise
            ]);
            context.log(`[DeepSeek] Received response status: ${response.status}`);
            context.log(`[DeepSeek] Response body: ${JSON.stringify(response.body)}`);
 
            // if (response.status !== 200) {
            //     const errorMessage = response.body?.error?.message || 'Unknown error';
            //     context.log.error(`[DeepSeek] API error: ${errorMessage}`);
            //     throw new Error(`DeepSeek API error: ${errorMessage}`);
            // }
 
            const resultText = response.body.choices[0].message.content;
            context.log(`[DeepSeek] Received response content length: ${resultText?.length || 0}`);
           
            // Extract JSON from the response content - handle multiple formats
            let jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
            if (!jsonMatch) {
                // Try alternative format without code blocks
                jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    context.log.error(`[DeepSeek] No JSON found in response: ${resultText}`);
                    return { comments: [], newContent: newContent };
                }
            }
           
            try {
                // Only remove thinking process
                let jsonStr = jsonMatch[1].replace(/<think>[\s\S]*?<\/think>/g, '');
               
                const result = JSON.parse(jsonStr);
                context.log(`[DeepSeek] Successfully parsed JSON with ${result.comments?.length || 0} comments`);
               
                // Validate the result structure
                if (!Array.isArray(result.comments) || typeof result.newContent !== 'string') {
                    context.log.error(`[DeepSeek] Invalid result structure: ${JSON.stringify(result)}`);
                    return { comments: [], newContent: newContent };
                }
               
                return processResult(result, newLines);
            } catch (parseError) {
                context.log.error(`[DeepSeek] JSON parse error: ${parseError.message}`);
                return { comments: [], newContent: newContent };
            }          
        } else {
            // Log the prompt being sent to the AI model
            const promptTemplate = PromptTemplate.fromTemplate(`
                Follow these code review guidelines:
                {guidelines}
 
                ANALYZE THESE CHANGES:
                - OLD VERSION (numbered):
                {numberedOld}
 
                - NEW VERSION (numbered):
                {numberedNew}
 
                INSTRUCTIONS:
                1. Only comment on changed lines
                2. Use EXACT line numbers from NEW VERSION
                3. Reference guidelines like: [Guideline X]
                4. Generate corrected version of the FULL FILE
                5. Maintain original code structure where possible
                6. If no changes are needed, add a comment indicating no changes are required
                7. Respond ONLY with valid JSON. Do NOT include any markdown formatting or code blocks
 
                RESPONSE FORMAT (JSON):
                {{
                    "comments": [{{
                        "lineNumber": <ACTUAL_NEW_LINE_NUMBER>,
                        "comment": "[Guideline] - <TEXT>"
                    }}],
                    "newContent": "<FULL_CORRECTED_CODE_WITHOUT_LINE_NUMBERS>"
                }}
 
                EXAMPLE:
                {{
                    "comments": [{{
                        "lineNumber": 42,
                        "comment": "[Security 3.1] - Fix SQL injection risk"
                    }}],
                    "newContent": "function safe() {{\\n  // fixed code\\n}}"
                }}
            `);    
   
           
            const chain = promptTemplate.pipe(model).pipe(new JsonOutputParser());
            const result = await Promise.race([
                chain.invoke({
                    guidelines,
                    numberedOld,
                    numberedNew
                }),
                timeoutPromise
            ]);            
            return processResult(result, newLines);
        }
    } catch (error) {
        let errorMessage = 'AI analysis failed';
       
        // Handle specific error types
        if (error.message && error.message.includes('timed out')) {
            errorMessage = 'AI model request timed out - the service may be experiencing high load';
            console.error(`Timeout error for ${filePath}: The AI model request took too long to complete`);
        } else if (error.code === 'ETIMEDOUT' || (error.cause && error.cause.code === 'ETIMEDOUT')) {
            errorMessage = 'Network timeout connecting to AI service';
            console.error(`Network timeout for ${filePath}: Could not connect to the AI service`);
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused by AI service';
            console.error(`Connection refused for ${filePath}: The AI service refused the connection`);
        } else {
            console.error(`AI analysis error for ${filePath}:`, error);
        }      
               
        // Return empty result but don't fail the entire function
        return {
            comments: [],
            newContent: newContent,
            error: errorMessage};
    }
}
 
// Shared result processor
function processResult(result, newLines) {
    return {
        comments: result.comments
            .map(comment => ({
                lineNumber: Math.min(
                    Math.max(1, Number(comment.lineNumber)),
                    newLines.length
                ),
                comment: comment.comment
            }))
            .filter(comment =>
                comment.lineNumber > 0 &&
                comment.lineNumber <= newLines.length
            ),
        newContent: result.newContent
    };
}
 
 
/**
 * Create a comment thread on a PR
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {number} prId - PR ID
 * @param {string} commentText - Comment text
 * @param {string} filePath - File path
 * @param {number} lineNumber - Line number
 * @param {string} project - Project name
 */
async function createCommentThread(gitApi, repoId, prId, commentText, filePath, lineNumber, project) {
    const azureLine = Math.max(1, lineNumber);
   
    const thread = {
        comments: [{
            content: `[AI Review] ${commentText}`,
            parentCommentId: 0,
            commentType: GitInterfaces.CommentType.Text,
        }],
        status: GitInterfaces.CommentThreadStatus.Active,
        threadContext: {
            filePath: filePath,
            rightFileStart: { line: azureLine, offset: 1 },
            rightFileEnd: { line: azureLine, offset: 1 }
        }
    };
 
    await gitApi.createThread(thread, repoId, prId, project);
    console.log(`Added comment to ${filePath} line ${lineNumber}`);
}
 
/**
 * Create a new PR with corrections
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {Object} originalPR - Original PR
 * @param {FileCorrection[]} corrections - File corrections
 * @param {string} project - Project name
 */
async function createCorrectionPR(gitApi, repoId, originalPR, corrections, project) {
  try {
      // Create new branch name
      const sourceBranch = originalPR.sourceRefName.replace('refs/heads/', '');
      const newBranchName = `ai-fix/${sourceBranch}-${Date.now()}`;
      const newBranchRef = `refs/heads/${newBranchName}`;
 
      // Get latest commit from source branch
      const sourceBranchInfo = await gitApi.getBranch(repoId, sourceBranch, project);
      const baseCommitId = sourceBranchInfo.commit?.commitId;
      if (!baseCommitId) throw new Error("Couldn't get base commit");
 
      // Prepare changes PROPERLY
      const changes = corrections.map(correction => ({
          changeType: GitInterfaces.VersionControlChangeType.Edit,
          item: {
              path: correction.path,
              version: baseCommitId, // ADD THIS
              versionType: GitInterfaces.GitVersionType.Commit
          },
          newContent: {
              content: correction.correctedContent,
              contentType: GitInterfaces.ItemContentType.RawText
          }
      }));
 
      // Create push with PROPER COMMIT REFERENCE
      const push = {
          refUpdates: [{
              name: newBranchRef,
              oldObjectId: baseCommitId // USE ACTUAL COMMIT ID
          }],
          commits: [{
              comment: "AI-suggested code improvements based on review guidelines",
              changes: changes
          }],
          repository: { id: repoId } // ADD REPO REFERENCE
      };
 
      // Create the push FIRST
      const createdPush = await gitApi.createPush(push, repoId, project);
     
      // Create PR with PROPER RELATIONSHIP
      const newPR = {
          title: `[AI Suggested Fixes] ${originalPR.title}`,
          description: `Automated code improvements based on review guidelines\n\nOriginal PR: ${originalPR.url}`,
          sourceRefName: newBranchRef,
          targetRefName: originalPR.targetRefName,
          workItemRefs: [{ id: originalPR.pullRequestId }] // LINK TO ORIGINAL PR
      };
 
      const createdPR = await gitApi.createPullRequest(newPR, repoId, project);
      console.log(`Created new PR #${createdPR.pullRequestId} with AI-suggested fixes`);
      return createdPR;
  } catch (error) {
      console.log.error("Failed to create correction PR:", error.message);
      throw error; // PROPAGATE ERROR UPSTREAM
  }
}
 
/**
 * Validate a correction
 * @param {string} original - Original content
 * @param {string} corrected - Corrected content
 * @returns {boolean} - Whether the correction is valid
 */
function validateCorrection(original, corrected) {
    // Basic validation to prevent empty files
    if (corrected.trim().length === 0) return false;
   
    // More complex validations can be added here
    return true;
}