// ====== GET FIREBASE AUTH ======
const auth = window.firebaseAuth || firebase.auth();

console.log("✓ Script.js loaded");

// ====== DOM ELEMENTS ======
const loginForm = document.getElementById("loginForm");
const formTitle = document.getElementById("formTitle");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const statusMsg = document.getElementById("statusMsg");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const toggleText = document.getElementById("toggleText");
const googleBtn = document.getElementById("googleBtn");

let isRegisterMode = false;

console.log("✓ DOM elements loaded");

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
    if (isRegisterMode) {
        formTitle.textContent = "Register";
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Login</a>';
    } else {
        formTitle.textContent = "Login";
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Register</a>';
    }
}

// ====== EMAIL/PASSWORD LOGIN ======
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showError("Please fill in all fields! 📝");
        return;
    }

    if (password.length < 6) {
        showError("Password must be at least 6 characters! 🔐");
        return;
    }

    showLoading(true);

    try {
        let userCredential;
        const isRegister = isRegisterMode;

        if (isRegisterMode) {
            userCredential = await auth.createUserWithEmailAndPassword(email, password);
            showStatus("Account created! Sending verification email... 📧");
        } else {
            userCredential = await auth.signInWithEmailAndPassword(email, password);
        }

        const user = userCredential.user;

        // Send verification email if registering
        if (!user.emailVerified && isRegister) {
            await user.sendEmailVerification();
            showStatus("✓ Verification email sent! Check your inbox! 📧");
            
            setTimeout(() => {
                redirectToGame(user.uid, user.uid, user.email);
            }, 3000);
            return;
        }

        // Send login/register notification email
        fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                type: isRegister ? 'register' : 'login',
                username: user.email.split('@')[0]
            })
        }).catch(err => console.log('Email notification skipped:', err));

        await handleAuthSuccess(user);

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
        showStatus("Redirecting to Google... 🔑");
        const result = await auth.signInWithPopup(provider);
        
        // Send login notification
        fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: result.user.email,
                type: 'login',
                username: result.user.displayName || result.user.email.split('@')[0]
            })
        }).catch(err => console.log('Email notification skipped:', err));

        await handleAuthSuccess(result.user);
    } catch (error) {
        console.error("Google auth error:", error);
        showError(error.message || "Google login failed! 😞");
        showLoading(false);
    }
});

// ====== HANDLE AUTH SUCCESS ======
async function handleAuthSuccess(user) {
    try {
        const idToken = await user.getIdToken();
        const userId = user.uid;
        const userEmail = user.email || "";

        showStatus("Login successful! Redirecting to game... 🚀");

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
    
    console.log("Redirecting to game with token");
    window.location.href = redirectUrl;

    // Fallback if game doesn't open
    setTimeout(() => {
        showStatus(`Token ready! If game didn't open, check console. ✓`);
        console.log("Auth Token:", token.substring(0, 30) + "...");
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
