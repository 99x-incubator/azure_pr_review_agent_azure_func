# Azure Function for PR Review with AI Suggestions 🤖

Automatically review pull requests in Azure DevOps using AI-powered code analysis. This Azure Function integrates with Azure DevOps to provide intelligent code reviews, adding comments directly to your PRs and optionally creating improvement PRs with suggested fixes.

## 🔄 How It Works

1. When a PR is created or updated in Azure DevOps, a webhook event is triggered
2. The Azure Function receives the webhook payload and validates it
3. The function checks if the PR is eligible for review (not a draft, not AI-generated)
4. The function loads the review guidelines from the specified source
5. The function initializes the selected AI model based on the MODEL_TYPE setting
6. For each changed file in the PR:
   - The function retrieves the old and new content
   - The AI model analyzes the changes and generates comments
   - Comments are added to the PR at specific line numbers
7. If corrections are available and CREATE_NEW_PR is true:
   - A new branch is created based on the source branch
   - The corrected files are committed to the new branch
   - A new PR is created with the AI-suggested improvements

<div align="center">
  <img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/PR%20Review%20Process%20Diagram.png" alt="PR Review Process Diagram" width="700">
</div>

## ✨ Features

- 🔄 Automatic triggering on Azure DevOps PR webhook events
- 🧠 AI-powered code analysis (supports multiple AI models)
- 💬 Contextual comments added directly to PR lines
- 🛠️ Optional creation of improvement PRs with AI-suggested fixes
- 📝 Customizable review guidelines
- 🔀 Support for multiple files in a single PR
- 🤖 Configurable AI model selection via environment variables

## 📋 Prerequisites

- Azure account with Function App creation permissions
- Azure DevOps project with admin access
- At least one AI API key (Azure OpenAI, OpenAI, or Google Gemini)
- Code review guidelines document

## 🚀 Setup Guide

### 1. Create a resource group

##### **Using Azure Portal**
  - Azure Portal > Resource Groups > Create
<table>
  <tr>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Resource%20Groups.png" alt="image" width="450"></td>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Create%20Resource%20Group.png" alt="image" width="450"></td>
  </tr>
</table>


##### **Using CLI**
  - ```bash
    azure login
    ```
  - ```bash
    az group create --name <RESOURCE_GROUP_NAME> --location <REGION>
    ```

### 2. Create an Azure Function App

##### **Using Azure Portal**
- Use Node.js runtime stack
<table>
  <tr>
    <td><img width="600" alt="image" src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Create%20Function%20App.png" /></td>
    <td><img width="575" alt="image" src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Node.js%20runtime%20stack.png" /></td>
  </tr>
</table>

- Enable Azure OpenAI when creating the function app
  
- <img src="https://github.com/user-attachments/assets/d260ff78-b243-456c-83a0-e23ba2980ded" alt="image" width="600">



##### **Using CLI**

```bash
az functionapp create --resource-group <RESOURCE_GROUP_NAME> --consumption-plan-location <REGION> --runtime node --functions-version 4 --name <APP_NAME> --storage-account <STORAGE_NAME>
```

### 2. Deploy the Function

##### **Using Visual Studio Code**
  - Open the project in VS Code
  - Install the Azure Functions extension
  - Sign in to your Azure account
  - Open Command Pallete (```Ctrl```+```Shift```+```P``` on Windows or ```Shift```+```⌘```+```P``` on mac) and select "Deploy to Function App"
  - Select your target Function App

##### **Using CLI**
      
