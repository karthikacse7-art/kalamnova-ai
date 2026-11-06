
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
        name,
        email,
        phone,
        location,
        education,
        skills,
        projects,
        experience,
        achievements,
        objective
      } = await request.json();

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof education !== "string" ||
        !education.trim()
      ) {
        return new Response(
          JSON.stringify({
            error: "Please provide your name, email and education details."
          }),
          { status: 400, headers }
        );
      }

      const fields = {
        name, email, phone, location,
        education, skills, projects,
        experience, achievements, objective
      };

      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined &&
            (typeof value !== "string" || value.length > 4000)) {
          return new Response(
            JSON.stringify({
              error: `Invalid or too-long ${key} field.`
            }),
            { status: 400, headers }
          );
        }
      }

      const prompt = `
Create a professional student resume using the information below.

PERSONAL DETAILS
Name: ${name.trim()}
Email: ${email.trim()}
Phone: ${phone || "Not provided"}
Location: ${location || "Not provided"}

EDUCATION
${education}

SKILLS
${skills || "Not provided"}

PROJECTS
${projects || "Not provided"}

EXPERIENCE / INTERNSHIPS
${experience || "Not provided"}

ACHIEVEMENTS
${achievements || "Not provided"}

CAREER OBJECTIVE
${objective || "Create a suitable objective based only on the supplied information."}

RESUME REQUIREMENTS:
1. Create a clean professional resume.
2. Include a strong professional summary or career objective.
3. Organize education, skills, projects and experience.
4. Highlight achievements where provided.
5. Use clear headings and bullet points.
6. Use professional language.
7. Make it suitable for internships and entry-level jobs.
8. Never invent qualifications, marks, experience, certificates or achievements.
9. If information is missing, omit that section rather than making things up.
10. Do not include unnecessary personal information.

Return the resume as clean, readable text.
`;

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
            messages: [
              {
                role: "system",
                content: "You are KALAMNOVA AI Resume Builder, an expert student resume writer."
              },
              {
                role: "user",
                content: prompt
              }
            ],
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
            error: data.error?.message || "Resume generation failed."
          }),
          { status: 502, headers }
        );
      }

      const resume =
        data.choices?.[0]?.message?.content?.trim();

      if (!resume) {
        throw new Error("No resume was generated.");
      }

      return new Response(
        JSON.stringify({ resume }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "Resume generation took too long. Please try again."
            : "Unable to generate your resume. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
