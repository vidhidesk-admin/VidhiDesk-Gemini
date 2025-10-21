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
  const apiKey = process.env.AIzaSyDiAhsewe7AlZuVfQR8E_9jL2kxen8hGlc;
  if (!apiKey) {
    return response.status(500).json({ message: 'API key not configured.' });
  }

  const model = 'gemini-2.5-flash-preview-09-2025';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 4. Construct the same payload you had before
  const systemInstruction = {
    role: "model",
    parts: [{
        text: "You are VidhiDesk, an expert AI legal assistant specializing in the Indian Constitution and its legal framework. Your role is to provide clear, accurate, and accessible summaries of Indian laws, acts, and amendments. You must tailor your response based on the user's specific requirements for difficulty, tone, and length. Always base your summaries on verifiable information from reliable sources."
    }]
  };
  
  const userPrompt = {
      role: "user",
      parts: [{
          text: `Please provide a ${length} summary of the Indian law/act/amendment: '${lawName}'. The summary should be written in a ${tone} tone and at a ${difficulty} difficulty level. Format the output in Markdown.`
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
