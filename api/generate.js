// This is a Vercel/Netlify serverless function that acts as a secure proxy.

export default async function handler(request, response) {
  // 1. We only accept POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. Get the user's prompt details from the request body
  const { lawName, difficulty, tone, length } = request.body;
  if (!lawName || !difficulty || !tone || !length) {
    return response.status(400).json({ message: 'Missing required parameters.' });
  }
  
  // 3. Get the secret API key from environment variables (this is the secure part)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ message: 'API key not configured.' });
  }

  const model = 'gemini-2.5-flash-preview-09-2025';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 4. Construct the payload with an EVEN STRONGER instruction
  const systemInstruction = {
    role: "model",
    parts: [{
        text: "You are an AI legal summarizer. Your only function is to generate a legal summary based on the user's request. **Your entire response must consist ONLY of the Markdown-formatted summary.** Do not include any pre-summary text, introductory phrases, explanations of your process, or any text other than the summary itself. Your output is final."
    }]
  };
  
  const userPrompt = {
      role: "user",
      parts: [{
          text: `Generate a ${length}, ${difficulty} summary of the following Indian law in a ${tone} tone: '${lawName}'.`
      }]
  };

  const payload = {
      contents: [userPrompt, systemInstruction],
      tools: [{ "google_search": {} }],
  };

  // 5. Make the call to the actual Gemini API
  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Google API Error:", errorText);
      return response.status(geminiResponse.status).json({ message: 'Error from Google API.' });
    }

    const data = await geminiResponse.json();
    
    // 6. Send the result back to your frontend webpage
    return response.status(200).json(data);

  } catch (error) {
    console.error('Internal server error:', error);
    return response.status(500).json({ message: 'An internal error occurred.' });
  }
}

