// ====== FIREBASE CONFIG ======
const firebaseConfig = {
  apiKey: "AIzaSyC73b_K2-bUzwv4CPleIIQkRyLHMaIafes",
  authDomain: "cupkeys-bdccc.firebaseapp.com",
  projectId: "cupkeys-bdccc",
  storageBucket: "cupkeys-bdccc.firebasestorage.app",
  messagingSenderId: "505506703823",
  appId: "1:505506703823:web:4d41259542a2015495caba"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ====== DOM ELEMENTS ======
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const statusMsg = document.getElementById("statusMsg");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const toggleText = document.getElementById("toggleText");

let isRegisterMode = false;

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
        showError(error.message);
        showLoading(false);
    }
});

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
        showError("Failed to get token: " + error.message);
        showLoading(false);
    }
}

// ====== REDIRECT TO GAME ======
function redirectToGame(token, userId, userEmail) {
    const redirectUrl = `cupkeys://auth?token=${encodeURIComponent(token)}&userid=${userId}&email=${encodeURIComponent(userEmail)}`;
    
    window.location.href = redirectUrl;

    // Fallback if game doesn't open
    setTimeout(() => {
        showStatus(`Token: ${token}`);
        console.log("Token:", token);
    }, 2000);
}

// ====== UTILITY FUNCTIONS ======
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    statusMsg.classList.remove("show");
}

function showStatus(message) {
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
