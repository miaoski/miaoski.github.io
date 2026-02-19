const fs = require("fs");
const files = ["w01d3.json", "w01d7.json", "w02d1.json", "w03d4.json", "w05d2.json"];
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const lesson = JSON.parse(fs.readFileSync(file));
  const vocabSection = lesson.sections.find(s => s.type === "vocab");
  if (vocabSection && vocabSection.items) {
    console.log(file + ": " + vocabSection.items.length + " vocab items");
    vocabSection.items.forEach(item => {
      const hasIssue = item.english.includes("|");
      if (hasIssue) console.log("  ISSUE: " + item.lojban + " = " + item.english);
    });
  }
});
