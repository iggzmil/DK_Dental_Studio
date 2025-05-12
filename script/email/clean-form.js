/**
 * DK Dental Studio Form Handler
 * This file contains the form handling code for the contact form
 * Simple implementation without green ticks
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    if (!form) return;

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
    inputs.forEach(input => {
        // When input changes
        input.addEventListener('input', function() {
            // Clear previous validation state
            this.classList.remove('is-invalid');

            // Only show invalid state, no green ticks
            if (!this.checkValidity()) {
                this.classList.add('is-invalid');
            }
        });

        // When input loses focus
        input.addEventListener('blur', function() {
            if (this.value !== '' && !this.checkValidity()) {
                this.classList.add('is-invalid');
            }
        });
    });

    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Basic validation
        let isValid = true;
        inputs.forEach(input => {
            // Skip hidden fields
            if (input.type === 'hidden') return;

            // Check if required field is empty or invalid
            if ((input.required && input.value.trim() === '') || !input.checkValidity()) {
                input.classList.add('is-invalid');
                isValid = false;
            }
        });

        if (!isValid) {
            e.stopPropagation();
            // Focus the first invalid field
            const firstInvalid = form.querySelector('.is-invalid');
            if (firstInvalid) firstInvalid.focus();
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
                inputs.forEach(input => input.classList.remove('is-invalid'));
            } else {
                // Create a more detailed error message
                let errorMessage = data.message;

                // Show field-specific errors if available
                if (data.errors && Array.isArray(data.errors)) {
                    errorMessage += '<ul class="mt-2 mb-0">';
                    data.errors.forEach(error => {
                        errorMessage += `<li>${error}</li>`;
                        console.error(error);

                        // Try to find the field that matches this error and mark it as invalid
                        inputs.forEach(input => {
                            const fieldName = input.name.replace('-', ' ');
                            if (error.toLowerCase().includes(fieldName.toLowerCase())) {
                                input.classList.add('is-invalid');
                            }
                        });
                    });
                    errorMessage += '</ul>';
                }

                // Show the complete error message
                showMessage('error', errorMessage);
            }
        })
        .catch(error => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            // Create a more helpful error message
            let errorMessage = 'The server encountered an error processing your request.';

            // Add more specific information if available
            if (error.message) {
                if (error.message.includes('status: 500')) {
                    errorMessage = 'The server encountered an internal error. This might be due to temporary issues with our email service.';
                } else if (error.message.includes('status: 404')) {
                    errorMessage = 'The form submission endpoint could not be found. Please contact the website administrator.';
                } else if (error.message.includes('status: 403')) {
                    errorMessage = 'Access to the form submission service is currently restricted. Please try again later.';
                } else if (error.message.includes('status: 429')) {
                    errorMessage = 'Too many form submissions. Please wait a moment before trying again.';
                }
            }

            // Add a call to action
            errorMessage += '<br><br>Please try again later or contact us directly at <a href="mailto:info@dkdental.au">info@dkdental.au</a> or <a href="tel:0293987578">(02) 9398 7578</a>.';

            // Show the error message
            showMessage('error', errorMessage);
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
