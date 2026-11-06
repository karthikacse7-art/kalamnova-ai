
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

      const { image, question = "" } = await request.json();

      if (
        typeof image !== "string" ||
        !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)
      ) {
        return new Response(
          JSON.stringify({
            error: "Please upload a valid JPG, PNG or WEBP image."
          }),
          { status: 400, headers }
        );
      }

      if (image.length > 12000000) {
        return new Response(
          JSON.stringify({
            error: "Image is too large. Please upload a smaller image."
          }),
          { status: 400, headers }
        );
      }

      if (
        typeof question !== "string" ||
        question.length > 1000
      ) {
        return new Response(
          JSON.stringify({
            error: "Please enter a shorter question."
          }),
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
            model: "qwen/qwen3.8-27b",
            messages: [
              {
                role: "system",
                content: `You are KALAMNOVA AI Doubt Solver.

You are a friendly, patient and knowledgeable teacher.

Your task is to understand the student's uploaded question image and explain the answer.

Follow these rules:

1. Read the question carefully from the image.
2. Identify the subject and topic if possible.
3. Explain the solution step by step.
4. Use simple student-friendly language.
5. Show formulas and calculations wherever necessary.
6. Explain important concepts.
7. Give a final answer clearly.
8. If the image is unclear, ask the student to upload a clearer image.
9. Never invent missing information.
10. For mathematics, show the calculation steps.
11. For programming, explain the logic and code where appropriate.
12. Encourage students to understand rather than simply memorize.

Use this format:

QUESTION UNDERSTANDING

STEP-BY-STEP EXPLANATION

IMPORTANT CONCEPTS

FINAL ANSWER

QUICK TIP

Be accurate, clear and educational.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: question.trim()
                      ? `Please solve and explain this question: ${question.trim()}`
                      : "Please read the question in this image and explain the solution step by step."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: image
                    }
                  }
                ]
              }
            ],
            temperature: 0.4,
            max_tokens: 2500
          }),
          signal: AbortSignal.timeout(30000)
        }
      );

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "AI doubt solving failed."
          }),
          { status: 502, headers }
        );
      }

      const answer =
        data.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        throw new Error("No solution was generated.");
      }

      return new Response(
        JSON.stringify({ answer }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "AI took too long. Please try again."
            : "Unable to solve this question. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
