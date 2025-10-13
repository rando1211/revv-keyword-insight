import sampleImage from "@/assets/sample-canam-rzr.jpg";
import { Card } from "@/components/ui/card";

export const ImagePreview = () => {
  return (
    <Card className="p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4">AI-Generated Image Sample</h2>
      <p className="text-muted-foreground mb-4">
        This is what the AI will generate for your ad campaigns - highly relevant images based on your keywords and business info.
      </p>
      <img 
        src={sampleImage} 
        alt="AI-generated Can-Am RZR" 
        className="w-full rounded-lg shadow-lg"
      />
      <p className="text-sm text-muted-foreground mt-4">
        Generated for: Can-Am RZR keywords
      </p>
    </Card>
  );
};
