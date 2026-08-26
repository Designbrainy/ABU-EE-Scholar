// EE Scholar AI — Voice Tutor
//
// Uses the browser's own built-in speech engine — no third-party voice
// service, no API keys, no external account needed. Works the moment the
// site is deployed.
//
//   Speech-to-text: Web Speech API (SpeechRecognition) — turns what the
//                    student says into text.
//   Brain:          the SAME /api/chat endpoint the text chat uses (with a
//                    voiceMode flag so replies are phrased for speaking
//                    aloud, not for reading — see ee-brain.mts).
//   Text-to-speech: Web Speech API (speechSynthesis) — reads the reply back.
//
// Browser support: SpeechRecognition works well in Chrome on Android/desktop.
// It is NOT supported in Firefox or (fully) in Safari — those browsers will
// see a clear "not supported" message instead of a dead button.

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  let recognizer = null;
  let sessionActive = false;
  let voiceHistory = []; // { role: 'user' | 'assistant', content } — separate from the text-chat transcript
  let currentLang = "en-US"; // switches to Hausa if the student asks, see maybeSwitchLanguage()

  function setState(state) {
    const orb = $("voiceOrb");
    const status = $("voiceStatusText");
    orb.classList.remove("listening", "thinking", "speaking");
    if (state === "idle") {
      status.textContent = "Tap Start to talk";
      $("voiceStartBtn").classList.remove("hidden");
      $("voiceEndBtn").classList.add("hidden");
    } else if (state === "listening") {
      status.textContent = "Listening...";
      orb.classList.add("listening");
    } else if (state === "thinking") {
      status.textContent = "Thinking...";
      orb.classList.add("thinking");
    } else if (state === "speaking") {
      status.textContent = "Speaking...";
      orb.classList.add("speaking");
    }
  }

  function openModal() {
    $("voiceHintText").textContent = 'Ask a question, then wait for the reply. Say "explain again" or "speak Hausa" any time.';
    $("voiceModal").classList.add("active");
    setState("idle");
    if (!SpeechRecognitionCtor) {
      $("voiceHintText").textContent =
        "Voice input isn't supported in this browser. Please try Chrome on Android or desktop.";
      $("voiceStartBtn").disabled = true;
    }
  }

  function closeModal() {
    if (sessionActive) endSession();
    $("voiceModal").classList.remove("active");
  }

  function maybeSwitchLanguage(text) {
    const lower = text.toLowerCase();
    if (lower.includes("speak hausa") || lower.includes("in hausa") || lower.includes("hausa language")) {
      currentLang = "ha-NG";
    } else if (lower.includes("speak english") || lower.includes("in english")) {
      currentLang = "en-US";
    }
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      synth.cancel(); // stop anything currently playing
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = currentLang;
      utter.rate = 1;
      utter.onend = resolve;
      utter.onerror = resolve;
      synth.speak(utter);
    });
  }

  async function askBrain(question) {
    voiceHistory.push({ role: "user", content: question });
    const courseSelect = $("courseSelect");
    const courseCode = courseSelect ? courseSelect.value : undefined;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: voiceHistory.slice(-14),
        courseCode,
        voiceMode: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "The AI tutor is temporarily unavailable.");
    voiceHistory.push({ role: "assistant", content: data.reply });
    return data.reply;
  }

  function listenOnce() {
    return new Promise((resolve, reject) => {
      recognizer = new SpeechRecognitionCtor();
      recognizer.lang = currentLang;
      recognizer.interimResults = false;
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      recognizer.onerror = (event) => reject(new Error(event.error || "Speech recognition error"));
      recognizer.onend = () => { /* handled via onresult/onerror */ };
      recognizer.start();
    });
  }

  async function conversationLoop() {
    while (sessionActive) {
      setState("listening");
      let transcript;
      try {
        transcript = await listenOnce();
      } catch (err) {
        if (!sessionActive) return; // ended intentionally
        if (err.message === "no-speech" || err.message === "aborted") continue; // just try again
        $("voiceHintText").textContent = "Didn't catch that — " + err.message;
        continue;
      }
      if (!sessionActive) return;
      if (!transcript || !transcript.trim()) continue;

      maybeSwitchLanguage(transcript);
      setState("thinking");
      let reply;
      try {
        reply = await askBrain(transcript);
      } catch (err) {
        reply = err.message || "Sorry, something went wrong. Please try again.";
      }
      if (!sessionActive) return;

      setState("speaking");
      await speak(reply);
    }
  }

  function startSession() {
    if (!SpeechRecognitionCtor) return;
    sessionActive = true;
    voiceHistory = [];
    $("voiceStartBtn").classList.add("hidden");
    $("voiceEndBtn").classList.remove("hidden");
    conversationLoop();
  }

  function endSession() {
    sessionActive = false;
    if (recognizer) {
      try { recognizer.abort(); } catch (e) { /* no-op */ }
    }
    if (synth) synth.cancel();
    setState("idle");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const toolBtn = $("voiceToolBtn");
    if (!toolBtn) return; // header not present (e.g. gate screen)
    toolBtn.addEventListener("click", openModal);
    $("voiceStartBtn").addEventListener("click", startSession);
    $("voiceEndBtn").addEventListener("click", endSession);
    $("voiceCloseBtn").addEventListener("click", closeModal);
  });
})();
