import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, customerId } = await req.json();

    console.log('🎯 Generating free audit for lead:', leadId, 'customer:', customerId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user credentials from the pending OAuth session
    // In a real implementation, you'd fetch the access token from the OAuth callback
    // For now, we'll use the shared credentials
    
    // Call the enterprise-audit function with simplified mode
    const { data: auditData, error: auditError } = await supabaseClient.functions.invoke('enterprise-audit', {
      body: {
        customerId,
        freeTier: true, // Flag to return simplified results
      }
    });

    if (auditError) {
      console.error('Audit generation error:', auditError);
      throw auditError;
    }

    // Simplified audit results for free tier
    const simplifiedResults = {
      account_health: auditData.account_health,
      ai_insights: {
        key_findings: auditData.ai_insights?.key_findings?.slice(0, 3) || [],
        summary: auditData.ai_insights?.summary || '',
      },
      issues: {
        issues: auditData.issues?.issues?.slice(0, 3) || [],
      },
      campaigns_count: auditData.campaigns?.length || 0,
      checklist_preview: auditData.checklist ? {
        summary: auditData.checklist.summary,
        sections: Object.entries(auditData.checklist)
          .filter(([key]) => key !== 'summary')
          .map(([sectionKey, items]: [string, any]) => ({
            name: sectionKey,
            display_name: sectionKey.replace(/_/g, ' '),
            total: items.length,
            passed: items.filter((i: any) => i.status === 'pass').length,
            warnings: items.filter((i: any) => i.status === 'warning').length,
            failed: items.filter((i: any) => i.status === 'fail').length,
            preview_items: items.slice(0, 2) // Show first 2 items
          }))
      } : null
    };

    // Update the audit lead with results
    const { error: updateError } = await supabaseClient
      .from('audit_leads')
      .update({
        status: 'completed',
        audit_results: simplifiedResults,
        customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating audit lead:', updateError);
      throw updateError;
    }

    console.log('✅ Free audit generated successfully');

    return new Response(
      JSON.stringify({ success: true, results: simplifiedResults }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-free-audit:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
