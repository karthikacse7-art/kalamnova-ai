
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

      if (
        !message ||
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 12000
      ) {
        return new Response(
          JSON.stringify({ error: "Please enter a valid question within 12,000 characters." }),
          { status: 400, headers }
        );
      }

      const cleanMessage = message.trim();

      const isSkillRequest =
        /\b(skill|roadmap|learning plan|skill development|skill coach)\b/i.test(cleanMessage);

      const systemPrompt = isSkillRequest
        ? `You are KALAMNOVA AI Skill Coach.

Create a SHORT, organized and practical skill development roadmap.

Follow this exact structure:

🎯 1. SKILL OVERVIEW
Explain the skill in 2 simple sentences.

⭐ 2. WHY LEARN THIS SKILL?
Give 3 short benefits.

📚 3. LEARNING ROADMAP
Give 5 numbered learning steps.
For each step include:
- What to learn
- A short explanation
- One small practice activity

🛠️ 4. PRACTICAL PROJECT
Suggest 2 beginner-friendly projects.

📅 5. WEEKLY GOALS
Create a simple 4-week learning plan.
Show one main goal for each week.

✅ 6. PROGRESS CHECKLIST
Give 5 simple tasks using unchecked boxes.

💡 7. FINAL TIP
Give one useful piece of advice.

IMPORTANT:
- Use simple student-friendly English.
- Keep explanations short.
- Use bullet points and numbered lists.
- Avoid long paragraphs.
- Match the roadmap to the student's skill level.
- Do not claim the student has completed anything.
- If the student has not specified a skill, ask which skill they want to develop instead of guessing.`
        : `You are KALAMNOVA AI, a friendly and patient educational tutor.

Help students understand subjects and solve their doubts.

Use:
- Simple and clear explanations.
- Short paragraphs and bullet points.
- Step-by-step solutions when needed.
- Easy examples.
- A short summary for lengthy explanations.

Keep answers relevant, accurate and easy to understand.
Do not make up facts.`;

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
                content: systemPrompt
              },
              {
                role: "user",
                content: cleanMessage
              }
            ],
            temperature: 0.4,
            max_tokens: isSkillRequest ? 1400 : 4000
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
        data.choices?.[0]?.message?.content?.trim() ||
        "No answer received.";

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
