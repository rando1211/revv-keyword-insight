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

    // Add a message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
      const errorData = await messageResponse.text();
      console.error('Message creation failed:', messageResponse.status, errorData);
      throw new Error(`OpenAI Message creation error: ${messageResponse.status}`);
    }

    console.log('Message added to thread');

    // Run the assistant - using the Campaign Analyzer assistant
    const CAMPAIGN_ANALYZER_ID = 'asst_dUUTuhMdkCHSYjVnVFOjcF8w';
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: CAMPAIGN_ANALYZER_ID,
      }),
    });

    if (!runResponse.ok) {
      const errorData = await runResponse.text();
      console.error('Run creation failed:', runResponse.status, errorData);
      throw new Error(`OpenAI Run creation error: ${runResponse.status}`);
    }

    const run = await runResponse.json();
    console.log('Assistant run started:', run.id);

    // Wait for completion (simple polling)
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        console.error('Assistant run timeout after', maxAttempts, 'attempts');
        throw new Error('Assistant run timeout');
      }
      
      console.log(`Waiting for completion... Status: ${runStatus.status}, Attempt: ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      console.log('Analysis completed successfully');
      
      return new Response(JSON.stringify({ 
        success: true, 
        analysis: analysis,
        threadId: thread.id,
        runId: run.id
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