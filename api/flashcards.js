
export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error("API key is not configured.");
      }

      const { subject, topic, count = 10 } = await request.json();

      if (!subject || !topic) {
        return new Response(
          JSON.stringify({
            error: "Please enter a subject and topic."
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const safeCount = Math.min(
        Math.max(Number(count) || 10, 5),
        15
      );

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
                content: `You are KALAMNOVA AI Flashcards Generator.
Create exactly ${safeCount} educational flashcards.
Return ONLY a valid JSON array. Each item must have:
"question": a clear study question,
"answer": a short, accurate answer.
Use student-friendly language.
Do not include markdown or text outside the JSON array.`
              },
              {
                role: "user",
                content: `Subject: ${String(subject).slice(0, 100)}
Topic: ${String(topic).slice(0, 500)}`
              }
            ],
            temperature: 0.5,
            max_tokens: 3000
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "Flashcard generation failed."
        );
      }

      let content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No flashcards were generated.");
      }

      content = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const flashcards = JSON.parse(content);

      if (!Array.isArray(flashcards) || !flashcards.length) {
        throw new Error("Invalid flashcard response.");
      }

      return new Response(
        JSON.stringify({ flashcards }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message || "Something went wrong."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
