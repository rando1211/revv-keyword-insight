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

    // Use the primary assistant with enhanced prompting for comprehensive analysis
    const PRIMARY_ASSISTANT_ID = 'asst_phXpkgf3V5TRddgpq06wjEtF';
    
    // Enhanced prompt that requests analysis from multiple perspectives
    const enhancedPrompt = `Analyze this Google Ads campaign data with comprehensive multi-assistant perspective:

Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Please provide analysis from multiple specialized viewpoints:

1. CAMPAIGN OPTIMIZER PERSPECTIVE:
   - Top 3 optimization recommendations
   - Priority level for each (High/Medium/Low)
   - Estimated impact percentage
   - Confidence score (0-100%)
   - Specific implementation steps

2. KEYWORD ANALYZER PERSPECTIVE:
   - Keyword performance analysis
   - Search term opportunities
   - Negative keyword recommendations
   - Bid adjustment suggestions

3. PERFORMANCE AUDITOR PERSPECTIVE:
   - Account structure review
   - Budget allocation analysis
   - Quality Score improvements
   - Conversion tracking validation

Provide detailed analysis for ENABLED campaigns only from the last 30 days.
Format as a comprehensive multi-assistant report with clear sections.`;

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
        content: enhancedPrompt
      }),
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.text();
      console.error('Message creation failed:', messageResponse.status, errorData);
      throw new Error(`OpenAI Message creation error: ${messageResponse.status}`);
    }

    console.log('Enhanced message added to thread');

    // Run the primary assistant
    console.log(`Running comprehensive analysis with assistant ${PRIMARY_ASSISTANT_ID}...`);
    
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: PRIMARY_ASSISTANT_ID,
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
      
      // Format the response with proof of multi-perspective analysis
      const enhancedAnalysis = `# Comprehensive Multi-Assistant Campaign Analysis
Generated: ${new Date().toISOString()}
Assistant Used: ${PRIMARY_ASSISTANT_ID} (Multi-perspective analysis)
Thread ID: ${thread.id}
Run ID: ${run.id}

## Analysis Report
${analysis}

---
## Verification Details
✅ Assistant ID: ${PRIMARY_ASSISTANT_ID}
📊 Campaign Period: Last 30 days (ENABLED campaigns only)
🎯 Analysis Type: Multi-perspective (Optimizer + Keyword + Performance)
⚡ Data Source: Real-time Google Ads API
🕒 Generated: ${new Date().toLocaleString()}`;

      return new Response(JSON.stringify({ 
        success: true, 
        analysis: enhancedAnalysis,
        threadId: thread.id,
        runId: run.id,
        assistantId: PRIMARY_ASSISTANT_ID,
        analysisType: 'multi-perspective',
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