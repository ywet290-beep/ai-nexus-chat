import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Constants
const MODEL_ID = "Llama-3-8B-Instruct-q4f16_1-MLC";

// DOM Elements
const messagesContainer = document.getElementById("messages");
const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusDot = document.querySelector(".status-dot");
const statusText = document.getElementById("status-text");
const progressBar = document.getElementById("progress-bar");
const welcomeScreen = document.getElementById("welcome-screen");

let engine = null;

// Initialize Engine
async function initEngine() {
    try {
        statusText.innerText = "Initializing Engine...";

        // Callback for loading progress
        const initProgressCallback = (report) => {
            console.log(report.text);
            statusText.innerText = report.text;

            // Extract percentage if present (e.g., "Loading: 45%")
            const match = report.text.match(/(\d+)%/);
            if (match) {
                progressBar.style.width = match[1] + "%";
            }
        };

        engine = await webllm.CreateMLCEngine(
            MODEL_ID,
            { initProgressCallback }
        );

        statusText.innerText = "Online";
        statusDot.style.background = "#00ff88"; // Solid green
        progressBar.style.width = "100%";
        sendBtn.disabled = false;

        console.log("Web-LLM Engine Loaded Successfully");
    } catch (error) {
        console.error("Failed to load engine:", error);
        statusText.innerText = "WebGPU Not Supported";
        statusDot.style.background = "#ff4d4d";
    }
}

// Function to append messages to the UI
function appendMessage(role, text) {
    if (welcomeScreen) welcomeScreen.style.display = "none";

    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);

    // Auto-scroll
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
}

// Handle Sending Messages
async function handleSend() {
    const text = userInput.value.strip ? userInput.value.trim() : userInput.value;
    if (!text || !engine) return;

    // Clear input and sizing
    userInput.value = "";
    userInput.style.height = "auto";

    appendMessage("user", text);

    // Create AI response placeholder
    const aiMsgDiv = appendMessage("ai", "...");
    aiMsgDiv.innerText = ""; // Clear placeholder

    try {
        const messages = [
            { role: "system", content: "You are Nexus AI, a helpful and premium assistant running locally in the browser." },
            { role: "user", content: text }
        ];

        const chunks = await engine.chat.completions.create({
            messages,
            stream: true,
        });

        let aiResponse = "";
        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            aiResponse += content;
            aiMsgDiv.innerText = aiResponse; // Stream updating the message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error("Inference failed:", error);
        aiMsgDiv.innerText = "Error: Inference failed. Please check console.";
    }
}

// Event Listeners
sendBtn.addEventListener("click", handleSend);

userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-expand textarea
userInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Start initialization on load
window.addEventListener("load", initEngine);
