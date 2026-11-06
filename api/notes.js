export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error("API key is not configured.");
      }

      const { text } = await request.json();

      if (!text || typeof text !== "string") {
        return new Response(
          JSON.stringify({ error: "Please provide study material." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (text.length > 20000) {
        return new Response(
          JSON.stringify({ error: "Please upload shorter material (maximum 20,000 characters)." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: `You are KALAMNOVA AI Notes Maker. Turn the student's material into clear, accurate, well-organized study notes. Include:
1. A suitable title
2. Clear headings and subheadings
3. Important key points
4. Simple definitions of important terms
5. A short summary
Use simple student-friendly language. Do not invent facts that are not supported by the material.`
              },
              {
                role: "user",
                content: text
              }
            ],
            temperature: 0.4,
            max_tokens: 3000
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "AI notes generation failed.");
      }

      const notes = data.choices?.[0]?.message?.content;

      if (!notes) {
        throw new Error("No notes were generated.");
      }

      return new Response(
        JSON.stringify({ notes }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message || "Something went wrong." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
