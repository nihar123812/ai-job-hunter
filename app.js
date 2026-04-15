import axios from "axios";
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
const CHAT_ID = process.env.CHAT_ID;

const KEYWORDS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
"Software Engineer Fresher",
  "Entry Level Software Engineer",
  "Junior Developer",
  "Graduate Engineer Trainee",
  "Intern Software Engineer"
];

const LOCATION = "India";

// Fetch jobs
async function fetchJobs() {
  let allJobs = [];

  for (let keyword of KEYWORDS) {
    const url = `https://jsearch.p.rapidapi.com/search?query=${keyword} in ${LOCATION}&page=1&num_pages=1`;

    const res = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
      }
    });

    const jobs = res.data.data.map(job => ({
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city,
      description: job.job_description,
      applyLink: job.job_apply_link
    }));

    allJobs.push(...jobs);
  }

  return allJobs;
}

// Filter fresher jobs
function filterFresherJobs(jobs) {
  return jobs.filter(job => {
    const text = (job.description || "").toLowerCase();
    const title = (job.title || "").toLowerCase();

    // 🎯 CSE roles only
    const csKeywords = [
      "software",
      "developer",
      "engineer",
      "backend",
      "frontend",
      "full stack",
      "data",
      "machine learning",
      "ai",
      "web",
      "programmer"
    ];

    const isCS = csKeywords.some(k => title.includes(k) || text.includes(k));

    // 🎯 Strict fresher patterns
    const fresherPatterns = [
      "0 year",
      "0-1",
      "0 to 1",
      "0–1",
      "<1 year",
      "less than 1 year",
      "fresher",
      "entry level",
      "intern",
      "trainee",
      "junior"
    ];

    const isFresher = fresherPatterns.some(p => text.includes(p));

    // ❌ Reject higher experience
    const rejectPatterns = [
      "2+",
      "3+",
      "4+",
      "5+",
      "2 years",
      "3 years",
      "senior",
      "lead",
      "manager"
    ];

    const isSenior = rejectPatterns.some(p => text.includes(p));

    return isCS && isFresher && !isSenior;
  });
}


// AI scoring
async function analyzeJob(job, resumeText) {
  const prompt = `
You are a strict job classifier.

Check:
1. Is this a Computer Science related job?
2. Is experience required 0–1 years ONLY?

Reject if:
- More than 1 year required
- Non-CS job

Return ONLY JSON:
{
  "isRelevant": true/false,
  "score": number,
  "coverLetter": "2 paragraph cover letter"
}

Job Title: ${job.title}
Job Description: ${job.description}
Resume: ${resumeText}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(response.choices[0].message.content);
}


// Telegram alert
function sendTelegram(jobs) {
  jobs.forEach(job => {
    const msg = `
🚀 ${job.title}
🏢 ${job.company}
📍 ${job.location}

⭐ Score: ${job.score}

🔗 ${job.applyLink}
`;

    bot.sendMessage(CHAT_ID, msg);
  });
}

// Main function
async function main() {
  const resumeText = fs.readFileSync("resume.txt", "utf-8");

  let jobs = await fetchJobs();
  jobs = filterFresherJobs(jobs);

  let results = [];

  for (let job of jobs) {
    const ai = {
  isRelevant: true,
  score: Math.floor(Math.random() * 50) + 50,
  coverLetter: "Sample cover letter"
};

    results.push({
      ...job,
      score: ai.score,
      coverLetter: ai.coverLetter
    });
  }

  results.sort((a, b) => b.score - a.score);
  const topJobs = results.slice(0, 10);

  fs.writeFileSync("top_jobs.json", JSON.stringify(topJobs, null, 2));

  sendTelegram(topJobs);

  console.log("✅ Done! Jobs sent to Telegram");
}

main();