
export default {
  async fetch(request) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers }
      );
    }

    try {
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "API key is not configured." }),
          { status: 500, headers }
        );
      }

      const { text } = await request.json();

      if (!text || typeof text !== "string" || !text.trim()) {
        return new Response(
          JSON.stringify({ error: "Please provide study material." }),
          { status: 400, headers }
        );
      }

      if (text.length > 20000) {
        return new Response(
          JSON.stringify({
            error: "Please upload shorter material (maximum 20,000 characters)."
          }),
          { status: 400, headers }
        );
      }

      const prompt = `
Convert the following study material into SHORT, CLEAR and WELL-ORGANIZED student notes.

STRICT FORMATTING RULES:
- Use numbered headings.
- Use bullet points instead of long paragraphs.
- Explain each point in 1–3 simple sentences.
- Highlight important terms using clear labels.
- Include only information supported by the material.
- Do not repeat the same information.
- Keep the notes useful for exam preparation.
- If a section is not relevant, skip it instead of inventing information.

FOLLOW THIS STRUCTURE:

📘 1. TOPIC TITLE
Write a suitable topic title.

📝 2. INTRODUCTION
- Explain the topic in 2–3 short points.

📚 3. MAIN CONCEPTS
- List the important concepts.
- Explain each concept in simple language.
- Use numbered subheadings where useful.

🔑 4. IMPORTANT DEFINITIONS
- Term: Simple definition.
- Include all important definitions found in the material.

⭐ 5. KEY POINTS
- List the most important facts.
- Keep each point short and clear.

📐 6. FORMULAS (if applicable)
- Formula
- Meaning of each symbol
- One simple example if possible.

💡 7. EXAMPLES
- Give simple examples based on the study material.

📋 8. ADVANTAGES / TYPES / FEATURES
- Include these only if they are relevant to the topic.
- Use bullet points.

🎯 9. QUICK REVISION
- Give 5–8 essential points to remember.
- Make this section suitable for last-minute revision.

❓ 10. PRACTICE QUESTIONS
- Create 5 questions based on the material.
- Give short answers under a separate ANSWERS heading.

FINAL INSTRUCTIONS:
- Use simple student-friendly English.
- Avoid unnecessary introductions and conclusions.
- Keep the notes compact but do not omit important concepts.
- Make the output easy to copy and download.
- Never claim the student has completed any activity.

STUDY MATERIAL:
${text.trim()}
`;

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
                content: "You are KALAMNOVA AI Notes Maker. Create accurate, concise, organized and exam-friendly notes using numbered headings and bullet points."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 3000
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "AI notes generation failed."
          }),
          { status: 502, headers }
        );
      }

      const notes = data.choices?.[0]?.message?.content?.trim();

      if (!notes) {
        throw new Error("No notes were generated.");
      }

      return new Response(
        JSON.stringify({ notes }),
        {
          status: 200,
          headers
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "Notes generation took too long. Please try again."
            : "Unable to generate notes. Please try again."
        }),
        {
          status: 500,
          headers
        }
      );
    }
  }
};
