/**
 * auth.js — handles login and signup form submissions
 * Submits via fetch to /api/login or /api/register
 * Redirects on success; displays errors on failure
 */

(function () {
  const isSignup = !!document.getElementById('signup-form');
  const form = document.getElementById(isSignup ? 'signup-form' : 'login-form');
  const errorBanner = document.getElementById('error-banner');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  function clearErrors() {
    errorBanner.hidden = true;
    errorBanner.textContent = '';
    form.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
    });
    form.querySelectorAll('input').forEach((el) => {
      el.classList.remove('input-error');
    });
  }

  function showBannerError(message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
  }

  function showFieldErrors(errors) {
    Object.entries(errors).forEach(([field, message]) => {
      const errorEl = document.getElementById(field + '-error');
      const inputEl = document.getElementById(field);
      if (errorEl) {
        errorEl.textContent = message;
      }
      if (inputEl) {
        inputEl.classList.add('input-error');
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });

    const endpoint = isSignup ? '/api/register' : '/api/login';
    submitBtn.disabled = true;
    submitBtn.textContent = isSignup ? 'Creating account…' : 'Signing in…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok && json.redirect) {
        if (!isSignup) {
          sessionStorage.setItem('ayurcare_just_logged_in', '1');
        }
        window.location.href = json.redirect;
        return;
      }

      // Handle field-level validation errors
      if (json.errors && typeof json.errors === 'object') {
        const { message, ...fieldErrors } = json.errors;
        if (message) {
          showBannerError(message);
        }
        if (Object.keys(fieldErrors).length > 0) {
          showFieldErrors(fieldErrors);
        }
        if (!message && Object.keys(fieldErrors).length === 0) {
          showBannerError('An error occurred. Please try again.');
        }
      } else if (json.error) {
        showBannerError(json.error);
      } else {
        showBannerError('An unexpected error occurred. Please try again.');
      }
    } catch (err) {
      showBannerError('Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignup ? 'Create account' : 'Sign in';
    }
  });
})();
