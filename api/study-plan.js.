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
      if (!process.env.GROQ_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Groq API key is missing." }),
          { status: 500, headers }
        );
      }

      const { subject, hours, examDate } = await request.json();

      if (
        typeof subject !== "string" ||
        !subject.trim() ||
        subject.length > 80 ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > 12 ||
        typeof examDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(examDate)
      ) {
        return new Response(
          JSON.stringify({ error: "Please provide valid study plan details." }),
          { status: 400, headers }
        );
      }

      const parsedDate = new Date(examDate + "T00:00:00");

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== examDate
      ) {
        return new Response(
          JSON.stringify({ error: "Please provide a valid exam date." }),
          { status: 400, headers }
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (parsedDate < today) {
        return new Response(
          JSON.stringify({ error: "Exam date must be today or in the future." }),
          { status: 400, headers }
        );
      }

      const prompt = `
Create a practical and personalized study timetable.

Subject: ${subject.trim()}
Available study hours per day: ${hours}
Exam date: ${examDate}

Include:
1. A daily study timetable.
2. Break times.
3. Important topics to study.
4. Revision sessions.
5. Practice questions or mock tests.
6. Final preparation advice.

Make the plan realistic for a student.
Use clear headings, numbered days, and simple language.
If the exam is far away, organize the plan into weekly phases.
Do not claim that the student has completed any work.
`;

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
                content: "You are KALAMNOVA AI, a friendly educational study planner. Create practical, clear and realistic study schedules."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.5,
            max_tokens: 2000
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "Study plan generation failed."
          }),
          { status: 502, headers }
        );
      }

      const plan =
        data.choices?.[0]?.message?.content?.trim();

      if (!plan) {
        throw new Error("No study plan received.");
      }

      return new Response(
        JSON.stringify({ plan }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "Study plan generation took too long. Please try again."
            : "Unable to generate your study plan. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
