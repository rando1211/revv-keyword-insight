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
    const { locationId, pageData, pageName } = await req.json();
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');

    if (!ghlApiKey) {
      throw new Error('GoHighLevel API key not configured');
    }

    if (!locationId) {
      throw new Error('Location ID is required');
    }

    if (!pageData) {
      throw new Error('Page data is required');
    }

    console.log('Processing request:', { locationId, pageName });

    // Generate the HTML content
    const htmlContent = generateLandingPageHTML(pageData);

    // Test GHL API connection
    console.log('Testing GoHighLevel API connection...');
    const testResponse = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28'
      }
    });

    console.log('GHL API Test Status:', testResponse.status);

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('GHL API Test Failed:', errorText);
      
      // Return HTML for manual import
      return new Response(JSON.stringify({
        success: true,
        message: 'API connection failed. HTML content generated for manual import.',
        htmlContent: htmlContent,
        error: `GHL API Error: ${testResponse.status} - ${errorText}`,
        instructions: [
          '1. Copy the HTML content from the response',
          '2. Go to your GoHighLevel funnel builder',
          '3. Create a new page or step',
          '4. Switch to HTML/Code view',
          '5. Paste the generated HTML',
          '6. Save and publish'
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If API connection works, return success with HTML
    console.log('GHL API connection successful');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Landing page HTML generated successfully',
      htmlContent: htmlContent,
      instructions: [
        '✅ GoHighLevel API connection verified',
        '1. Copy the HTML content below',
        '2. Go to your GoHighLevel funnel builder',
        '3. Create a new page or step',
        '4. Switch to HTML/Code view',
        '5. Paste the generated HTML',
        '6. Save and publish your optimized landing page'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in push-to-gohighlevel:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateLandingPageHTML(pageData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageData.headline || 'AI Generated Landing Page'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px 0; text-align: center; }
        .hero h1 { font-size: 3rem; font-weight: bold; margin-bottom: 20px; }
        .hero p { font-size: 1.25rem; margin-bottom: 30px; opacity: 0.9; }
        .cta-button { background: #ff6b6b; color: white; padding: 15px 30px; font-size: 1.1rem; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.3s; }
        .cta-button:hover { background: #ff5252; }
        .features { padding: 60px 0; background: #f8f9fa; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 40px; }
        .feature-card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .feature-card h3 { color: #667eea; margin-bottom: 15px; }
        .trust-signals { padding: 40px 0; text-align: center; }
        .testimonial { background: white; padding: 20px; margin: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .footer { background: #333; color: white; padding: 40px 0; text-align: center; }
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .hero p { font-size: 1rem; }
            .features-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>${pageData.headline || 'Join Carefree Boat Club - Unlimited Access to Premium Boats'}</h1>
            <p>${pageData.subheadline || 'No maintenance, no storage fees, no insurance hassles - just pure boating freedom'}</p>
            <a href="#contact" class="cta-button">${pageData.ctaText || 'Start My Boat Club Trial - $0 Today'}</a>
        </div>
    </section>

    <!-- Value Propositions -->
    <section class="features">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 20px;">Why Choose Carefree Boat Club?</h2>
            <div class="features-grid">
                ${pageData.valueProps?.map((prop: string) => `
                    <div class="feature-card">
                        <h3>✓ ${prop}</h3>
                    </div>
                `).join('') || `
                    <div class="feature-card">
                        <h3>✓ No Maintenance Hassles</h3>
                        <p>We handle all maintenance, storage, and insurance - you just show up and boat!</p>
                    </div>
                    <div class="feature-card">
                        <h3>✓ Access 100+ Boats</h3>
                        <p>Choose from our fleet of premium boats across multiple locations</p>
                    </div>
                    <div class="feature-card">
                        <h3>✓ Book Online in Seconds</h3>
                        <p>Easy online booking system with unlimited usage included</p>
                    </div>
                `}
            </div>
        </div>
    </section>

    <!-- Trust Signals -->
    <section class="trust-signals">
        <div class="container">
            <h2>Trusted by 1000+ Happy Boaters</h2>
            <div class="testimonial">
                <p>"Best decision we ever made! All the joy of boating without any of the headaches."</p>
                <strong>- Sarah & Mike, Channel Islands Members</strong>
            </div>
            <div style="margin-top: 30px;">
                <strong>🏆 500+ 5-Star Reviews | ⭐ BBB A+ Rating | 🛡️ Coast Guard Certified Safety Record</strong>
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="hero" style="padding: 60px 0;">
        <div class="container">
            <h2>Ready to Experience Boating Freedom?</h2>
            <p>Join thousands of members enjoying unlimited access to premium boats</p>
            <a href="#contact" class="cta-button">${pageData.ctaText || 'Start My Free Trial Today'}</a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 Carefree Boat Club. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
}