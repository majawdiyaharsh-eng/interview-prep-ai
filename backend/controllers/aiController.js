const Groq = require("groq-sdk");
const Question = require("../models/Question");
const Session = require("../models/Session");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateQuestions = async (req, res) => {
  try {
    const { role, experience, sessionId, numberOfQuestions = 5 } = req.body;
    if (!role || !experience || !sessionId) {
      return res.status(400).json({ message: "role, experience, sessionId are required" });
    }
    const session = await Session.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const difficulty = session.difficulty || "Medium";
    const prompt = `Generate ${numberOfQuestions} ${difficulty}-level technical interview questions for a ${role} position with ${experience} years of experience. Return ONLY a valid JSON array with no markdown in this format: [{"question": "Question text here","answer": "Answer text here"}]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0].message.content;
    const cleanedText = text.replace(/```json|```/g, "").trim();
    let questionsData;
    try {
      questionsData = JSON.parse(cleanedText);
    } catch {
      return res.status(500).json({ message: "AI returned an invalid response. Please try again." });
    }

    const savedQuestions = await Promise.all(
      questionsData.map(async (q) => {
        const question = await Question.create({
          sessionId,
          question: q.question,
          answer: q.answer,
        });
        return question;
      })
    );
    
    res.status(201).json({ message: savedQuestions.length + " questions generated", questions: savedQuestions });
  } catch (error) {
    console.log("EXACT ERROR:", error.message);
    res.status(500).json({ message: "AI generation failed", error: error.message });
  }
};

const explainQuestion = async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    const session = await Session.findByPk(question.sessionId);
    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const prompt = `Explain this interview question in detail. Question: ${question.question} Answer: ${question.answer} Cover why it is asked, key concepts, and tips to answer confidently.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const explanation = completion.choices[0].message.content;
    question.explanation = explanation;
    await question.save();
    res.json({ explanation, question });
  } catch (error) {
    console.log("EXACT ERROR:", error.message);
    res.status(500).json({ message: "AI explanation failed", error: error.message });
  }
};

const generateQuiz = async (req, res) => {
  try {
    const { sessionId, numberOfQuestions } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await Session.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const questions = await Question.findAll({ where: { sessionId } });
    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: "No questions in this session" });
    }

    let selectedQuestions = questions;
    if (numberOfQuestions && numberOfQuestions < selectedQuestions.length) {
      const shuffled = [...selectedQuestions].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, numberOfQuestions);
    }

    const questionsForQuiz = selectedQuestions.map((q) => ({
      questionId: q.id.toString(),
      question: q.question,
      correctAnswer: q.answer,
    }));

    const prompt = `You are a quiz generator for technical interviews. For each question below, generate 4 multiple-choice options where exactly 1 is correct. The correct option must be based on the provided correct answer. The 3 wrong options should be plausible but clearly incorrect to someone who knows the topic.

IMPORTANT RULES:
- Return ONLY a valid JSON array with no markdown
- Each item must have: questionId, options (array of 4 strings), correctIndex (0-3 indicating which option is correct)
- Shuffle the correct answer position randomly (don't always put it first)
- Make options concise (1-2 sentences max each)
- Wrong options should be believable but wrong

Questions:
${JSON.stringify(questionsForQuiz, null, 2)}

Return format: [{"questionId": "id", "options": ["option A", "option B", "option C", "option D"], "correctIndex": 2}]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0].message.content;
    const cleanedText = text.replace(/```json|```/g, "").trim();
    let quizData;
    try {
      quizData = JSON.parse(cleanedText);
    } catch {
      return res.status(500).json({ message: "AI returned an invalid quiz response. Please try again." });
    }

    const enrichedQuiz = quizData.map((q) => {
      const original = questionsForQuiz.find((oq) => oq.questionId === q.questionId);
      return {
        questionId: q.questionId,
        question: original?.question || "",
        options: q.options,
        correctIndex: q.correctIndex,
      };
    });

    res.json({ quiz: enrichedQuiz, totalQuestions: enrichedQuiz.length });
  } catch (error) {
    console.log("EXACT ERROR:", error.message);
    res.status(500).json({ message: "Quiz generation failed", error: error.message });
  }
};

const evaluateQuiz = async (req, res) => {
  try {
    const { sessionId, quizAnswers } = req.body;
    if (!sessionId || !quizAnswers || !Array.isArray(quizAnswers)) {
      return res.status(400).json({ message: "sessionId and quizAnswers array are required" });
    }

    const session = await Session.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const questions = await Question.findAll({ where: { sessionId } });

    let correctCount = 0;
    const results = quizAnswers.map((qa) => {
      const q = questions.find((qq) => qq.id.toString() === qa.questionId);
      const isCorrect = qa.selectedIndex === qa.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: qa.questionId,
        question: q?.question || "",
        correctAnswer: q?.answer || "",
        selectedIndex: qa.selectedIndex,
        correctIndex: qa.correctIndex,
        selectedOption: qa.selectedOption || "",
        correctOption: qa.correctOption || "",
        isCorrect,
      };
    });

    const totalQuestions = results.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    res.json({
      correctCount,
      totalQuestions,
      percentage,
      results,
    });
  } catch (error) {
    console.log("EXACT ERROR:", error.message);
    res.status(500).json({ message: "Quiz evaluation failed", error: error.message });
  }
};

const evaluateTest = async (req, res) => {
  try {
    const { sessionId, answers } = req.body;
    if (!sessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "sessionId and answers array are required" });
    }

    const session = await Session.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const questions = await Question.findAll({ where: { sessionId } });
    const questionsForEval = answers.map((a) => {
      const q = questions.find((qq) => qq.id.toString() === a.questionId);
      return {
        questionId: a.questionId,
        question: q?.question || "",
        correctAnswer: q?.answer || "",
        userAnswer: a.userAnswer || "(no answer provided)",
      };
    });

    const prompt = `You are an interview answer evaluator. Evaluate each user answer by comparing it to the correct answer. For each question, provide a score from 0 to 10 and brief feedback (1-2 sentences). Be fair - partial answers deserve partial credit. Return ONLY a valid JSON array with no markdown: [{"questionId": "id", "score": 8, "feedback": "Good explanation but missed X concept"}]

