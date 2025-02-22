const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize Gemini with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache to store responses
const cache = new Map();

// Preprocess the prompt to make it safer and clearer
function preprocessPrompt(prompt) {
  // Example: Rephrase ambiguous or potentially unsafe prompts
  if (prompt.toLowerCase().includes("things you can't process")) {
    return "What types of content or topics are restricted by Google's Generative AI safety filters?";
  }
  // Add more preprocessing rules as needed
  return prompt;
}

async function getResponse(prompt, bypassSafety = false) {
  // Input validation
  if (!prompt || prompt.trim() === "") {
    return "⚠️ Error: Please provide a valid input.";
  }

  // Check cache for existing response
  if (cache.has(prompt)) {
    console.log("Returning cached response for:", prompt);
    return cache.get(prompt);
  }

  try {
    // Preprocess the prompt
    const processedPrompt = bypassSafety ? prompt : preprocessPrompt(prompt);

    // Step 1: Determine if the input is code or general conversation
    const isCode =
      /def\s+\w+\(|function\s+\w+\(|class\s+\w+|public\s+class\s+\w+|int\s+\w+\(|#include|<\?php/.test(
        processedPrompt
      );

    if (isCode) {
      // Step 2: Identify the programming language
      const languageDetectionPrompt = `
          Identify the programming language of the following code snippet. 
          Respond with only the name of the language (e.g., Python, Java, C, C++, JavaScript, etc.).

          Code:
          ${processedPrompt}
        `;

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const languageDetectionResponse = await model.generateContent(
        languageDetectionPrompt
      );
      const language = languageDetectionResponse.response.text().trim();

      // Step 3: Generate improvements and conversions based on the identified language
      const systemPrompt = `
          You are an expert in programming languages, specializing in ${language} and other popular languages like Python, Java, C, C++, and JavaScript.
          Your task is to:
          1. Analyze the provided ${language} code and suggest improvements line by line.
          2. Provide the improved ${language} code with proper indentation.
          3. Convert the improved ${language} code to Python, Java, C, and C++.
          4. Explain the time and space complexities of the improved code.
          5. Provide personalized learning links for further study.

          Respond in the following format:
          ### Identified Language
          ${language}

          ### Suggestions
          - [Your suggestions for improvements]

          ### Improved ${language} Code
          \`\`\`${language.toLowerCase()}
          [Improved ${language} code here]
          \`\`\`

          // ### Improved Code in Python
          // \`\`\`python
          // [Python code here]
          // \`\`\`

          // ### Improved Code in Java
          // \`\`\`java
          // [Java code here]
          // \`\`\`

          // ### Improved Code in C
          // \`\`\`c
          // [C code here]
          // \`\`\`

          // ### Improved Code in C++
          // \`\`\`cpp
          // [C++ code here]
          // \`\`\`

          // ### Time and Space Complexities
          // - Time Complexity: [Explain time complexity]
          // - Space Complexity: [Explain space complexity]

          // ### Personalized Learning Links
          // - [Link 1]
          // - [Link 2]

          **Important Notes:**
          - Respond directly and conversationally. Do not explain your thought process unless explicitly asked.
          - Keep the tone friendly, professional, and concise.
          - Avoid step-by-step reasoning unless the user requests it.
        `;

      const chatCompletion = await model.generateContent(
        systemPrompt + "\n\n" + processedPrompt
      );
      const response = chatCompletion.response.text();

      // Cache the response
      cache.set(prompt, response);
      console.log("Cached response for:", prompt);

      return response;
    } else {
      // Step 4: Handle general conversation
      const systemPrompt = `
          You are a friendly and knowledgeable AI assistant. Your task is to engage in natural conversation with the user.
          Respond in a conversational tone, keeping your answers concise and helpful.
          If the user asks about programming or code, guide them to share the code for analysis.
          Otherwise, respond to their questions or statements in a friendly and engaging manner.

          **Important Notes:**
          - Avoid explaining your thought process unless explicitly asked.
          - Keep the tone friendly, professional, and concise.
          - Do not provide step-by-step reasoning unless requested.
        `;

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chatCompletion = await model.generateContent(
        systemPrompt + "\n\n" + processedPrompt
      );
      const response = chatCompletion.response.text();

      // Cache the response
      cache.set(prompt, response);
      console.log("Cached response for:", prompt);

      return response;
    }
  } catch (error) {
    console.error("Full Error Details:", error);
    if (error.message.includes("SAFETY")) {
      return "⚠️ The response was blocked due to safety concerns. Please revise your input or ask a different question.";
    } else {
      return "⚠️ Error: Unable to process your request. Please try again later.";
    }
  }
}

module.exports = getResponse;
