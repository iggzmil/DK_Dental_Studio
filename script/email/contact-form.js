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
        // Check for autofilled fields immediately after DOM is loaded
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
            // Check if the field has a value (might be autofilled)
            if (input.value !== '') {
                // Mark as valid if it has content
                input.classList.add('is-valid');
            }
        });
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

        // Add input validation event listeners
        // Using the formInputs variable already declared above
        formInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });

            input.addEventListener('input', function() {
                // Remove error when user starts typing again
                if (this.classList.contains('is-invalid')) {
                    this.classList.remove('is-invalid');
                }
            });

            // Handle autofill
            input.addEventListener('animationstart', function(e) {
                // The animation name that is triggered by Chrome's autofill
                if (e.animationName === 'onAutoFillStart' ||
                    e.animationName === 'onAutoFill' ||
                    e.animationName === 'autoFillStart') {
                    validateField(this);
                }
            });
        });

        // Add special handling for autofill detection
        // This will run once when the page loads and after a short delay
        // to catch autofilled fields
        setTimeout(() => {
            formInputs.forEach(input => {
                // Check if the field has a value (might be autofilled)
                if (input.value !== '') {
                    validateField(input);
                }
            });
        }, 500);

        // Set up form submission
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Validate all fields before submission
            let isValid = true;
            formInputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                // Focus the first invalid field
                contactForm.querySelector('.is-invalid').focus();
                return;
            }

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
                showFormMessage('error', 'The server encountered an error processing your request. Please try again later or contact us directly.');
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
        'name': 'first-name',
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
 * Validate a single form field
 * @param {HTMLElement} field - The field to validate
 * @returns {boolean} - Whether the field is valid
 */
function validateField(field) {
    // Skip validation for hidden fields
    if (field.type === 'hidden') {
        return true;
    }

    let isValid = true;
    let errorMessage = '';

    // Check validity using the HTML5 Validation API
    if (!field.checkValidity()) {
        isValid = false;

        // Get specific error message
        if (field.validity.valueMissing) {
            errorMessage = 'This field is required';
        } else if (field.validity.typeMismatch) {
            if (field.type === 'email') {
                errorMessage = 'Please enter a valid email address';
            } else if (field.type === 'tel') {
                errorMessage = 'Please enter a valid phone number';
            }
        } else if (field.validity.tooShort) {
            errorMessage = `Please enter at least ${field.minLength} characters`;
        } else if (field.validity.tooLong) {
            errorMessage = `Please enter no more than ${field.maxLength} characters`;
        } else if (field.validity.patternMismatch) {
            errorMessage = field.title || 'Please match the requested format';
        } else {
            errorMessage = 'Please enter a valid value';
        }
    }

    // Skip validation for empty fields (unless they're required)
    if (field.value.trim() === '' && !field.required) {
        return true;
    }

    // Additional custom validation
    if (isValid && field.id === 'phone' && field.value.trim() !== '') {
        // Australian phone number validation
        const phoneValue = field.value.replace(/[\s-]+/g, '');
        // Simplified regex for Australian mobile or landline numbers
        const phoneRegex = /^(\+?61|0)[2478]\d{8}$/;

        if (!phoneRegex.test(phoneValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid Australian phone number';
        }
    }

    // Update field styling and error message
    if (!isValid) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        // Find or create feedback element
        let feedbackElement = field.nextElementSibling;
        if (!feedbackElement || !feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement = document.createElement('div');
            feedbackElement.className = 'invalid-feedback';
            field.parentNode.appendChild(feedbackElement);
        }

        feedbackElement.textContent = errorMessage;
    } else {
        // Mark as valid if it has content
        if (field.value.trim() !== '') {
            field.classList.add('is-valid');
        }
        field.classList.remove('is-invalid');
    }

    return isValid;
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
}
