// This version uses the Hugging Face Inference API - no billing required.

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { lawName, difficulty, tone, length } = request.body;
  if (!lawName || !difficulty || !tone || !length) {
    return response.status(400).json({ message: 'Missing required parameters.' });
  }
  
  // Get the Hugging Face token from Vercel's environment variables
  const accessToken = process.env.HF_ACCESS_TOKEN;

  // --- DEBUGGING LINE ---
  // We'll leave this here just in case the other error comes back.
  console.log(`Checking for access token. Found: ${accessToken ? 'a token' : 'undefined'}`);
  // --- END DEBUGGING ---

  if (!accessToken) {
    // This is the line that's causing your error. Let's find out why.
    return response.status(500).json({ message: 'Hugging Face token not configured.' });
  }

  // --- NEW MODEL ---
  // We are switching to Google's Gemma model, which is very reliable.
  const model = 'google/gemma-7b-it';
  const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

  // Open-source models often need a specific prompt format.
  // Gemma uses a different format from Mistral.
  const prompt = `<start_of_turn>user\nYou are an AI legal summarizer. Your only function is to generate a legal summary based on the user's request. Your entire response must consist ONLY of the Markdown-formatted summary. Generate a ${length}, ${difficulty} summary of the following Indian law in a ${tone} tone: '${lawName}'.<end_of_turn>\n<start_of_turn>model\n`;

  try {
    const hfResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // Hugging Face uses a Bearer token
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { // These help control the output
            max_new_tokens: 1024, // Max length of the generated summary
            temperature: 0.7,
            return_full_text: false, // Important: only return the AI's answer
        }
      }),
    });

    if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        console.error("Hugging Face API Error:", errorText);
        // Provide a more helpful error if the model is loading
        if (hfResponse.status === 503) {
            return response.status(503).json({ message: 'The AI model is currently loading, please try again in 20-30 seconds.' });
        }
        return response.status(hfResponse.status).json({ message: 'Error from Hugging Face API.' });
    }

    const data = await hfResponse.json();

    // The response structure is different. We need to format it like Gemini's for the frontend.
    const generatedText = data[0]?.generated_text || "No summary was generated.";
    
    const geminiLikeResponse = {
        candidates: [{
            content: {
                parts: [{ text: generatedText }]
            },
            groundingMetadata: {} // No grounding with this free model
        }]
    };
    
    // Send the formatted result back to your frontend
    return response.status(200).json(geminiLikeResponse);

  } catch (error) {
    console.error('Internal server error:', error);
    return response.status(500).json({ message: 'An internal error occurred.' });
  }
}

