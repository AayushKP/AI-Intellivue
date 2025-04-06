import { NextRequest, NextResponse } from "next/server";

interface RequestType {
  role: string;
  experience: number;
  level: string;
  resumeData: string | null;
  technologies: string[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function generateInterviewQuestions(
  data: RequestType,
  resumeText: string | null
): Promise<string> {
  try {
    const prompt = `Generate 10 interview questions for the following details in the format of a single string separated by '|':
- Role: ${data.role}
- Level: ${data.level}
- Experience: ${data.experience} years
- Technologies: ${data.technologies.join(", ")}
- Resume Text: ${resumeText}

Ensure the first 8 questions include a mix of behavioral, technical, and resume-related questions that are concise, relevant, and suitable for the specified role, level, and experience.
The last 2 questions should be DSA coding problems according to the level and experience.

Return the output as a single string with each question separated by '|'.`;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(
        `Gemini API request failed: ${geminiResponse.statusText}`
      );
    }

    const json = await geminiResponse.json();
    const responseText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(responseText);
    if (!responseText) {
      throw new Error("No content returned from Gemini API");
    }

    return responseText;
  } catch (error) {
    console.error("Error generating questions:", error);

    return `Tell me about your experience with ${data.technologies[0]}?|Describe a time you solved a problem?|Explain a complex project you've worked on.|What are your salary expectations?|Describe a time you had to learn something new quickly.|How do you handle conflict in a team setting?|What is your understanding of the ${data.role} role?|Problem: Write a function to reverse a string. Input: 'hello', Output: 'olleh'|Problem: Given an array of integers, find two numbers that sum to a target. Input: [2, 7, 11, 15], target: 9 → Output: [0, 1]`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestType = await req.json();

    const { role, experience, level, resumeData, technologies } = body;

    if (!role || experience === undefined || !level || !technologies) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const questions = await generateInterviewQuestions(body, resumeData);
    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
