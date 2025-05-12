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
