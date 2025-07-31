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

    // Multiple assistants for comprehensive analysis
    const assistants = [
      { id: 'asst_phXpkgf3V5TRddgpq06wjEtF', name: 'Campaign Optimizer' },
      { id: 'asst_4VN8Q2bGNJpHLsYzOPqOOGwN', name: 'Keyword Analyzer' },
      { id: 'asst_QQoJVqK3Sp7w0CZB0b2Y6Zhs', name: 'Performance Auditor' }
    ];

    const analysisResults = [];
    
    for (const assistant of assistants) {
      console.log(`Running analysis with ${assistant.name} (${assistant.id})...`);
      
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          assistant_id: assistant.id,
        }),
      });

      if (!runResponse.ok) {
        const errorData = await runResponse.text();
        console.error(`Run creation failed for ${assistant.name}:`, runResponse.status, errorData);
        continue; // Skip this assistant and try the next one
      }

      const run = await runResponse.json();
      console.log(`${assistant.name} run started:`, run.id);

      // Wait for completion (simple polling)
      let runStatus = run;
      let attempts = 0;
      const maxAttempts = 20;

      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (attempts >= maxAttempts) {
          console.error(`${assistant.name} run timeout after`, maxAttempts, 'attempts');
          break; // Move to next assistant
        }
        
        console.log(`[${assistant.name}] Waiting for completion... Status: ${runStatus.status}, Attempt: ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        
        if (!statusResponse.ok) {
          console.error(`Status check failed for ${assistant.name}:`, statusResponse.status);
          break;
        }
        
        runStatus = await statusResponse.json();
        attempts++;
      }

      console.log(`[${assistant.name}] Final run status:`, runStatus.status);

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });

        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
          
          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            const analysis = assistantMessage.content[0].text.value;
            console.log(`[${assistant.name}] Analysis completed successfully`);
            
            analysisResults.push({
              assistant: assistant.name,
              assistantId: assistant.id,
              analysis: analysis,
              runId: run.id,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    if (analysisResults.length === 0) {
      throw new Error('No successful analysis from any assistant');
    }

    // Combine all assistant analyses
    const combinedAnalysis = `# Multi-Assistant Campaign Analysis Report
Generated on: ${new Date().toISOString()}
Assistants Used: ${analysisResults.map(r => `${r.assistant} (${r.assistantId})`).join(', ')}

${analysisResults.map((result, index) => `
## Analysis ${index + 1}: ${result.assistant}
Assistant ID: ${result.assistantId}
Run ID: ${result.runId}

${result.analysis}

---`).join('\n')}

## Summary
✅ Total Assistants Used: ${analysisResults.length}
📊 Campaign Data Period: Last 30 days
🎯 Analysis Focus: ENABLED campaigns only
⚡ Real-time Google Ads API data`;

    console.log(`Analysis completed using ${analysisResults.length} assistants`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      analysis: combinedAnalysis,
      threadId: thread.id,
      assistantsUsed: analysisResults.length,
      assistantDetails: analysisResults.map(r => ({ 
        name: r.assistant, 
        id: r.assistantId, 
        runId: r.runId 
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    }

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