import express from "express";
import fs from "fs";
import cors from "cors";
const app = express();
app.use(cors());
app.get("/jobs", (req, res) => {
  const jobs = JSON.parse(fs.readFileSync("top_jobs.json"));
  res.json(jobs);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on ${PORT}`));