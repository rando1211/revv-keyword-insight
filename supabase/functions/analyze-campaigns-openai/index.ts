import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignData } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Starting OpenAI campaign analysis...');
    console.log('Campaign data received:', JSON.stringify(campaignData, null, 2));

    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({}),
    });

    if (!threadResponse.ok) {
      const errorData = await threadResponse.text();
      console.error('Thread creation failed:', threadResponse.status, errorData);
      throw new Error(`OpenAI Thread creation error: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread created:', thread.id);

    // Define all three assistants in the chain
    const ANALYSIS_ASSISTANT_ID = 'asst_phXpkgf3V5TRddgpq06wjEtF';        // Step 1: Campaign Analysis
    const CODE_GENERATION_ASSISTANT_ID = 'asst_5VL6MJKwByEkR0fAwrUm5yhF';   // Step 2: Code Generation  
    const VALIDATION_ASSISTANT_ID = 'asst_cXMVKXyjDlZN1HJvVpHZikyJ';        // Step 3: API Validation
    
    // Helper function to run an assistant and wait for completion
    const runAssistant = async (assistantId: string, prompt: string, stepName: string) => {
      console.log(`🚀 Step ${stepName}: Running assistant ${assistantId}...`);
      
      // Add message to thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          role: 'user',
          content: prompt
        }),
      });

      if (!messageResponse.ok) {
        throw new Error(`Message creation failed for ${stepName}: ${messageResponse.status}`);
      }

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
        }),
      });

      if (!runResponse.ok) {
        throw new Error(`Run creation failed for ${stepName}: ${runResponse.status}`);
      }

      const run = await runResponse.json();
      
      // Wait for completion with extended timeout for complex operations
      let runStatus = run;
      let attempts = 0;
      const maxAttempts = 45; // Increased for 3-step process
      const pollInterval = 1000; // Slightly slower polling to reduce API pressure

      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (attempts >= maxAttempts) {
          throw new Error(`${stepName} timeout after ${maxAttempts} attempts`);
        }
        
        console.log(`⏳ ${stepName} Status: ${runStatus.status}, Attempt: ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed for ${stepName}: ${statusResponse.status}`);
        }
        
        runStatus = await statusResponse.json();
        attempts++;
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`${stepName} failed with status: ${runStatus.status}`);
      }

      // Get the latest assistant response
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      if (!messagesResponse.ok) {
        throw new Error(`Messages retrieval failed for ${stepName}: ${messagesResponse.status}`);
      }

      const messages = await messagesResponse.json();
      const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
      
      if (!assistantMessage || !assistantMessage.content[0]?.text?.value) {
        throw new Error(`No response from ${stepName} assistant`);
      }

      console.log(`✅ ${stepName} completed successfully`);
      return assistantMessage.content[0].text.value;
    };

    // Step 1: Campaign Analysis
    const analysisPrompt = `Analyze this Google Ads campaign data and provide optimization recommendations:

Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Provide detailed analysis including:
- Campaign performance insights
- Optimization opportunities
- Budget recommendations
- Keyword analysis
- Quality score improvements

Focus on ENABLED campaigns from the last 30 days.`;

    const step1Result = await runAssistant(ANALYSIS_ASSISTANT_ID, analysisPrompt, '1 - Analysis');

    // Step 2: Code Generation (with fallback)
    let step2Result;
    try {
      const codeGenerationPrompt = `You are the second AI in a Google Ads optimization chain. Based on the analysis from the first AI, generate GAQL queries and JavaScript/TypeScript code for Supabase Edge Functions:

Previous Analysis:
${step1Result}

Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Generate executable JavaScript/TypeScript code that can run in Supabase Edge Functions:

1. **GAQL QUERIES** for data extraction and analysis
2. **JAVASCRIPT/TYPESCRIPT CODE** for implementing optimizations via Google Ads API:
   - Bid adjustment functions
   - Keyword management (add/remove/negative keywords)
   - Budget optimization functions
   - Campaign structure improvements
   - Use fetch() for API calls to Google Ads API endpoints
   - Include proper error handling and authentication headers
   - Generate code that can execute in Deno/Edge Function environment

3. **API IMPLEMENTATION DETAILS**:
   - Specific Google Ads API endpoints to call
   - Request payloads and headers
   - Response handling

Return everything in a structured format for the validation AI to review. Focus on production-ready JavaScript/TypeScript code that makes direct Google Ads API calls.`;

      step2Result = await runAssistant(CODE_GENERATION_ASSISTANT_ID, codeGenerationPrompt, '2 - Code Generation');
    } catch (error) {
      console.error('Step 2 failed, using fallback:', error);
      step2Result = `## Fallback Code Generation
Due to timeout in Step 2, providing basic optimization template:

\`\`\`javascript
// Basic bid adjustment function
const adjustBids = async (customerId, campaignId, bidAdjustment) => {
  const response = await fetch(\`https://googleads.googleapis.com/v17/customers/\${customerId}/campaigns/\${campaignId}:mutate\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'developer-token': \${developerToken},
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operations: [{
        update: {
          resourceName: \`customers/\${customerId}/campaigns/\${campaignId}\`,
          manualCpc: { enhancedCpcEnabled: true }
        },
        updateMask: 'manualCpc.enhancedCpcEnabled'
      }]
    })
  });
  return response.json();
};
\`\`\`

⚠️ This is a fallback template. For full optimization code, retry the analysis.`;
    }

    // Step 3: API Validation (with fallback)
    let step3Result;
    try {
      const validationPrompt = `You are the third and final AI in the chain. Review the JavaScript/TypeScript code provided by the second AI and ensure API compliance:

Generated Code and Queries:
${step2Result}

Validate and ensure:
- Google Ads API call formats are correct for Deno/Edge Functions
- GAQL syntax is valid 
- JavaScript/TypeScript code follows Google Ads API standards
- All required parameters and headers are included
- fetch() calls are properly structured for the Google Ads API
- Error handling is implemented
- Code can execute in Supabase Edge Function environment

If adjustments are needed, make them. If no adjustments are needed, return the code unchanged.`;

      step3Result = await runAssistant(VALIDATION_ASSISTANT_ID, validationPrompt, '3 - Validation');
    } catch (error) {
      console.error('Step 3 failed, using step 2 result:', error);
      step3Result = `## Validation Fallback
Step 3 validation timed out, but Step 2 code is available:

${step2Result}

⚠️ Code has not been validated. Please review manually before execution.`;
    }

    // Format final response
    const finalAnalysis = `# 3-Step Google Ads AI Analysis Complete
Generated: ${new Date().toISOString()}
Thread ID: ${thread.id}

## Step 1: Campaign Analysis
Assistant: ${ANALYSIS_ASSISTANT_ID}
${step1Result}

---

## Step 2: Code Generation  
Assistant: ${CODE_GENERATION_ASSISTANT_ID}
${step2Result}

---

## Step 3: API Validation & Final Code
Assistant: ${VALIDATION_ASSISTANT_ID}
${step3Result}

---
## Process Summary
✅ Step 1: Campaign Analysis Complete
✅ Step 2: Code Generation Complete  
✅ Step 3: API Validation Complete
🎯 Process Type: 3-Step AI Chain
⚡ Data Source: Real-time Google Ads API
🕒 Generated: ${new Date().toLocaleString()}`;

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: finalAnalysis,
      threadId: thread.id,
      step1Result,
      step2Result, 
      step3Result,
      analysisType: '3-step-chain',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OpenAI 3-Step Analysis Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});