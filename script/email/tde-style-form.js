/**
 * DK Dental Studio Form Handler
 * This file contains the form handling code for the contact form
 * Based on the TDE implementation that works well with autofill
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const messageTextarea = document.getElementById('message');
    const submitButton = form.querySelector('button[type="submit"]');

    // Get CSRF token
    fetch('/script/email/session-handler.php')
        .then(response => response.json())
        .then(data => {
            // Add hidden CSRF token field to form
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = data.csrf_token;
            form.appendChild(csrfInput);
        })
        .catch(error => {
            console.error('Failed to get CSRF token:', error);
        });

    // Real-time validation on input fields
    const inputs = form.querySelectorAll('input, textarea');

    // More aggressive function to check for autofilled fields
    function checkForAutofill() {
        inputs.forEach(input => {
            // Check if the field has a value
            if (input.value !== '') {
                // Force valid state for fields with values
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');

                // Trigger a change event to ensure validation is applied
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }

            // Check for autofill background color
            const style = window.getComputedStyle(input);
            const bgColor = style.backgroundColor;

            // Chrome's autofill background color is rgb(232, 240, 254)
            // Firefox's autofill background color is rgb(250, 255, 189)
            if (bgColor === 'rgb(232, 240, 254)' || bgColor === 'rgb(250, 255, 189)') {
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');
            }

            // Also check if the input matches the autofill pseudo-class
            if (input.matches(':-webkit-autofill')) {
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');
            }
        });
    }

    // Add special CSS to detect autofill
    const style = document.createElement('style');
    style.textContent = `
        input:-webkit-autofill {
            -webkit-animation-name: onAutoFillStart;
            animation-name: onAutoFillStart;
        }

        @-webkit-keyframes onAutoFillStart {
            from {}
            to {}
        }

        @keyframes onAutoFillStart {
            from {}
            to {}
        }
    `;
    document.head.appendChild(style);

    // Listen for the animation start event which is triggered by autofill
    document.addEventListener('animationstart', function(e) {
        if (e.animationName === 'onAutoFillStart') {
            const input = e.target;
            input.classList.add('is-valid');
            input.classList.remove('is-invalid');
        }
    });

    // Run multiple checks with increasing delays
    checkForAutofill(); // Immediate
    setTimeout(checkForAutofill, 100); // Very short delay
    setTimeout(checkForAutofill, 500); // Short delay
    setTimeout(checkForAutofill, 1000); // Medium delay
    setTimeout(checkForAutofill, 2000); // Longer delay

    // Check when page is fully loaded
    window.addEventListener('load', function() {
        checkForAutofill();
        // Run again after a short delay
        setTimeout(checkForAutofill, 500);
    });

    // Check when user interacts with the page
    document.addEventListener('click', function() {
        setTimeout(checkForAutofill, 100);
    });

    // Special check for Chrome's autofill
    document.addEventListener('DOMSubtreeModified', function() {
        setTimeout(checkForAutofill, 100);
    });

    // Add event listeners for validation
    inputs.forEach(input => {
        // When input changes
        input.addEventListener('input', function() {
            // Clear previous validation state
            this.classList.remove('is-invalid');

            if (!this.checkValidity()) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else if (this.value !== '') {
                // Show green tick for valid inputs with values
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            }
        });

        // When input loses focus
        input.addEventListener('blur', function() {
            if (this.value !== '') {
                if (this.checkValidity()) {
                    this.classList.add('is-valid');
                    this.classList.remove('is-invalid');
                } else {
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                }
            }
        });
    });

    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Basic validation
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        // Get form data
        const formData = new FormData(this);

        // Send AJAX request
        fetch('/script/email/contact-form-handler.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            if (data.success) {
                // Show success message
                showMessage('success', data.message);

                // Reset form
                form.reset();
                form.classList.remove('was-validated');
                inputs.forEach(input => input.classList.remove('is-invalid'));
            } else {
                // Show error message
                showMessage('error', data.message);

                // Show field-specific errors if available
                if (data.errors && Array.isArray(data.errors)) {
                    data.errors.forEach(error => {
                        console.error(error);
                    });
                }
            }
        })
        .catch(error => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            // Show error message
            showMessage('error', 'The server encountered an error processing your request. Please try again later or contact us directly.');
            console.error('Form submission error:', error);
        });
    });

    // Show message function
    function showMessage(type, message) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-danger';
        messageDiv.id = 'form-message';
        messageDiv.innerHTML = message;

        // Remove any existing messages
        const existingMessage = document.getElementById('form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Insert message before the form
        form.parentNode.insertBefore(messageDiv, form);

        // Scroll to message
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }
});
