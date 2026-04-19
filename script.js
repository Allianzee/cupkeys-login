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

// ====== READ STATE FROM URL ======
// This is the state token UE5 sent when it opened the browser
function getStateFromURL()
{
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state') || '';

    if (state)
    {
        console.log("✓ State token found in URL:", state);
    }
    else
    {
        console.warn("⚠️ No state token in URL");
    }

    return state;
}

// ====== EMAIL/PASSWORD TOGGLE ======
document.addEventListener("click", (e) =>
{
    if (e.target.id === "toggleLink")
    {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        updateFormMode();
        errorMsg.classList.remove("show");
        errorMsg.textContent = "";
    }
});

function updateFormMode()
{
    if (isRegisterMode)
    {
        formTitle.textContent = "Register";
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Login</a>';
    }
    else
    {
        formTitle.textContent = "Login";
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Register</a>';
    }
}

// ====== EMAIL/PASSWORD SUBMIT ======
loginForm.addEventListener("submit", async (e) =>
{
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password)
    {
        showError("Please fill in all fields! 📝");
        return;
    }

    if (password.length < 6)
    {
        showError("Password must be at least 6 characters! 🔐");
        return;
    }

    showLoading(true);

    try
    {
        let userCredential;
        const isRegister = isRegisterMode;

        if (isRegisterMode)
        {
            userCredential = await auth.createUserWithEmailAndPassword(email, password);
            showStatus("Account created! Sending verification email... 📧");
        }
        else
        {
            userCredential = await auth.signInWithEmailAndPassword(email, password);
        }

        const user = userCredential.user;

        // Send verification email if new registration
        if (!user.emailVerified && isRegister)
        {
            await user.sendEmailVerification();
            showStatus("✓ Verification email sent! Check your inbox! 📧");

            setTimeout(() =>
            {
                redirectToGame(user.uid, user.uid, user.email);
            }, 3000);

            return;
        }

        // Send login/register notification email
        fetch('/api/send-email',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
            {
                email: user.email,
                type: isRegister ? 'register' : 'login',
                username: user.email.split('@')[0]
            })
        }).catch(err => console.log('Email notification skipped:', err));

        await handleAuthSuccess(user);
    }
    catch (error)
    {
        console.error("Auth error:", error);
        showError(getFriendlyError(error.code));
        showLoading(false);
    }
});

// ====== GOOGLE LOGIN ======
googleBtn.addEventListener("click", async (e) =>
{
    e.preventDefault();

    const provider = new firebase.auth.GoogleAuthProvider();

    try
    {
        showStatus("Opening Google login... 🔑");
        const result = await auth.signInWithPopup(provider);

        fetch('/api/send-email',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
            {
                email: result.user.email,
                type: 'login',
                username: result.user.displayName || result.user.email.split('@')[0]
            })
        }).catch(err => console.log('Email notification skipped:', err));

        await handleAuthSuccess(result.user);
    }
    catch (error)
    {
        console.error("Google auth error:", error);
        showError(getFriendlyError(error.code) || "Google login failed! 😞");
        showLoading(false);
    }
});

// ====== HANDLE AUTH SUCCESS ======
async function handleAuthSuccess(user)
{
    try
    {
        const idToken = await user.getIdToken();
        const userId = user.uid;
        const userEmail = user.email || "";

        showStatus("Login successful! Returning to game... 🚀");

        setTimeout(() =>
        {
            redirectToGame(idToken, userId, userEmail);
        }, 1500);
    }
    catch (error)
    {
        console.error("Auth success error:", error);
        showError("Failed to get token: " + error.message);
        showLoading(false);
    }
}

// ====== REDIRECT TO GAME ======
function redirectToGame(token, userId, userEmail)
{
    // Read the state token that UE5 sent us in the URL
    const state = getStateFromURL();

    if (!state)
    {
        console.warn("⚠️ No state in URL - game may reject this login");
    }

    const redirectUrl =
        `cupkeys://auth` +
        `?token=${encodeURIComponent(token)}` +
        `&userid=${encodeURIComponent(userId)}` +
        `&email=${encodeURIComponent(userEmail)}` +
        `&state=${encodeURIComponent(state)}`;

    console.log("Redirecting to game...");
    console.log("State:", state);

    window.location.href = redirectUrl;

    // Fallback message if browser stays open
    setTimeout(() =>
    {
        showStatus("Login complete! Switch back to the game ✓");
        console.log("If the game did not open, check that it has been run at least once.");
    }, 2000);
}

// ====== FRIENDLY ERROR MESSAGES ======
function getFriendlyError(code)
{
    const errors = {
        "auth/user-not-found":        "No account found with that email 🔍",
        "auth/wrong-password":        "Wrong password! Try again 🔐",
        "auth/email-already-in-use":  "That email is already registered 📧",
        "auth/invalid-email":         "Invalid email address 📧",
        "auth/weak-password":         "Password is too weak 🔐",
        "auth/too-many-requests":     "Too many attempts. Try again later ⏳",
        "auth/network-request-failed":"Network error. Check your connection 🌐",
        "auth/popup-closed-by-user":  "Google login was cancelled",
        "auth/cancelled-popup-request":"Google login was cancelled",
    };

    return errors[code] || "Something went wrong. Please try again 😞";
}

// ====== UTILITY FUNCTIONS ======
function showError(message)
{
    console.error("Error:", message);
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    statusMsg.classList.remove("show");
    showLoading(false);
}

function showStatus(message)
{
    console.log("Status:", message);
    statusMsg.textContent = message;
    statusMsg.classList.add("show");
    errorMsg.classList.remove("show");
}

function showLoading(isLoading)
{
    if (isLoading)
    {
        btnText.style.display = "none";
        btnLoader.style.display = "block";
        loginForm.querySelector("button").disabled = true;
    }
    else
    {
        btnText.style.display = "block";
        btnLoader.style.display = "none";
        loginForm.querySelector("button").disabled = false;
    }
}
