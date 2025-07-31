import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authCode } = await req.json();
    
    const CLIENT_ID = "150823894494-4eeahuba311qvt5t10465q727eh66i44.apps.googleusercontent.com";
    const CLIENT_SECRET = "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";
    const REDIRECT_URI = "https://02489f4d-13c2-48b8-896b-30f9c8e34036.lovableproject.com";

    console.log('Exchanging auth code for tokens...');
    
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: authCode,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', tokenData);
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange error: ${tokenData.error}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        refresh_token: tokenData.refresh_token,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Token exchange error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});