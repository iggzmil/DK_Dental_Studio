/**
 * Contact Form Handler for DK Dental Studio
 *
 * This script handles the contact form submission via AJAX
 * and displays success/error messages to the user.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the contact form
    const contactForm = document.getElementById('contact-form');

    // If form exists, set up submission handler
    if (contactForm) {
        // Fetch CSRF token from server
        fetch('/script/email/session-handler.php')
            .then(response => response.json())
            .then(data => {
                // Add hidden CSRF token field to form
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = data.csrf_token;
                contactForm.appendChild(csrfInput);
            })
            .catch(error => {
                console.error('Failed to get CSRF token:', error);
            });

        // Set up form submission
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Clear previous error messages
            clearFormErrors();

            // Get form data
            const formData = new FormData(contactForm);

            // Send AJAX request
            fetch('/script/email/contact-form-handler.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;

                if (data.success) {
                    // Show success message
                    showFormMessage('success', data.message);

                    // Reset form
                    contactForm.reset();
                } else {
                    // Show error message
                    showFormMessage('error', data.message);

                    // Show field-specific errors if available
                    if (data.errors && Array.isArray(data.errors)) {
                        showFieldErrors(data.errors);
                    }
                }
            })
            .catch(error => {
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;

                // Show error message
                showFormMessage('error', 'An unexpected error occurred. Please try again later.');
                console.error('Form submission error:', error);
            });
        });
    }
});



/**
 * Show a form message (success or error)
 */
function showFormMessage(type, message) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-danger';
    messageDiv.id = 'form-message';
    messageDiv.innerHTML = message;

    // Find the form
    const contactForm = document.getElementById('contact-form');

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

/**
 * Show field-specific error messages
 */
function showFieldErrors(errors) {
    errors.forEach(error => {
        // Try to determine which field the error is for
        const fieldName = getFieldNameFromError(error);
        if (fieldName) {
            const field = document.getElementById(fieldName);
            if (field) {
                // Add error class to field
                field.classList.add('is-invalid');

                // Add error message
                const feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'invalid-feedback';
                feedbackDiv.innerHTML = error;

                // Insert after the field
                field.parentNode.appendChild(feedbackDiv);
            }
        }
    });
}

/**
 * Try to extract field name from error message
 */
function getFieldNameFromError(error) {
    const lowerError = error.toLowerCase();

    // Map of error text to field IDs
    const fieldMap = {
        'first name': 'first-name',
        'email': 'email',
        'phone': 'phone',
        'subject': 'subject',
        'message': 'message'
    };

    // Check if error message contains any field names
    for (const [text, fieldId] of Object.entries(fieldMap)) {
        if (lowerError.includes(text)) {
            return fieldId;
        }
    }

    return null;
}

/**
 * Clear all form error messages
 */
function clearFormErrors() {
    // Remove is-invalid class from all fields
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });

    // Remove all invalid-feedback elements
    const feedbackElements = document.querySelectorAll('.invalid-feedback');
    feedbackElements.forEach(element => {
        element.remove();
    });
}
