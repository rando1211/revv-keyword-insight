import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = async (text: string, voice: string = 'onyx') => {
    if (!text.trim()) return;
    
    setIsPlaying(true);
    
    try {
      console.log('🎤 Requesting TTS for:', text);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) {
        throw error;
      }

      if (!data?.success || !data?.audioContent) {
        throw new Error('Invalid response from TTS service');
      }

      // Create audio element and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Handle audio events
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback failed');
      };
      
      await audio.play();
      console.log('🔊 Audio playing successfully');
      
    } catch (error) {
      console.error('TTS Error:', error);
      setIsPlaying(false);
    }
  };

  return { speak, isPlaying };
};