import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, voice } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log(`🎤 Generating speech for: "${text}" with voice: ${voice || 'onyx'}`);

    // Generate speech from text using OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd', // High quality model
        input: text,
        voice: voice || 'onyx', // Deep, professional voice like JARVIS
        response_format: 'mp3',
        speed: 1.0,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ OpenAI TTS Error:', error);
      throw new Error(error.error?.message || 'Failed to generate speech')
    }

    // Convert audio buffer to base64 safely (chunked to avoid call stack limits)
    const arrayBuffer = await response.arrayBuffer()
    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        // deno-lint-ignore no-explicit-any
        binary += String.fromCharCode.apply(null, chunk as any)
      }
      return btoa(binary)
    }
    const base64Audio = arrayBufferToBase64(arrayBuffer)

    console.log('✅ Speech generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        audioContent: base64Audio,
        format: 'mp3'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('🚨 Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})