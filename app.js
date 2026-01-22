import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Available models with proper registry
const AVAILABLE_MODELS = {
    "Llama-2-7B-chat-hf-q4f16_1-MLC": "Llama 2 7B",
    "Llama-3-8B-Instruct-q4f16_1-MLC": "Llama 3 8B",
    "Mistral-7B-Instruct-v0.2-q4f16_1-MLC": "Mistral 7B",
    "phi-2-q4f16_1-MLC": "Phi 2 (Fast)"
};

let selectedModel = localStorage.getItem("selectedModel") || "Llama-2-7B-chat-hf-q4f16_1-MLC";

// DOM Elements
const messagesContainer = document.getElementById("messages");
const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusDot = document.querySelector(".status-dot");
const statusText = document.getElementById("status-text");
const progressBar = document.getElementById("progress-bar");
const welcomeScreen = document.getElementById("welcome-screen");
const modelChoice = document.getElementById("model-choice");
const modelName = document.getElementById("model-name");

let engine = null;

// Handle model selection change
modelChoice.addEventListener("change", async (e) => {
    selectedModel = e.target.value;
    localStorage.setItem("selectedModel", selectedModel);
    statusText.innerText = "Downloading model...";
    statusDot.style.background = "#ffaa00";
    progressBar.style.width = "0%";
    sendBtn.disabled = true;
    engine = null;
    await initEngine();
});

// Initialize Engine with aggressive caching
async function initEngine() {
    try {
        statusText.innerText = "Loading Model...";
        statusDot.style.background = "#ffaa00";

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

        // Initialize with proper model registry
        engine = await webllm.CreateMLCEngine(selectedModel, {
            initProgressCallback: initProgressCallback,
        });

        statusText.innerText = "✅ Ready to Chat";
        statusDot.style.background = "#00ff88";
        progressBar.style.width = "100%";
        sendBtn.disabled = false;
        modelName.innerText = AVAILABLE_MODELS[selectedModel] || selectedModel;
        modelChoice.value = selectedModel;
        
        // Store model as downloaded
        localStorage.setItem(`model_cached_${selectedModel}`, "true");

        console.log("✅ Model Ready: " + selectedModel);
    } catch (error) {
        console.error("Failed to load model:", error);
        statusText.innerText = "⚠️ GPU Required";
        statusDot.style.background = "#ff4d4d";
        sendBtn.disabled = true;
        
        // Show persistent help
        const helpMsg = document.createElement("div");
        helpMsg.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255,77,77,0.95); color: white; padding: 20px; border-radius: 12px; max-width: 400px; text-align: center; z-index: 9999; font-size: 12px; line-height: 1.6; font-family: monospace;";
        helpMsg.innerHTML = `
            <strong>⚠️ Browser GPU Not Available</strong><br>
            <small style="display: block; margin-top: 10px;">
                <strong>Chrome/Edge:</strong> DevTools (F12) → ⚙️ Settings → Experiments → Enable "Unsafe WebGPU"<br>
                <strong>Firefox:</strong> about:config → dom.webgpu.enabled = true<br>
                <strong>Safari:</strong> Develop → WebGPU Experimental Features
            </small>
        `;
        document.body.appendChild(helpMsg);
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

// Start initialization immediately (not waiting for page load)
const startInit = async () => {
    if (!navigator.gpu) {
        console.warn("⚠️ WebGPU not available - will attempt fallback");
    }
    await initEngine();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startInit);
} else {
    startInit();
}