Questions to evaluate:
${JSON.stringify(questionsForEval, null, 2)}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const text = completion.choices[0].message.content;
    const cleanedText = text.replace(/```json|```/g, "").trim();
    let results;
    try {
      results = JSON.parse(cleanedText);
    } catch {
      return res.status(500).json({ message: "AI returned an invalid evaluation. Please try again." });
    }

    const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
    const maxScore = results.length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    const enrichedResults = results.map((r) => {
      const original = questionsForEval.find((q) => q.questionId === r.questionId);
      return {
        ...r,
        question: original?.question || "",
        correctAnswer: original?.correctAnswer || "",
        userAnswer: questionsForEval.find((q) => q.questionId === r.questionId)?.userAnswer || "",
      };
    });

    res.json({
      totalScore,
      maxScore,
      percentage,
      totalQuestions: results.length,
      results: enrichedResults,
    });
  } catch (error) {
    console.log("EXACT ERROR:", error.message);
    res.status(500).json({ message: "AI evaluation failed", error: error.message });
  }
};

async function generateFromResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF file" });
    }

    const pdfParse = require("pdf-parse");
    const fs = require("fs");

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    fs.unlinkSync(req.file.path);

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ message: "Could not extract enough text from the resume. Please upload a valid PDF." });
    }

    const { role, numberOfQuestions = 10, difficulty = "Medium" } = req.body;
    const targetRole = role || "Software Developer";

    const extractPrompt = `Analyze this resume and extract: the candidate's name, top skills, experience level (years), and key technologies. Return ONLY valid JSON with no markdown:
{"name": "...", "skills": ["skill1", "skill2"], "experience": "X years", "technologies": ["tech1", "tech2"], "summary": "brief 1-line summary"}

Resume text:
${resumeText.substring(0, 3000)}`;

    const extractCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: extractPrompt }],
      model: "llama-3.3-70b-versatile",
    });

    let profileData;
    try {
      const extractText = extractCompletion.choices[0].message.content.replace(/```json|```/g, "").trim();
      profileData = JSON.parse(extractText);
    } catch {
      profileData = { name: "Candidate", skills: [], experience: "Unknown", technologies: [], summary: "Resume analyzed" };
    }

    const questionPrompt = `Based on this candidate's resume, generate ${numberOfQuestions} targeted ${difficulty}-level interview questions for a ${targetRole} position.

Candidate Profile:
- Skills: ${(profileData.skills || []).join(", ")}
- Technologies: ${(profileData.technologies || []).join(", ")}
- Experience: ${profileData.experience || "Not specified"}

Generate questions that:
1. Test their claimed skills and technologies
2. Are relevant to the ${targetRole} role
3. Mix technical, behavioral, and scenario-based questions
4. Consistently match the requested difficulty: ${difficulty}

Return ONLY a valid JSON array with no markdown: [{"question": "...", "answer": "..."}]`;

    const questionCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: questionPrompt }],
      model: "llama-3.3-70b-versatile",
    });

    const questionText = questionCompletion.choices[0].message.content.replace(/```json|```/g, "").trim();
    const questionsData = JSON.parse(questionText);

    const session = await Session.create({
      userId: req.user.id,
      role: targetRole,
      experience: profileData.experience ? parseInt(profileData.experience) || 0 : 0,
      description: `Resume-based: ${profileData.summary || "Questions generated from uploaded resume"}`,
      difficulty,
    });

    const savedQuestions = await Promise.all(
      questionsData.map(async (q) => {
        const question = await Question.create({
          sessionId: session.id,
          question: q.question,
          answer: q.answer,
        });
        return question;
      })
    );

    res.status(201).json({
      message: `${savedQuestions.length} questions generated from your resume!`,
      session: session,
      profile: profileData,
      questions: savedQuestions,
    });
  } catch (error) {
    if (req.file && require("fs").existsSync(req.file.path)) {
      require("fs").unlinkSync(req.file.path);
    }
    console.log("RESUME ERROR:", error.message);
    res.status(500).json({ message: "Failed to process resume", error: error.message });
  }
}

module.exports = { generateQuestions, explainQuestion, evaluateTest, generateQuiz, evaluateQuiz, generateFromResume };