```bash
cd azure-function-pr-review
npm install
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

### 3. Create Azure OpenAI and Deploy a Model
<table>
  <tr>
<td><img width="612" alt="image" src="https://github.com/user-attachments/assets/78bc5cf3-32ab-4884-91e2-5ab9f50be399" /></td>
<td><img width="556" alt="image" src="https://github.com/user-attachments/assets/7ef3554e-f52c-40c6-b07c-392dde93a10c" /></td>
    </tr>
  <tr>
<td><img width="731" alt="image" src="https://github.com/user-attachments/assets/eb8b3114-4ad5-40c9-88a6-34f51ce3f03f" /></td>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/ad57f5aa-d9e5-434f-802d-b916f1d42598" /></td>
    </tr>
  <tr>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/783a3822-fbc6-4aa1-94a9-53bbbb0cfae9" /></td>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/300a0051-dd5f-44d6-9ae2-4bcf91c16496" /></td>
</tr>
</table>

**If you want to deploy a different model in Azure,**
- Go to `AI Foundry`
- Create an `Azure AI Hub`(Keep in mind that you have to make sure the region you are selecting is supporting the model that you are going to deploy. E.g.:As of February 2025, the DeepSeek R1 model is available in East US, East US 2, West US, West US 3, South Central US, and North Central US regions only)
- Go to the resource and launch `Azure AI Foundry`
- Create a project
- Deploy the model you want 


### 4. Configure Application Settings ⚙️

In the Azure Portal, navigate to your Function App > Configuration and add the following application settings:

| Environmental Variable Name | Description |
|-------------|-------------|
| AZURE_PAT | Personal Access Token for Azure DevOps with Code (Read & Write) permissions |
| AZURE_REPO | Default repository name (optional if provided in webhook) |
| INSTRUCTION_SOURCE | Path or URL to review guidelines file |
| CREATE_NEW_PR | Set to "true" to create new PRs with AI suggestions |
| **MODEL_TYPE** | **AI model to use: "azure", "openai", "gemini", "deepseek", "anthropic", or "groq"** |
| GEMINI_API_KEY | Google Gemini API key (required if MODEL_TYPE is "gemini") |
| OPENAI_API_KEY | OpenAI API key (required if MODEL_TYPE is "openai") |
| AZURE_OPENAI_API_KEY | Azure OpenAI API key (required if MODEL_TYPE is "azure") |
| AZURE_OPENAI_API_INSTANCE_NAME | Azure OpenAI instance name (required if MODEL_TYPE is "azure") |
| AZURE_OPENAI_API_DEPLOYMENT_NAME | Azure OpenAI deployment name (required if MODEL_TYPE is "azure") |
| AZURE_OPENAI_API_VERSION | Azure OpenAI API version (defaults to "2023-12-01-preview") |
| DEEPSEEK_API_KEY | DeepSeek API key (required if MODEL_TYPE is "deepseek" or "deepseek-r1") |
| ANTHROPIC_API_KEY | Anthropic API key (required if MODEL_TYPE is "anthropic" or "claude") |
| GROQ_API_KEY | Groq API key (required if MODEL_TYPE is "groq") |


### 5. Configure Azure DevOps Webhook

1. Go to **Project Settings > Service Hooks**
2. Create new webhook with:
   - **Trigger**: Pull request created
   - **URL**: 
     - Using VSCode: ```ctrl```+```shift```+```P``` -> Azure Functions: Copy Function URL
     - Using CLI: Replace "==" in the end of the URL with "%3D%3D" after copying it before pasting in the webhook (This is happening because URL encoding)
       ```bash
       FOR /F "delims=" %a IN ('az functionapp function show --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP> --function-name PRReviewTrigger --query invokeUrlTemplate -o tsv') DO SET "URL=%a"
        FOR /F "delims=" %b IN ('az functionapp function keys list --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP> --function-name PRReviewTrigger --query default -o tsv') DO SET "KEY=%b"
        ECHO %URL%?code=%KEY%
       ```
<table>
  <tr>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Project%20Settings.png" alt="Image 1" width="400px" /></td>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Service%20Hooks.png" alt="Image 2" width="400px" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Create%20Subscription.png" alt="Image 3" width="400px" /></td>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Next.png" alt="Image 4" width="400px" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Pull%20Request%20Created.png" alt="Image 5" width="400px" /></td>
    <td><img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/Paste%20URL.png" alt="Image 6" width="400px" /></td>
  </tr>
</table>




## 🧠 AI Model Selection

You can configure multiple API keys in your environment variables and switch between models by changing only the `MODEL_TYPE` setting. This allows you to:

- 🔄 Easily switch between different AI providers
- 💰 Optimize for cost by selecting the most economical option
- 🚀 Choose the model that performs best for your specific codebase
- 🔒 Have fallback options if one service is unavailable

**Below shown is a AI Models Comparison Table as of April 2025**
<img src="https://github.com/99x-incubator/azure_pr_review_agent_azure_func/blob/main/Assets/ModelComparison.png" alt="Image 7" width="1100px" />

##### Notes:
1. All prices are in USD and current as of April 2025
2. "Cached" refers to cached input pricing, which is typically lower than standard input pricing
3. Many providers offer batch processing with discounts (typically 25-50%)
4. Context length refers to the maximum number of tokens the model can process in a single request
5. Parameter sizes are not explicitly stated for many models, especially the newest ones
6. Deployment options (global, regional) may affect pricing, especially for Azure OpenAI
7. Some models offer time-based discounts (e.g., DeepSeek's off-peak pricing)
8. Actual performance may vary based on specific use cases and implementation



##### 📚 Resources

- Google Gemini: [cloud.google.com/vertex-ai/generative-ai/pricing](http://cloud.google.com/vertex-ai/generative-ai/pricing)
- OpenAI models: [openai.com/api/pricing](http://openai.com/api/pricing)
- OpenAI o3-mini: [apidog.com/blog/openai-o3-mini-api-pricing](http://apidog.com/blog/openai-o3-mini-api-pricing)
- GPT-4.5: [apidog.com/blog/gpt-4-5-api-price](http://apidog.com/blog/gpt-4-5-api-price)
- GPT-4o: [dev.to/foxinfotech/how-much-does-gpt-4o-cost-per-month-4l17](http://dev.to/foxinfotech/how-much-does-gpt-4o-cost-per-month-4l17)
- Azure OpenAI: [azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service](http://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service)
- Claude models: [anthropic.com/claude/sonnet](http://anthropic.com/claude/sonnet)
- Claude Haiku pricing: [techcrunch.com/2024/11/04/anthropic-hikes-the-price-of-its-haiku-model](http://techcrunch.com/2024/11/04/anthropic-hikes--the-price-of-its-haiku-model)
- DeepSeek models: [api-docs.deepseek.com/quick_start/pricing](http://api-docs.deepseek.com/quick_start/pricing)
- DeepSeek R1: [deepseek-r1.com/pricing](http://deepseek-r1.com/pricing)
- Groq pricing: [groq.com/pricing](http://groq.com/pricing)
- GroqCloud models: [groq.com/groqcloud-now-offers-qwen-2-5-32b-and-deepseek-r1-distill-qwen-32b](http://groq.com/groqcloud-now-offers-qwen-2-5-32b-and-deepseek-r1-distill-qwen-32b)
