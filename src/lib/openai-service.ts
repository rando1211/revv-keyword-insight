// OpenAI Integration for REVV Marketing
// Your API Key: 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

export const OPENAI_CONFIG = {
  apiKey: 'sk-proj-Gr-r9ru8e61Nik-echAkap10JnzTDMk9r1VkYMGoxDq4paH1QHH0CszpXr_e0MCvtYn16mZVvT3BlbkFJXPzQJUg3GbJQc9IpKe0HgkSV7FJG_y1T1LV82MXqG-u9F7jXVHL03jCod5u4_-x9Dj0C_5sxYA',
  baseURL: 'https://api.openai.com/v1',
  organization: null, // Add if you have an org ID
  project: null, // Add if you have a project ID
};

// Assistant IDs from your OpenAI account
const ASSISTANTS = {
  CAMPAIGN_ANALYZER: 'asst_dUUTuhMdkCHSYjVnVFOjcF8w',
  AD_REVIEWER_DEV: 'asst_pUdfF3MJrLYHYWCtnYG83Wxs',
  OUTPUT_INSPECTOR: 'asst_cXMVKXyJDiZNrHvVpnZlkyJ',
  AD_TRANSLATOR: 'asst_5VL6MJKwByEkROtAwrUm5yhF',
  AD_REVIEWER_PROD: 'asst_pnXpkq3VSTBddgqp06wjETF'
};

// Campaign Analysis Assistant using Assistants API
export const generateCampaignAnalysis = async (campaignData: any) => {
  try {
    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({}),
    });

    if (!threadResponse.ok) {
      throw new Error(`OpenAI Thread creation error: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();

    // Add a message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: `Analyze this Google Ads campaign data and provide optimization recommendations:
        
        Campaign Data:
        ${JSON.stringify(campaignData, null, 2)}
        
        Please provide:
        1. Top 3 optimization recommendations
        2. Priority level for each (High/Medium/Low)
        3. Estimated impact percentage
        4. Confidence score (0-100%)
        5. Specific implementation steps`
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`OpenAI Message creation error: ${messageResponse.status}`);
    }

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: ASSISTANTS.CAMPAIGN_ANALYZER,
      }),
    });

    if (!runResponse.ok) {
      throw new Error(`OpenAI Run creation error: ${runResponse.status}`);
    }

    const run = await runResponse.json();

    // Wait for completion (simple polling)
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      
      runStatus = await statusResponse.json();
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (assistantMessage && assistantMessage.content[0]?.text?.value) {
      return assistantMessage.content[0].text.value;
    }

    throw new Error('No response from assistant');

  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    return 'Unable to generate AI analysis at this time.';
  }
};

// Code Generation Assistant
export const generateOptimizationCode = async (recommendation: string) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a Python/Google Ads API coding expert for REVV Marketing.
            Generate clean, production-ready Python scripts using the Google Ads API.
            Include proper error handling, logging, and comments.
            Use the google-ads library and follow best practices.`
          },
          {
            role: 'user',
            content: `Generate a Python script to implement this Google Ads optimization:
            
            Recommendation: ${recommendation}
            
            Requirements:
            - Use Google Ads API v18
            - Include proper authentication
            - Add error handling and logging
            - Make it production-ready
            - Add comments explaining each step`
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Code Generation Error:', error);
    return '# Unable to generate code at this time\n# Please check your OpenAI API connection';
  }
};

// Keyword Research Assistant
export const generateKeywordSuggestions = async (businessType: string, currentKeywords: string[]) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a keyword research expert for Google Ads campaigns.
            Suggest high-converting keywords based on business type and current performance.
            Focus on commercial intent and relevance.`
          },
          {
            role: 'user',
            content: `Business Type: ${businessType}
            Current Keywords: ${currentKeywords.join(', ')}
            
            Suggest 10 new high-converting keywords with:
            - Match type recommendations
            - Estimated search volume tier (High/Medium/Low)
            - Commercial intent score (1-10)
            - Suggested bid strategy`
          }
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Keyword Research Error:', error);
    return 'Unable to generate keyword suggestions at this time.';
  }
};

export default {
  generateCampaignAnalysis,
  generateOptimizationCode,
  generateKeywordSuggestions,
};