// =========================================
// ECHO CHAT - SUPABASE AUTHENTICATION
// Real authentication with Supabase
// =========================================

// =========================================
// SUPABASE CONFIGURATION
// =========================================
const SUPABASE_URL = "https://oxhocyyvtclvktgklrnj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aG9jeXl2dGNsdmt0Z2tscm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDEwOTAsImV4cCI6MjA3NzU3NzA5MH0.oxEvY68JElEpDq2LQ9EXxVUbMMDAFTwp9J52PKlJkns"; // Anon key is fine for browser

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
class EchoAuth {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.initElements();
        this.attachEventListeners();
        this.checkURLParams();
        this.initValidation();
        this.checkExistingSession();
    }

    // =========================================
    // ELEMENT INITIALIZATION
    // =========================================
    initElements() {
        // Forms
        this.signinForm = document.querySelector('.signin-form');
        this.registerForm = document.querySelector('.register-form');
        this.formsWrapper = document.querySelector('.forms-wrapper');

        // Sign in elements
        this.signinEmail = this.signinForm?.querySelector('.emailInp input');
        this.signinPassword = this.signinForm?.querySelector('.passwordInp input');
        this.signinBtn = this.signinForm?.querySelector('button[type="submit"]');

        // Register elements
        this.registerUsername = this.registerForm?.querySelector('.usernameInp input');
        this.registerEmail = this.registerForm?.querySelector('.emailInp input');
        this.registerPassword = this.registerForm?.querySelector('.passwordInp input');
        this.registerConfirmPassword = this.registerForm?.querySelector('.confirmpasswordInp input');
        this.registerBtn = this.registerForm?.querySelector('button');
    }

    // =========================================
    // CHECK EXISTING SESSION
    // =========================================
    async checkExistingSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // User is already logged in, redirect to main page
                this.showFeedback('Already logged in, redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================
    attachEventListeners() {
        // Sign in form submission
        if (this.signinBtn) {
            this.signinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignin();
            });
        }

        // Register form submission
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Real-time validation
        [this.signinEmail, this.signinPassword, this.registerEmail,
        this.registerPassword, this.registerConfirmPassword, this.registerUsername]
            .forEach(input => {
                if (input) {
                    input.addEventListener('blur', () => this.validateField(input));
                    input.addEventListener('input', () => this.clearFieldError(input));
                }
            });

        // Enter key submission
        [this.signinEmail, this.signinPassword].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleSignin();
                    }
                });
            }
        });

        [this.registerUsername, this.registerEmail, this.registerPassword,
        this.registerConfirmPassword].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleRegister();
                    }
                });
            }
        });
    }

    // =========================================
    // URL PARAMETER HANDLING
    // =========================================
    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('register')) {
            this.switchToRegister();
        }
    }

    // =========================================
    // FORM SWITCHING
    // =========================================
    switchToRegister() {
        if (this.signinForm && this.registerForm && this.formsWrapper) {
            this.signinForm.classList.remove('active');
            this.registerForm.classList.add('active');
            this.formsWrapper.classList.add('show-register');

            const url = new URL(window.location);
            url.searchParams.set('register', '');
            window.history.pushState({}, '', url);
            this.addHapticFeedback('light');
        }
    }

    switchToSignin() {
        if (this.signinForm && this.registerForm && this.formsWrapper) {
            this.registerForm.classList.remove('active');
            this.signinForm.classList.add('active');
            this.formsWrapper.classList.remove('show-register');

            const url = new URL(window.location);
            url.searchParams.delete('register');
            window.history.pushState({}, '', url);
            this.addHapticFeedback('light');
        }
    }

    // =========================================
    // VALIDATION
    // =========================================
    initValidation() {
        this.validationRules = {
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            password: {
                minLength: 8,
                message: 'Password must be at least 8 characters'
            },
            username: {
                minLength: 2,
                message: 'Username must be at least 2 characters'
            }
        };
    }

    validateField(input) {
        if (!input || !input.value) return false;

        const value = input.value.trim();
        const parent = input.closest('.emailInp, .passwordInp, .usernameInp, .confirmpasswordInp');

        let isValid = true;
        let errorMessage = '';

        if (parent?.classList.contains('emailInp')) {
            isValid = this.validationRules.email.pattern.test(value);
            errorMessage = this.validationRules.email.message;
        }

        if (parent?.classList.contains('passwordInp')) {
            isValid = value.length >= this.validationRules.password.minLength;
            errorMessage = this.validationRules.password.message;
        }

        if (parent?.classList.contains('usernameInp')) {
            isValid = value.length >= this.validationRules.username.minLength;
            errorMessage = this.validationRules.username.message;
        }

        if (parent?.classList.contains('confirmpasswordInp')) {
            const passwordValue = this.registerPassword?.value;
            isValid = value === passwordValue && value.length > 0;
            errorMessage = 'Passwords do not match';
        }

        if (!isValid) {
            this.showFieldError(input, errorMessage);
        } else {
            this.showFieldSuccess(input);
        }

        return isValid;
    }

    showFieldError(input, message) {
        if (!input) return;

        input.classList.add('error');
        input.classList.remove('success');

        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #ff3b30;
            font-size: 12px;
            margin-top: 6px;
            animation: fadeIn 0.2s ease;
        `;

        input.parentElement?.appendChild(errorDiv);
        this.addHapticFeedback('medium');
    }

    showFieldSuccess(input) {
        if (!input) return;
        input.classList.remove('error');
        input.classList.add('success');
        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) existingError.remove();
    }

    clearFieldError(input) {
        if (!input) return;
        input.classList.remove('error');
        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) existingError.remove();
    }

    // =========================================
    // SUPABASE SIGN IN
    // =========================================
    async handleSignin() {
        // Validate fields
        const emailValid = this.validateField(this.signinEmail);
        const passwordValid = this.validateField(this.signinPassword);

        if (!emailValid || !passwordValid) {
            this.showFeedback('Please fix the errors above', 'error');
            return;
        }

        const email = this.signinEmail.value.trim();
        const password = this.signinPassword.value;

        this.setButtonLoading(this.signinBtn, true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Success
            this.showFeedback('Sign in successful!', 'success');

            // Store user session info if needed
            console.log('User signed in:', data.user);

            // Redirect to main page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            console.error('Sign in error:', error);

            let errorMessage = 'Invalid email or password';

            // Handle specific Supabase errors
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email first';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Too many attempts. Please try again later';
            }

            this.showFeedback(errorMessage, 'error');
            this.setButtonLoading(this.signinBtn, false);
        }
    }

    // =========================================
    // SUPABASE REGISTER
    // =========================================
    async handleRegister() {
        // Validate all fields
        const usernameValid = this.validateField(this.registerUsername);
        const emailValid = this.validateField(this.registerEmail);
        const passwordValid = this.validateField(this.registerPassword);
        const confirmPasswordValid = this.validateField(this.registerConfirmPassword);

        if (!usernameValid || !emailValid || !passwordValid || !confirmPasswordValid) {
            this.showFeedback('Please fix the errors above', 'error');
            return;
        }

        const username = this.registerUsername.value.trim();
        const email = this.registerEmail.value.trim();
        const password = this.registerPassword.value;

        this.setButtonLoading(this.registerBtn, true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username,
                        full_name: username, // You can customize this
                    }
                }
            });

            if (error) throw error;

            // Success
            console.log('User registered:', data.user);

            // Check if email confirmation is required
            if (data.user && !data.session) {
                this.showFeedback('Please check your email to verify your account', 'success');

                // Switch to sign in form after delay
                setTimeout(() => {
                    this.switchToSignin();
                    this.setButtonLoading(this.registerBtn, false);
                }, 3000);
            } else {
                // Auto sign-in enabled (no email confirmation required)
                this.showFeedback('Account created successfully!', 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Registration error:', error);

            let errorMessage = 'Registration failed. Please try again.';

            // Handle specific Supabase errors
            if (error.message.includes('already registered')) {
                errorMessage = 'This email is already registered';
            } else if (error.message.includes('Password')) {
                errorMessage = 'Password is too weak. Try a stronger password';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Too many attempts. Please try again later';
            }

            this.showFeedback(errorMessage, 'error');
            this.setButtonLoading(this.registerBtn, false);
        }
    }

    // =========================================
    // BUTTON LOADING STATE
    // =========================================
    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.originalText = button.textContent;
            button.textContent = 'Please wait...';
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
        } else {
            button.disabled = false;
            button.textContent = button.originalText || button.textContent;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
    }

    // =========================================
    // FEEDBACK SYSTEM
    // =========================================
    showFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.textContent = message;

        Object.assign(feedback.style, {
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-20px)',
            padding: '12px 24px',
            background: type === 'success' ? '#34c759' :
                type === 'error' ? '#ff3b30' : '#007aff',
            color: 'white',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: '10000',
            opacity: '0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none'
        });

        document.body.appendChild(feedback);

        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    // =========================================
    // UTILITIES
    // =========================================
    addHapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            const patterns = { light: 10, medium: 20, heavy: 30 };
            navigator.vibrate(patterns[intensity] || 10);
        }
    }
}

// =========================================
// GLOBAL FUNCTIONS
// =========================================
function switchToRegister(e) {
    e.preventDefault();
    if (window.echoAuth) {
        window.echoAuth.switchToRegister();
    }
}

function switchToSignin(e) {
    e.preventDefault();
    if (window.echoAuth) {
        window.echoAuth.switchToSignin();
    }
}

// =========================================
// INITIALIZE
// =========================================
window.echoAuth = new EchoAuth();

// =========================================
// EXPORT
// =========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EchoAuth;
}