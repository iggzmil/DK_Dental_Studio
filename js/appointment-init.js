/**
 * DK Dental Studio - Appointment Page Initialization
 * Updated to integrate with the new booking system
 */

$(document).ready(function() {
  // Mobile navigation is handled by common-init.js - no need to duplicate here

  // Show admin info for development environment
  // In production, this should be removed or properly secured
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('dev')) {
    // Keep admin-info hidden
    // document.getElementById('admin-info').style.display = 'block';
  }

  // Set copyright year (common functionality for all pages)
  const copyrightElement = document.getElementById('copyright');
  if (copyrightElement) {
    copyrightElement.textContent = new Date().getFullYear();
  }

  // Check if we should auto-select a specific service
  const urlParams = new URLSearchParams(window.location.search);
  const autoSelectService = urlParams.get('service');

  if (autoSelectService && ['dentures', 'repairs', 'mouthguards'].includes(autoSelectService)) {
    // Set the initial service selection
    BookingState.selectedService = autoSelectService;
    
    // Wait for the page to fully load then auto-select
    setTimeout(function() {
      const serviceCard = document.querySelector(`.service-card[data-service="${autoSelectService}"]`);
      if (serviceCard) {
        selectService(serviceCard, autoSelectService);
      }
    }, 500);
  }

  // Initialize the booking system after DOM is ready
  initializeBookingSystem();
});

// Initialize the booking system
async function initializeBookingSystem() {
  try {
    // Show initial loading state
    showInitialLoadingState();
    
    // Initialize the booking system
    await BookingSystem.initialize();
    
  } catch (error) {
    console.error('Failed to initialize booking system:', error);
    showSystemUnavailableMessage();
  }
}

// Show loading state while system initializes
function showInitialLoadingState() {
  const calendarContainer = document.getElementById('appointment-calendar');
  if (calendarContainer) {
    calendarContainer.innerHTML = `
      <div class="booking-system-loading">
        <div class="text-center">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <h5>Loading Booking System...</h5>
          <p class="text-muted">Please wait while we prepare your appointment calendar.</p>
        </div>
      </div>`;
  }
}

// Show system unavailable message as fallback
function showSystemUnavailableMessage() {
  const calendarContainer = document.getElementById('appointment-calendar');
  if (calendarContainer) {
    calendarContainer.innerHTML = `
      <div class="booking-unavailable-container">
        <div class="alert alert-warning text-center">
          <h5><i class="fas fa-exclamation-triangle"></i> Booking System Temporarily Unavailable</h5>
          <p class="mb-3">We're experiencing technical difficulties with our online booking system.</p>
          <p class="mb-3">To book your appointment, please:</p>
          <div class="contact-options">
            <div class="row">
              <div class="col-md-6 mb-3">
                <div class="contact-method">
                  <i class="fas fa-phone fa-2x text-primary mb-2"></i>
                  <h6>Call Us</h6>
                  <p class="mb-1"><strong><a href="tel:0293987578">(02) 9398 7578</a></strong></p>
                  <small class="text-muted">Mon-Fri: 10am-4pm</small>
                </div>
              </div>
              <div class="col-md-6 mb-3">
                <div class="contact-method">
                  <i class="fas fa-envelope fa-2x text-primary mb-2"></i>
                  <h6>Email Us</h6>
                  <p class="mb-1"><strong><a href="mailto:info@dkdental.au">info@dkdental.au</a></strong></p>
                  <small class="text-muted">We'll respond within 24 hours</small>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-outline-primary mt-3" onclick="location.reload()">
            <i class="fas fa-redo"></i> Try Again
          </button>
          <p class="mb-0 mt-3"><small>Thank you for your patience as we resolve this issue.</small></p>
        </div>
      </div>`;
  }
}

// Service selection function - integrates with new booking system
function selectService(element, service) {
  console.log(`selectService called with service: ${service}`);
  
  // Update the service selection UI
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  });
  
  element.classList.add('selected');
  element.setAttribute('aria-pressed', 'true');
  
  // Update appointment type text
  updateAppointmentTypeText(service);
  
  // If booking system is initialized, use it
  if (BookingState.isInitialized && BookingFlow) {
    BookingFlow.selectService(service);
  } else {
    // Store selection for when system initializes
    BookingState.selectedService = service;
  }
}

// Service card keyboard handler
function handleServiceCardKeydown(event, element, service) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectService(element, service);
  }
}

// Get service name from service ID
function getServiceName(service) {
  const serviceNames = {
    'dentures': 'Dentures Consultation',
    'repairs': 'Maintenance & Repairs',
    'mouthguards': 'Mouthguards'
  };
  return serviceNames[service] || 'Appointment';
}

// Update appointment type text
function updateAppointmentTypeText(service) {
  const appointmentTypeText = document.getElementById('appointment-type-text');
  if (appointmentTypeText) {
    appointmentTypeText.textContent = `Booking: ${getServiceName(service)}`;
  }
}
