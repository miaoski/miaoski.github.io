(() => {
  // src/js/router.js
  var currentRoute = null;
  var routeHandler = null;
  function init(handler) {
    routeHandler = handler;
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  }
  function handleHashChange() {
    const hash = window.location.hash.slice(1) || "";
    if (hash === currentRoute)
      return;
    currentRoute = hash;
    const route = parseRoute(hash);
    if (routeHandler) {
      routeHandler(route);
    }
  }
  function parseRoute(hash) {
    if (!hash || hash === "/") {
      return { type: "home" };
    }
    const lessonMatch = hash.match(/^(w\d{2}d\d)$/);
    if (lessonMatch) {
      return { type: "lesson", id: lessonMatch[1] };
    }
    const weekMatch = hash.match(/^week\/(\d+)$/);
    if (weekMatch) {
      return { type: "week", weekNum: parseInt(weekMatch[1], 10) };
    }
    if (hash === "settings") {
      return { type: "settings" };
    }
    return { type: "home" };
  }
  function navigate(path) {
    window.location.hash = path;
  }
  function lessonId(week, day) {
    return `w${String(week).padStart(2, "0")}d${day}`;
  }
  function parseLesson(id) {
    const match = id.match(/^w(\d{2})d(\d)$/);
    if (!match)
      return null;
    return {
      week: parseInt(match[1], 10),
      day: parseInt(match[2], 10)
    };
  }
  function nextLesson(id) {
    const parsed = parseLesson(id);
    if (!parsed)
      return null;
    if (parsed.day < 7) {
      return lessonId(parsed.week, parsed.day + 1);
    } else if (parsed.week < 30) {
      return lessonId(parsed.week + 1, 1);
    }
    return null;
  }
  function prevLesson(id) {
    const parsed = parseLesson(id);
    if (!parsed)
      return null;
    if (parsed.day > 1) {
      return lessonId(parsed.week, parsed.day - 1);
    } else if (parsed.week > 1) {
      return lessonId(parsed.week - 1, 7);
    }
    return null;
  }

  // src/js/progress.js
  var STORAGE_KEY = "lojban-progress";
  var VERSION = 1;
  function getDefaultState() {
    return {
      version: VERSION,
      currentLesson: null,
      completed: {},
      exerciseState: {},
      settings: {
        fontSize: "medium"
      }
    };
  }
  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored)
        return getDefaultState();
      const data = JSON.parse(stored);
      if (data.version !== VERSION) {
        return { ...getDefaultState(), ...data, version: VERSION };
      }
      return data;
    } catch (e) {
      console.error("Failed to load progress:", e);
      return getDefaultState();
    }
  }
  function save(state2) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state2));
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  }
  var state = load();
  function setCurrentLesson(lessonId2) {
    state.currentLesson = lessonId2;
    save(state);
  }
  function markCompleted(lessonId2) {
    state.completed[lessonId2] = true;
    save(state);
  }
  function getWeekProgress(weekNum) {
    let completed = 0;
    for (let day = 1; day <= 7; day++) {
      const id = `w${String(weekNum).padStart(2, "0")}d${day}`;
      if (state.completed[id])
        completed++;
    }
    return { completed, total: 7 };
  }
  function getNextIncompleteDay(weekNum) {
    for (let day = 1; day <= 7; day++) {
      const id = `w${String(weekNum).padStart(2, "0")}d${day}`;
      if (!state.completed[id])
        return day;
    }
    return 7;
  }
  function getExerciseState(lessonId2) {
    return state.exerciseState[lessonId2] || {};
  }
  function setExerciseState(lessonId2, exerciseId, answered, correct) {
    if (!state.exerciseState[lessonId2]) {
      state.exerciseState[lessonId2] = {};
    }
    state.exerciseState[lessonId2][exerciseId] = { answered, correct };
    save(state);
  }
  function resetProgress() {
    state = getDefaultState();
    save(state);
  }
  function getCompletedCount() {
    return Object.keys(state.completed).length;
  }

  // src/js/exercises.js
  function normalize(str) {
    return str.toLowerCase().trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/^\.+|\.+$/g, "").replace(/\./g, "");
  }
  function checkAnswer(userAnswer, correctAnswer) {
    const normalizedUser = normalize(userAnswer);
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some((ans) => normalize(ans) === normalizedUser);
    }
    return normalize(correctAnswer) === normalizedUser;
  }
  function createFillBlank(item, index, lessonId2) {
    const div = document.createElement("div");
    div.className = "exercise-item";
    div.dataset.index = index;
    const prompt = document.createElement("div");
    prompt.className = "exercise-prompt";
    prompt.textContent = item.prompt;
    div.appendChild(prompt);
    const inputRow = document.createElement("div");
    inputRow.className = "exercise-input-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "exercise-input";
    input.placeholder = "Your answer...";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    const checkBtn = document.createElement("button");
    checkBtn.className = "check-btn";
    checkBtn.textContent = "Check";
    inputRow.appendChild(input);
    inputRow.appendChild(checkBtn);
    div.appendChild(inputRow);
    const feedback = document.createElement("div");
    feedback.className = "exercise-feedback hidden";
    div.appendChild(feedback);
    const savedState = getExerciseState(lessonId2)[`ex${index}`];
    if (savedState?.answered) {
      input.value = savedState.correct ? item.answer : "";
      input.disabled = true;
      checkBtn.disabled = true;
      input.classList.add(savedState.correct ? "correct" : "incorrect");
      if (!savedState.correct) {
        feedback.textContent = `Correct answer: ${item.answer}`;
        feedback.classList.remove("hidden");
        feedback.classList.add("incorrect");
      }
    }
    checkBtn.addEventListener("click", () => {
      const userAnswer = input.value;
      const isCorrect = checkAnswer(userAnswer, item.answer);
      input.disabled = true;
      checkBtn.disabled = true;
      if (isCorrect) {
        input.classList.add("correct");
        feedback.textContent = "\u2713 Correct!";
        feedback.classList.add("correct");
      } else {
        input.classList.add("incorrect");
        feedback.textContent = `\u2717 Correct answer: ${Array.isArray(item.answer) ? item.answer[0] : item.answer}`;
        feedback.classList.add("incorrect");
      }
      feedback.classList.remove("hidden");
      setExerciseState(lessonId2, `ex${index}`, true, isCorrect);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !checkBtn.disabled) {
        checkBtn.click();
      }
    });
    return div;
  }
  function createReveal(item, index) {
    const div = document.createElement("div");
    div.className = "exercise-item";
    const prompt = document.createElement("div");
    prompt.className = "exercise-prompt";
    prompt.textContent = item.prompt;
    div.appendChild(prompt);
    if (item.answer) {
      const revealBtn = document.createElement("button");
      revealBtn.className = "reveal-btn";
      revealBtn.textContent = "Show Answer";
      div.appendChild(revealBtn);
      const answer = document.createElement("div");
      answer.className = "revealed-answer hidden";
      answer.textContent = item.answer;
      div.appendChild(answer);
      revealBtn.addEventListener("click", () => {
        answer.classList.remove("hidden");
        revealBtn.classList.add("hidden");
      });
    }
    return div;
  }
  function createMatching(items, lessonId2) {
    const container = document.createElement("div");
    container.className = "matching-container";
    const leftItems = items.map((item, i) => ({ text: item.prompt, index: i }));
    const rightItems = items.map((item, i) => ({ text: item.answer, index: i }));
    shuffleArray(rightItems);
    const leftCol = document.createElement("div");
    leftCol.className = "matching-column";
    const rightCol = document.createElement("div");
    rightCol.className = "matching-column";
    let selectedLeft = null;
    let matchedCount = 0;
    leftItems.forEach((item) => {
      const el = document.createElement("div");
      el.className = "matching-item";
      el.textContent = item.text;
      el.dataset.index = item.index;
      el.dataset.side = "left";
      el.addEventListener("click", () => handleMatchClick(el, "left"));
      leftCol.appendChild(el);
    });
    rightItems.forEach((item) => {
      const el = document.createElement("div");
      el.className = "matching-item";
      el.textContent = item.text;
      el.dataset.index = item.index;
      el.dataset.side = "right";
      el.addEventListener("click", () => handleMatchClick(el, "right"));
      rightCol.appendChild(el);
    });
    container.appendChild(leftCol);
    container.appendChild(rightCol);
    function handleMatchClick(el, side) {
      if (el.classList.contains("matched"))
        return;
      if (side === "left") {
        leftCol.querySelectorAll(".matching-item").forEach((item) => {
          item.classList.remove("selected");
        });
        el.classList.add("selected");
        selectedLeft = el;
      } else if (selectedLeft) {
        const leftIndex = selectedLeft.dataset.index;
        const rightIndex = el.dataset.index;
        if (leftIndex === rightIndex) {
          selectedLeft.classList.remove("selected");
          selectedLeft.classList.add("matched");
          el.classList.add("matched");
          matchedCount++;
          selectedLeft = null;
          if (matchedCount === items.length) {
            setExerciseState(lessonId2, "matching", true, true);
          }
        } else {
          el.classList.add("wrong");
          selectedLeft.classList.add("wrong");
          setTimeout(() => {
            el.classList.remove("wrong");
            selectedLeft.classList.remove("wrong", "selected");
            selectedLeft = null;
          }, 300);
        }
      }
    }
    return container;
  }
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // src/js/renderer.js
  function renderHome(weekProgress) {
    const container = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "Lojban 30-Week Course";
    container.appendChild(title);
    const grid = document.createElement("div");
    grid.className = "week-grid";
    for (let week = 1; week <= 30; week++) {
      const progress = weekProgress(week);
      const card = document.createElement("div");
      card.className = "week-card";
      card.dataset.week = week;
      const cardTitle = document.createElement("div");
      cardTitle.className = "week-card-title";
      cardTitle.textContent = `Week ${week}`;
      card.appendChild(cardTitle);
      const progressText2 = document.createElement("div");
      progressText2.className = "week-card-progress";
      progressText2.textContent = `${progress.completed}/${progress.total} days`;
      card.appendChild(progressText2);
      const bar = document.createElement("div");
      bar.className = "week-card-bar";
      const fill = document.createElement("div");
      fill.className = "week-card-bar-fill";
      fill.style.width = `${progress.completed / progress.total * 100}%`;
      bar.appendChild(fill);
      card.appendChild(bar);
      grid.appendChild(card);
    }
    container.appendChild(grid);
    return container;
  }
  function renderLesson(lesson) {
    const container = document.createElement("div");
    container.className = "lesson";
    if (lesson.goal) {
      const goalBlock = document.createElement("blockquote");
      goalBlock.innerHTML = `<strong>Today's goal:</strong> ${lesson.goal}`;
      container.appendChild(goalBlock);
    }
    lesson.sections.forEach((section, sectionIndex) => {
      const sectionEl = renderSection(section, sectionIndex, lesson.id);
      container.appendChild(sectionEl);
    });
    return container;
  }
  function renderSection(section, sectionIndex, lessonId2) {
    const div = document.createElement("div");
    div.className = "lesson-section";
    div.id = `section-${sectionIndex}`;
    switch (section.type) {
      case "warmup":
        div.innerHTML = `<h2>Warm-up</h2>${section.content}`;
        break;
      case "material":
        div.innerHTML = `<h2>New Material</h2>${section.content}`;
        if (section.keyPoint) {
          const kp = document.createElement("blockquote");
          kp.innerHTML = `<strong>Key Point:</strong> ${section.keyPoint}`;
          div.appendChild(kp);
        }
        break;
      case "practice":
        div.innerHTML = `<h2>Practice</h2>`;
        if (section.exercises) {
          section.exercises.forEach((exercise, exIndex) => {
            const exEl = renderExercise(exercise, exIndex, lessonId2);
            div.appendChild(exEl);
          });
        } else if (section.content) {
          div.innerHTML += section.content;
        }
        break;
      case "conversation":
        div.innerHTML = `<h2>Conversation Challenge</h2>`;
        if (section.prompts && section.prompts.length > 0) {
          section.prompts.forEach((prompt, i) => {
            const item = createReveal(
              { prompt: prompt.prompt, answer: prompt.answer },
              `conv-${i}`
            );
            div.appendChild(item);
          });
        } else if (section.content) {
          div.innerHTML += section.content;
        }
        break;
      case "vocab":
        div.innerHTML = `<h2>Today's Vocab</h2>`;
        const table = renderVocabTable(section.items);
        div.appendChild(table);
        break;
      case "summary":
        div.innerHTML = `<h2>Summary</h2>${section.content}`;
        if (section.tomorrow) {
          const preview = document.createElement("p");
          preview.innerHTML = `<strong>Tomorrow:</strong> ${section.tomorrow}`;
          div.appendChild(preview);
        }
        break;
      default:
        if (section.title) {
          div.innerHTML = `<h2>${section.title}</h2>`;
        }
        if (section.content) {
          div.innerHTML += section.content;
        }
    }
    return div;
  }
  function renderExercise(exercise, exIndex, lessonId2) {
    const div = document.createElement("div");
    div.className = "exercise";
    const instructions = document.createElement("div");
    instructions.className = "exercise-instructions";
    instructions.textContent = exercise.instructions || "";
    div.appendChild(instructions);
    if (!exercise.items || exercise.items.length === 0) {
      return div;
    }
    switch (exercise.type) {
      case "fill-blank":
      case "translation-to-english":
      case "translation-to-lojban":
      case "error-correction":
        exercise.items.forEach((item, i) => {
          const itemEl = createFillBlank(
            item,
            `${exIndex}-${i}`,
            lessonId2
          );
          div.appendChild(itemEl);
        });
        break;
      case "matching":
        const matching = createMatching(exercise.items, lessonId2);
        div.appendChild(matching);
        break;
      case "pronunciation":
      case "free-production":
      default:
        exercise.items.forEach((item, i) => {
          const itemEl = createReveal(item, `${exIndex}-${i}`);
          div.appendChild(itemEl);
        });
        break;
    }
    return div;
  }
  function renderVocabTable(items) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    const table = document.createElement("table");
    table.innerHTML = `
    <thead>
      <tr>
        <th>Lojban</th>
        <th>Place Structure</th>
        <th>English</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
    const tbody = table.querySelector("tbody");
    items.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td><code>${item.lojban}</code></td>
      <td>${item.place}</td>
      <td>${item.english}</td>
    `;
      tbody.appendChild(row);
    });
    wrapper.appendChild(table);
    return wrapper;
  }
  function renderSectionTabs(sections) {
    const tabs = [];
    sections.forEach((section, index) => {
      let label = "";
      switch (section.type) {
        case "warmup":
          label = "Warm-up";
          break;
        case "material":
          label = "Learn";
          break;
        case "practice":
          label = "Practice";
          break;
        case "conversation":
          label = "Speak";
          break;
        case "vocab":
          label = "Vocab";
          break;
        case "summary":
          label = "Summary";
          break;
        default:
          label = section.title || "Section";
      }
      tabs.push({ label, index });
    });
    return tabs;
  }

  // src/js/app.js
  var headerTitle = document.getElementById("header-title");
  var backBtn = document.getElementById("back-btn");
  var settingsBtn = document.getElementById("settings-btn");
  var progressBar = document.getElementById("progress-bar");
  var progressFill = document.getElementById("progress-fill");
  var progressText = document.getElementById("progress-text");
  var sectionTabs = document.getElementById("section-tabs");
  var content = document.getElementById("content");
  var footer = document.getElementById("footer");
  var prevBtn = document.getElementById("prev-btn");
  var nextBtn = document.getElementById("next-btn");
  var currentLesson = null;
  function init2() {
    init(handleRoute);
    backBtn.addEventListener("click", handleBack);
    settingsBtn.addEventListener("click", showSettings);
    prevBtn.addEventListener("click", handlePrev);
    nextBtn.addEventListener("click", handleNext);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => console.log("SW registered")).catch((err) => console.log("SW registration failed:", err));
    }
  }
  async function handleRoute(route) {
    switch (route.type) {
      case "home":
        showHome();
        break;
      case "lesson":
        await showLesson(route.id);
        break;
      case "week":
        showWeek(route.weekNum);
        break;
      default:
        showHome();
    }
  }
  function showHome() {
    headerTitle.textContent = "Lojban Course";
    backBtn.classList.add("hidden");
    progressBar.classList.add("hidden");
    sectionTabs.innerHTML = "";
    footer.classList.add("hidden");
    const homeContent = renderHome(getWeekProgress);
    content.innerHTML = "";
    content.appendChild(homeContent);
    content.querySelectorAll(".week-card").forEach((card) => {
      card.addEventListener("click", () => {
        const week = parseInt(card.dataset.week, 10);
        const nextDay = getNextIncompleteDay(week);
        navigate(lessonId(week, nextDay));
      });
    });
  }
  async function showLesson(lessonId2) {
    try {
      const response = await fetch(`/lessons/${lessonId2}.json`);
      if (!response.ok)
        throw new Error("Lesson not found");
      const lesson = await response.json();
      currentLesson = lesson;
      headerTitle.textContent = `Week ${lesson.week} \xB7 Day ${lesson.day}`;
      backBtn.classList.remove("hidden");
      progressBar.classList.remove("hidden");
      const dayProgress = lesson.day / 7 * 100;
      progressFill.style.setProperty("--progress", `${dayProgress}%`);
      progressText.textContent = `Day ${lesson.day}/7`;
      const tabs = renderSectionTabs(lesson.sections);
      sectionTabs.innerHTML = "";
      tabs.forEach((tab, i) => {
        const btn = document.createElement("button");
        btn.className = "section-tab";
        btn.textContent = tab.label;
        btn.addEventListener("click", () => {
          document.getElementById(`section-${tab.index}`)?.scrollIntoView({
            behavior: "smooth"
          });
          sectionTabs.querySelectorAll(".section-tab").forEach((t) => t.classList.remove("active"));
          btn.classList.add("active");
        });
        sectionTabs.appendChild(btn);
      });
      const lessonContent = renderLesson(lesson);
      content.innerHTML = "";
      content.appendChild(lessonContent);
      footer.classList.remove("hidden");
      const prev = prevLesson(lessonId2);
      const next = nextLesson(lessonId2);
      prevBtn.disabled = !prev;
      nextBtn.disabled = !next;
      nextBtn.textContent = next ? "Next Day \u2192" : "Course Complete!";
      setCurrentLesson(lessonId2);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Failed to load lesson:", err);
      content.innerHTML = `<p>Failed to load lesson. <a href="#">Go home</a></p>`;
    }
  }
  function handleBack() {
    if (currentLesson) {
      navigate("");
    }
  }
  function handlePrev() {
    if (!currentLesson)
      return;
    const prev = prevLesson(currentLesson.id);
    if (prev)
      navigate(prev);
  }
  function handleNext() {
    if (!currentLesson)
      return;
    markCompleted(currentLesson.id);
    const next = nextLesson(currentLesson.id);
    if (next) {
      navigate(next);
    } else {
      navigate("");
    }
  }
  function showSettings() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
    <button class="modal-close">&times;</button>
    <h2>Settings</h2>
    <p>Progress: ${getCompletedCount()}/210 lessons completed</p>
    <button id="reset-btn" style="margin-top: 1rem; color: var(--error);">Reset Progress</button>
  `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    modal.querySelector(".modal-close").addEventListener("click", () => {
      backdrop.remove();
    });
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop)
        backdrop.remove();
    });
    modal.querySelector("#reset-btn").addEventListener("click", () => {
      if (confirm("Reset all progress? This cannot be undone.")) {
        resetProgress();
        backdrop.remove();
        showHome();
      }
    });
  }
  init2();
})();
