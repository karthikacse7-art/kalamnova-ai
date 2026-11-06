
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
          JSON.stringify({ error: "Groq API key is missing." }),
          { status: 500, headers }
        );
      }

      const {
        action = "generate",
        role,
        type = "HR",
        level = "Fresher",
        question,
        answer
      } = await request.json();

      if (
        typeof role !== "string" ||
        !role.trim() ||
        role.length > 150
      ) {
        return new Response(
          JSON.stringify({ error: "Please enter a valid job role." }),
          { status: 400, headers }
        );
      }

      let messages;

      if (action === "generate") {
        if (
          !["HR", "Technical", "Mixed"].includes(type) ||
          !["Fresher", "Intermediate", "Experienced"].includes(level)
        ) {
          return new Response(
            JSON.stringify({ error: "Invalid interview type or level." }),
            { status: 400, headers }
          );
        }

        messages = [
          {
            role: "system",
            content: `You are KALAMNOVA AI Interview Coach.

Generate 5 realistic interview questions for students and job seekers.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Interview question",
      "sampleAnswer": "A helpful sample answer",
      "tip": "A useful interview tip"
    }
  ]
}

Rules:
- Generate exactly 5 questions.
- Match the requested role, interview type and experience level.
- Use clear and professional language.
- Sample answers should be realistic examples, not claims about the student.
- Do not include markdown outside JSON.`
          },
          {
            role: "user",
            content: `Role: ${role.trim()}
Interview type: ${type}
Level: ${level}`
          }
        ];
      } else if (action === "evaluate") {
        if (
          typeof question !== "string" ||
          !question.trim() ||
          question.length > 2000 ||
          typeof answer !== "string" ||
          !answer.trim() ||
          answer.length > 5000
        ) {
          return new Response(
            JSON.stringify({
              error: "Please provide a valid interview question and answer."
            }),
            { status: 400, headers }
          );
        }

        messages = [
          {
            role: "system",
            content: `You are KALAMNOVA AI Interview Coach.

Evaluate the student's interview answer constructively.

Return ONLY valid JSON:
{
  "score": 7,
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "betterAnswer": "An improved example answer",
  "feedback": "Encouraging overall feedback"
}

Rules:
- Score must be an integer from 1 to 10.
- Be fair, specific and encouraging.
- Do not invent personal experience for the student.
- Suggest improvements in simple language.
- Do not include markdown outside JSON.`
          },
          {
            role: "user",
            content: `Job role: ${role.trim()}

Interview question:
${question.trim()}

Student answer:
${answer.trim()}`
          }
        ];
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid interview action." }),
          { status: 400, headers }
        );
      }

      const apiResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages,
            temperature: 0.4,
            max_tokens: 2500
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "Interview request failed."
          }),
          { status: 502, headers }
        );
      }

      let content = data.choices?.[0]?.message?.content || "";

      content = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const result = JSON.parse(content);

      if (action === "generate") {
        if (
          !Array.isArray(result.questions) ||
          result.questions.length !== 5 ||
          !result.questions.every(item =>
            typeof item.question === "string" &&
            typeof item.sampleAnswer === "string" &&
            typeof item.tip === "string"
          )
        ) {
          throw new Error("Invalid interview questions.");
        }
      }

      if (action === "evaluate") {
        if (
          !Number.isInteger(result.score) ||
          result.score < 1 ||
          result.score > 10 ||
          !Array.isArray(result.strengths) ||
          !Array.isArray(result.improvements) ||
          typeof result.betterAnswer !== "string" ||
          typeof result.feedback !== "string"
        ) {
          throw new Error("Invalid interview feedback.");
        }
      }

      return new Response(
        JSON.stringify(result),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "Interview request took too long. Please try again."
            : "Unable to process the interview request. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
