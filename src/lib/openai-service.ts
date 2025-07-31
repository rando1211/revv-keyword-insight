// OpenAI Integration for REVV Marketing
// Your API Key: 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

export const OPENAI_CONFIG = {
  apiKey: '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',
  baseURL: 'https://api.openai.com/v1',
  organization: null, // Add if you have an org ID
  project: null, // Add if you have a project ID
};

// Campaign Analysis Assistant
export const generateCampaignAnalysis = async (campaignData: any) => {
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
            content: `You are a Google Ads optimization expert for REVV Marketing. 
            Analyze campaign data and provide specific, actionable optimization recommendations.
            Focus on improving CTR, conversion rates, and cost efficiency.
            Format recommendations with priority levels (High/Medium/Low) and estimated impact.`
          },
          {
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
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
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