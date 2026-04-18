// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// ====== GET FIREBASE AUTH (Already initialized in index.html) ======
const auth = firebase.auth();

console.log("✓ Script.js loaded - Firebase auth ready");

// Get Google Client ID from environment
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const DISCORD_CLIENT_ID = "1332313247589146634"; // Replace with your Discord Client ID

// ====== DOM ELEMENTS ======
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const statusMsg = document.getElementById("statusMsg");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const toggleText = document.getElementById("toggleText");

const googleBtn = document.getElementById("googleBtn");
const discordBtn = document.getElementById("discordBtn");

let isRegisterMode = false;

console.log("✓ DOM elements loaded");

// ====== CHECK FOR CALLBACK PARAMS ======
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const discordCode = params.get('code');
    const discordState = params.get('state');

    if (discordCode && discordState) {
        handleDiscordCallback(discordCode, discordState);
    }
});

// ====== EMAIL/PASSWORD TOGGLE ======
document.addEventListener("click", (e) => {
    if (e.target.id === "toggleLink") {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        updateFormMode();
        errorMsg.classList.remove("show");
        errorMsg.textContent = "";
    }
});

function updateFormMode() {
    const heading = document.querySelector(".login-form h2");
    if (isRegisterMode) {
        heading.textContent = "Register";
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Login</a>';
    } else {
        heading.textContent = "Login";
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Register</a>';
    }
}

// ====== EMAIL/PASSWORD LOGIN ======
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showError("Please fill in all fields");
        return;
    }

    if (password.length < 6) {
        showError("Password must be at least 6 characters");
        return;
    }

    showLoading(true);

    try {
        let userCredential;

        if (isRegisterMode) {
            userCredential = await auth.createUserWithEmailAndPassword(email, password);
            showStatus("Account created! Logging in...");
        } else {
            userCredential = await auth.signInWithEmailAndPassword(email, password);
        }

        await handleAuthSuccess(userCredential.user);

    } catch (error) {
        console.error("Auth error:", error);
        showError(error.message);
        showLoading(false);
    }
});

// ====== GOOGLE LOGIN ======
googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        showStatus("Redirecting to Google...");
        const result = await auth.signInWithPopup(provider);
        await handleAuthSuccess(result.user);
    } catch (error) {
        console.error("Google auth error:", error);
        showError(error.message || "Google login failed");
        showLoading(false);
    }
});

// ====== DISCORD LOGIN ======
discordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    
    try {
        showStatus("Redirecting to Discord...");
        
        // Get Discord Client ID (from environment or hardcoded)
        const clientId = "1495077498642239760"; // Replace with your actual Discord Client ID
        const redirectUri = `${window.location.origin}/`;
        const state = Math.random().toString(36).substring(7);
        
        // Store state for validation
        sessionStorage.setItem("discord_state", state);
        
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email&state=${state}`;
        
        console.log("Redirecting to Discord:", discordAuthUrl);
        window.location.href = discordAuthUrl;
        
    } catch (error) {
        console.error("Discord redirect error:", error);
        showError("Discord login failed: " + error.message);
    }
});

// ====== HANDLE DISCORD CALLBACK ======
async function handleDiscordCallback(code, state) {
    showStatus("Processing Discord login...");
    
    try {
        // Verify state
        const savedState = sessionStorage.getItem("discord_state");
        if (state !== savedState) {
            throw new Error("State mismatch - possible CSRF attack");
        }

        // Exchange code for token via Discord API
        const response = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: "1495077498642239760", // Replace with your Discord Client ID
                client_secret: "YOUR_DISCORD_CLIENT_SECRET", // This should be in backend, not here!
                code: code,
                grant_type: "authorization_code",
                redirect_uri: window.location.origin + "/"
            })
        });

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.status}`);
        }

        const data = await response.json();
        const accessToken = data.access_token;

        // Get user info
        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const user = await userResponse.json();

        // Create custom Firebase user
        // Since Discord doesn't directly integrate with Firebase,
        // we'll create a custom token or use email if available
        if (user.email) {
            // Try to sign in with Discord email
            try {
                const result = await auth.signInWithEmailAndPassword(user.email, "Discord_" + user.id);
                await handleAuthSuccess(result.user);
            } catch (err) {
                // If user doesn't exist, create one
                if (err.code === 'auth/user-not-found') {
                    const result = await auth.createUserWithEmailAndPassword(user.email, "Discord_" + user.id);
                    await handleAuthSuccess(result.user);
                } else {
                    throw err;
                }
            }
        } else {
            throw new Error("Discord account missing email - please enable email in Discord");
        }

    } catch (error) {
        console.error("Discord callback error:", error);
        showError("Discord login failed: " + error.message);
        
        // Clear the query params
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ====== HANDLE AUTH SUCCESS ======
async function handleAuthSuccess(user) {
    try {
        const idToken = await user.getIdToken();
        const userId = user.uid;
        const userEmail = user.email || "";

        showStatus("Login successful! Redirecting to game...");

        setTimeout(() => {
            redirectToGame(idToken, userId, userEmail);
        }, 1500);

    } catch (error) {
        console.error("Auth success error:", error);
        showError("Failed to get token: " + error.message);
        showLoading(false);
    }
}

// ====== REDIRECT TO GAME ======
function redirectToGame(token, userId, userEmail) {
    const redirectUrl = `cupkeys://auth?token=${encodeURIComponent(token)}&userid=${userId}&email=${encodeURIComponent(userEmail)}`;
    
    console.log("Attempting to redirect to game:", redirectUrl);
    window.location.href = redirectUrl;

    // Fallback if game doesn't open
    setTimeout(() => {
        showStatus(`Auth Token: ${token.substring(0, 20)}...`);
        console.log("Full token:", token);
        console.log("User ID:", userId);
        console.log("Email:", userEmail);
    }, 2000);
}

// ====== UTILITY FUNCTIONS ======
function showError(message) {
    console.error("Error:", message);
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    statusMsg.classList.remove("show");
    showLoading(false);
}

function showStatus(message) {
    console.log("Status:", message);
    statusMsg.textContent = message;
    statusMsg.classList.add("show");
    errorMsg.classList.remove("show");
}

function showLoading(isLoading) {
    if (isLoading) {
        btnText.style.display = "none";
        btnLoader.style.display = "block";
        loginForm.querySelector("button").disabled = true;
    } else {
        btnText.style.display = "block";
        btnLoader.style.display = "none";
        loginForm.querySelector("button").disabled = false;
    }
}
