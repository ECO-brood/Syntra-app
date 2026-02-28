// --- OPENAI API HELPER ---
const callAI = async (prompt, systemInstruction = "") => {
  try {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.2", // Use "gpt-5.2-chat-latest" if it throws a 'model not found' error
        messages: messages
      })
    });

    // If OpenAI rejects the request, grab the exact reason why
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const actualError = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error("OpenAI API Rejected Request:", actualError);
      throw new Error(`OpenAI Error: ${actualError}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Thinking...";
  } catch (e) {
    console.error(`Connection/Fetch error:`, e);
    // TypeErrors on fetch usually mean the browser blocked it via CORS
    if (e.name === 'TypeError') {
      throw new Error("Network/CORS Error: Browser blocked the request. Check the developer console.");
    }
    throw e; // Pass the real error string down to the Chat interface
  }
};
