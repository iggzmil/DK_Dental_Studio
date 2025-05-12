/**
 * Simple Contact Form Handler for DK Dental Studio
 *
 * This is a minimal implementation that works well with browser autofill
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the contact form
    const contactForm = document.getElementById('contact-form');

    if (!contactForm) return;

    // Function to detect and handle autofilled fields
    function handleAutofill() {
        const inputs = contactForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            // If the input has a value (possibly from autofill)
            if (input.value !== '') {
                // Mark as valid
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');

                // Trigger change event to ensure validation is applied
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    // Run autofill detection multiple times with increasing delays
    handleAutofill(); // Immediate check
    setTimeout(handleAutofill, 100); // Short delay
    setTimeout(handleAutofill, 500); // Medium delay
    setTimeout(handleAutofill, 1000); // Longer delay
    setTimeout(handleAutofill, 1500); // Even longer delay
    setTimeout(handleAutofill, 2000); // Final check

    // Add a special event listener for autofill detection
    document.addEventListener('mousemove', function() {
        // This helps detect autofill that happens after user interaction
        handleAutofill();
    }, { once: true });

    // Also check when window gets focus (user switches back to tab)
    window.addEventListener('focus', handleAutofill);

    // Get CSRF token
    fetch('/script/email/session-handler.php')
        .then(response => response.json())
        .then(data => {
            // Add hidden CSRF token field to form
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = data.csrf_token;
            contactForm.appendChild(csrfInput);

            // Check for autofill again after token is added
            setTimeout(handleAutofill, 100);
        })
        .catch(error => {
            console.error('Failed to get CSRF token:', error);
        });

    // Add event listeners for input fields
    const formInputs = contactForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        // When input changes (including autofill)
        input.addEventListener('change', function() {
            if (this.value !== '') {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            }
        });

        // When input gets focus
        input.addEventListener('focus', function() {
            // Remove error styling when user starts interacting
            this.classList.remove('is-invalid');
        });

        // When input loses focus
        input.addEventListener('blur', function() {
            if (this.value !== '') {
                // Validate non-empty fields
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
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Run autofill detection one more time before validation
        formInputs.forEach(input => {
            if (input.value !== '') {
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');
            }
        });

        // Basic validation
        let isValid = true;
        formInputs.forEach(input => {
            // Skip hidden fields
            if (input.type === 'hidden') return;

            // Check if required field is empty
            if (input.required && input.value.trim() === '') {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                isValid = false;
            }
            // Check if non-empty field is valid
            else if (input.value.trim() !== '' && !input.checkValidity()) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                isValid = false;
            }
            // Mark valid fields
            else if (input.value.trim() !== '') {
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');
            }
        });

        if (!isValid) {
            event.stopPropagation();
            // Focus the first invalid field
            const firstInvalid = contactForm.querySelector('.is-invalid');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
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
                this.reset();
                this.classList.remove('was-validated');
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
        contactForm.parentNode.insertBefore(messageDiv, contactForm);

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
