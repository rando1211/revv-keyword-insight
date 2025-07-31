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

    // Use the code generation assistant that creates GAQL and Python implementation code
    const CODE_GENERATION_ASSISTANT_ID = 'asst_5VL6MJKwByEkR0fAwrUm5yhF';
    
    // Prompt specifically for the code generation assistant
    const codeGenerationPrompt = `You are the second AI in a Google Ads optimization chain. Your role is to take campaign data and generate GAQL queries and Python code to implement optimization recommendations via the Google Ads API.

Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Based on this campaign data, please provide:

1. **GAQL QUERIES** for data extraction and analysis:
   - Performance queries for deeper insights
   - Keyword performance queries
   - Ad group analysis queries
   - Campaign structure queries

2. **PYTHON CODE** for implementing optimizations:
   - Bid adjustment code
   - Keyword management (add/remove/negative keywords)
   - Budget optimization code
   - Ad copy testing implementations
   - Campaign structure improvements

3. **API IMPLEMENTATION STEPS**:
   - Specific Google Ads API calls needed
   - Error handling and validation
   - Batch operations for efficiency

Focus on ENABLED campaigns from the last 30 days. Provide production-ready code that can be executed via Google Ads API.`;

    // Add the enhanced message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: codeGenerationPrompt
      }),
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.text();
      console.error('Message creation failed:', messageResponse.status, errorData);
      throw new Error(`OpenAI Message creation error: ${messageResponse.status}`);
    }

    console.log('Enhanced message added to thread');

    // Run the code generation assistant
    console.log(`Running code generation with assistant ${CODE_GENERATION_ASSISTANT_ID}...`);
    
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: CODE_GENERATION_ASSISTANT_ID,
      }),
    });

    if (!runResponse.ok) {
      const errorData = await runResponse.text();
      console.error('Run creation failed:', runResponse.status, errorData);
      throw new Error(`OpenAI Run creation error: ${runResponse.status}`);
    }

    const run = await runResponse.json();
    console.log('Assistant run started:', run.id);

    // Wait for completion with optimized polling
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 25; // Reduced but still reasonable
    const pollInterval = 800; // Slightly faster polling

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        console.error('Assistant run timeout after', maxAttempts, 'attempts');
        throw new Error('Assistant analysis timeout - please try again');
      }
      
      console.log(`Waiting for completion... Status: ${runStatus.status}, Attempt: ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.text();
        console.error('Status check failed:', statusResponse.status, errorData);
        throw new Error(`Assistant status check error: ${statusResponse.status}`);
      }
      
      runStatus = await statusResponse.json();
      attempts++;
    }

    console.log('Final run status:', runStatus.status);

    if (runStatus.status !== 'completed') {
      console.error('Assistant run failed with status:', runStatus.status);
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.text();
      console.error('Messages retrieval failed:', messagesResponse.status, errorData);
      throw new Error(`OpenAI Messages retrieval error: ${messagesResponse.status}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (assistantMessage && assistantMessage.content[0]?.text?.value) {
      const analysis = assistantMessage.content[0].text.value;
      console.log('Comprehensive analysis completed successfully');
      
      // Format the response with code generation details
      const enhancedAnalysis = `# Google Ads Code Generation & Implementation
Generated: ${new Date().toISOString()}
Assistant Used: ${CODE_GENERATION_ASSISTANT_ID} (Code Generation Specialist)
Thread ID: ${thread.id}
Run ID: ${run.id}

## Generated Code & Implementation Guide
${analysis}

---
## Implementation Details
✅ Assistant ID: ${CODE_GENERATION_ASSISTANT_ID}
📊 Campaign Period: Last 30 days (ENABLED campaigns only)
🎯 Analysis Type: GAQL Queries + Python Code Generation
⚡ Data Source: Real-time Google Ads API
🕒 Generated: ${new Date().toLocaleString()}`;

      return new Response(JSON.stringify({ 
        success: true, 
        analysis: enhancedAnalysis,
        threadId: thread.id,
        runId: run.id,
        assistantId: CODE_GENERATION_ASSISTANT_ID,
        analysisType: 'code-generation',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('No response from assistant');

  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});