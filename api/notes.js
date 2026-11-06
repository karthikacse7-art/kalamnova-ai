
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
        throw new Error("API key is not configured.");
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
                content: `You are KALAMNOVA AI Notes Maker.

Convert the student's study material into easy-to-understand, well-organized study notes.

IMPORTANT FORMATTING RULES:
- Use short bullet points.
- Avoid long paragraphs.
- Explain concepts in simple student-friendly language.
- Use clear headings and subheadings.
- Keep the notes accurate.
- Do not invent facts.

Follow this exact structure:

# 1. Topic Title
Give a suitable title.

# 2. Topic Overview
Explain the topic in 2-3 short bullet points.

# 3. Important Concepts
Explain the important concepts using short bullet points.

# 4. Important Definitions
Give important terms and their simple meanings.

# 5. Key Terms
List important keywords and their meanings.

# 6. Formulas
Include important formulas and explain each symbol.
If there are no formulas, write "No important formulas in this material."

# 7. Examples
Give simple examples based on the material.

# 8. Important Facts
List the facts students should remember.

# 9. Quick Revision
Give a short revision summary using bullet points.

# 10. Practice Questions
Create 5 useful practice questions based on the material.
Include answers after the questions under a separate heading.

Keep everything organized, readable and useful for exam preparation.`
              },
              {
                role: "user",
                content: text.trim()
              }
            ],
            temperature: 0.3,
            max_tokens: 3500
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "AI notes generation failed."
        );
      }

      const notes = data.choices?.[0]?.message?.content;

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
          error: error.message || "Something went wrong."
        }),
        {
          status: 500,
          headers
        }
      );
    }
  }
};
