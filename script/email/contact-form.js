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
        // Function to check for autofilled fields
        const checkAutofill = function() {
            const formInputs = contactForm.querySelectorAll('input, textarea');
            formInputs.forEach(input => {
                // Check if the field has a value (might be autofilled)
                if (input.value !== '') {
                    // Validate the field
                    validateField(input);
                }
            });
        };

        // Check immediately
        checkAutofill();

        // Check again after a short delay (browsers often fill forms after DOMContentLoaded)
        setTimeout(checkAutofill, 100);
        setTimeout(checkAutofill, 500);
        setTimeout(checkAutofill, 1000);
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
        const formInputs = contactForm.querySelectorAll('input, textarea');
        formInputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });

            input.addEventListener('input', function() {
                // Remove error when user starts typing again
                if (this.classList.contains('is-invalid')) {
                    this.classList.remove('is-invalid');
                }
                // Validate as user types
                validateField(this);
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

            // Additional events that might be triggered by autofill
            input.addEventListener('change', function() {
                validateField(this);
            });

            // For Safari and Firefox
            input.addEventListener('autocomplete', function() {
                validateField(this);
            });
        });

        // Set up a MutationObserver to detect attribute changes (for autofill)
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'value' ||
                     mutation.attributeName === 'style' ||
                     mutation.attributeName === 'class')) {
                    validateField(mutation.target);
                }
            });
        });

        // Observe all form inputs
        formInputs.forEach(input => {
            observer.observe(input, {
                attributes: true,
                attributeFilter: ['value', 'style', 'class']
            });
        });

        // Set up form submission
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Force validation on all fields before submission
            let isValid = true;
            const formInputs = contactForm.querySelectorAll('input, textarea');

            // First pass: mark all empty required fields as invalid
            formInputs.forEach(input => {
                if (input.required && input.value.trim() === '') {
                    input.classList.add('is-invalid');

                    // Add error message
                    let feedbackElement = input.nextElementSibling;
                    if (!feedbackElement || !feedbackElement.classList.contains('invalid-feedback')) {
                        feedbackElement = document.createElement('div');
                        feedbackElement.className = 'invalid-feedback';
                        input.parentNode.appendChild(feedbackElement);
                    }

                    feedbackElement.textContent = 'This field is required';
                    isValid = false;
                }
            });

            // Second pass: validate all non-empty fields
            formInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    if (!validateField(input)) {
                        isValid = false;
                    }
                }
            });

            if (!isValid) {
                // Focus the first invalid field
                const firstInvalid = contactForm.querySelector('.is-invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
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
            // Use the contact form handler with Gmail API
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

    // Skip validation for empty fields (unless they're required)
    // This is important for autofill which might be in progress
    if (field.value.trim() === '') {
        if (field.required) {
            // Don't show errors for required fields until form submission
            // This prevents errors from showing during autofill
            return false;
        }
        return true;
    }

    let isValid = true;
    let errorMessage = '';

    // Special handling for email field
    if (field.type === 'email' && field.value.trim() !== '') {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(field.value.trim())) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }

    // Special handling for phone field
    else if (field.id === 'phone' && field.value.trim() !== '') {
        // Australian phone number validation
        const phoneValue = field.value.replace(/[\s-]+/g, '');
        // Simplified regex for Australian mobile or landline numbers
        const phoneRegex = /^(\+?61|0)[2478]\d{8}$/;

        if (!phoneRegex.test(phoneValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid Australian phone number';
        }
    }

    // Special handling for name field
    else if (field.id === 'first-name' && field.value.trim() !== '') {
        if (field.value.trim().length < 2) {
            isValid = false;
            errorMessage = 'Name must be at least 2 characters';
        } else if (!/^[A-Za-z\s\-']+$/.test(field.value.trim())) {
            isValid = false;
            errorMessage = 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
    }

    // Special handling for subject field
    else if (field.id === 'subject' && field.value.trim() !== '') {
        if (field.value.trim().length < 3) {
            isValid = false;
            errorMessage = 'Subject must be at least 3 characters';
        }
    }

    // Special handling for message field
    else if (field.id === 'message' && field.value.trim() !== '') {
        if (field.value.trim().length < 10) {
            isValid = false;
            errorMessage = 'Message must be at least 10 characters';
        }
    }

    // If no custom validation was applied, use HTML5 validation
    else if (!field.checkValidity()) {
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
