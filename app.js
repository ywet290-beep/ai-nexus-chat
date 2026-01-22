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

        // Check for WebGPU availability
        if (!navigator.gpu) {
            throw new Error("WebGPU not available - browser or environment doesn't support it");
        }

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
        statusText.innerText = "⚠️ WebGPU Required";
        statusDot.style.background = "#ff4d4d";
        sendBtn.disabled = true;
        
        // Show persistent help overlay
        const helpMsg = document.createElement("div");
        helpMsg.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;";
        helpMsg.innerHTML = `
            <div style="background: #1a1a1a; color: white; padding: 30px; border-radius: 16px; max-width: 500px; border: 2px solid #ff4d4d; text-align: center; font-family: 'Plus Jakarta Sans', sans-serif;">
                <h2 style="margin: 0 0 20px 0; color: #ff4d4d;">⚠️ GPU Not Available</h2>
                <p style="margin: 0 0 20px 0; color: #aaa; line-height: 1.6;">This browser or environment doesn't support WebGPU. You need to use a modern browser with GPU acceleration.</p>
                
                <div style="background: #222; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
                    <p style="margin: 0 0 15px 0; font-weight: 600; color: #7c4dff;">✅ Recommended:</p>
                    <p style="margin: 0; font-size: 13px; color: #bbb;"><strong>Chrome/Edge:</strong> Latest version</p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">DevTools (F12) → ⚙️ → Experiments → Enable "Unsafe WebGPU"</p>
                </div>
                
                <div style="background: #222; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
                    <p style="margin: 0 0 15px 0; font-weight: 600; color: #7c4dff;">✅ Alternative:</p>
                    <p style="margin: 0; font-size: 13px; color: #bbb;"><strong>Firefox:</strong> Type in address bar:</p>
                    <p style="margin: 10px 0 0 0; padding: 10px; background: #1a1a1a; border-radius: 8px; font-family: monospace; font-size: 12px; color: #0f0; word-break: break-all;">about:config</p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Search "dom.webgpu.enabled" and toggle to <strong>true</strong></p>
                </div>
                
                <a href="https://ywet290-beep.github.io/ai-nexus-chat" target="_blank" style="display: inline-block; background: #7c4dff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: 600; border: none; cursor: pointer;">Open in New Tab</a>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">Try opening in Chrome/Edge with WebGPU enabled</p>
            </div>
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
