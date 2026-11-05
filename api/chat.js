
export default {
  async fetch(request) {
    const headers = { "Content-Type": "application/json" };

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers }
      );
    }

    try {
      if (!process.env.GROQ_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Groq API key is missing." }),
          { status: 500, headers }
        );
      }

      const { message } = await request.json();

      if (!message || typeof message !== "string" || !message.trim()) {
        return new Response(
          JSON.stringify({ error: "Please enter a question." }),
          { status: 400, headers }
        );
      }

      const apiResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: "You are KALAMNOVA AI, a friendly and patient tutor. Help students understand subjects with clear explanations and examples."
              },
              {
                role: "user",
                content: message.trim()
              }
            ],
            max_tokens: 1000
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "Groq AI request failed."
          }),
          { status: 502, headers }
        );
      }

      const answer =
        data.choices?.[0]?.message?.content || "No answer received.";

      return new Response(
        JSON.stringify({ answer }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "AI took too long. Please try again."
            : "Something went wrong. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
