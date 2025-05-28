/**
 * Google Calendar Integration for DK Dental Studio Appointment Booking
 */

// Business timezone - Sydney, Australia
const BUSINESS_TIMEZONE = 'Australia/Sydney';

// Calendar configuration
const CALENDAR_ID = {
  'dentures': 'info@dkdental.au',
  'repairs': 'info@dkdental.au',
  'mouthguards': 'info@dkdental.au'
};

// Google API discovery docs
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Default service durations in minutes
const SERVICE_DURATION = {
  'dentures': 60,
  'repairs': 60,
  'mouthguards': 60
};

// Error types for consistent error handling
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  API_LIMIT: 'api_limit',
  INVALID_DATA: 'invalid_data',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

// Error configurations for user-friendly messages and recovery actions
const ERROR_CONFIG = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Connection Problem',
    message: 'Unable to connect to our booking system. Please check your internet connection.',
    actionText: 'Try Again',
    showContactInfo: true,
    isRetryable: true
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    title: 'Authentication Issue',
    message: 'There was a problem accessing the calendar system. Our team has been notified.',
    actionText: 'Refresh Page',
    showContactInfo: true,
    isRetryable: true
  },
  [ERROR_TYPES.API_LIMIT]: {
    title: 'Service Temporarily Unavailable',
    message: 'Our booking system is currently experiencing high demand. Please try again in a few minutes.',
    actionText: 'Try Again',
    showContactInfo: true,
    isRetryable: true
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: 'Request Timed Out',
    message: 'The request took too long to complete. This may be due to slow internet or high server load.',
    actionText: 'Try Again',
    showContactInfo: true,
    isRetryable: true
  },
  [ERROR_TYPES.INVALID_DATA]: {
    title: 'Data Error',
    message: 'There was an issue with the booking data. Please refresh the page and try again.',
    actionText: 'Refresh Page',
    showContactInfo: true,
    isRetryable: false
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Our team has been notified and will investigate.',
    actionText: 'Try Again',
    showContactInfo: true,
    isRetryable: true
  }
};

// Consolidated application state management
const appState = {
  // Core state
  selectedService: 'dentures',
  selectedDateTime: null,
  
  // API and initialization state
  gapi: null,
  serverAccessToken: null,
  isInitialized: false,
  isInitializing: false,
  
  // Calendar data and loading state
  availabilityData: {},
  isLoadingAvailability: false,
  availabilityLoaded: false,
  availabilityLoadingPromise: null,
  
  // UI state
  bookingConfirmationDisplayed: false,
  fallbackMessageDisplayed: false, // NEW: Flag to prevent overriding fallback messages
  
  // Methods to manage state
  reset() {
    this.selectedDateTime = null;
    this.bookingConfirmationDisplayed = false;
  },
  
  setAvailabilityData(data) {
    this.availabilityData = data;
    this.availabilityLoaded = true;
    this.isLoadingAvailability = false;
    this.availabilityLoadingPromise = null;
  },
  
  clearAvailabilityData() {
    this.availabilityData = {};
    this.availabilityLoaded = false;
    this.isLoadingAvailability = false;
    this.availabilityLoadingPromise = null;
  },
  
  markSlotAsBooked(dateKey, timeSlot) {
    if (this.availabilityData[dateKey]) {
      this.availabilityData[dateKey] = this.availabilityData[dateKey].filter(
        slot => slot !== timeSlot
      );
    }
  }
};

// Set initial service
window.selectedService = appState.selectedService;

// Enhanced token management with improved error handling
const tokenManager = {
  fetchPromise: null,
  
  async getToken() {
    if (this.fetchPromise) {
      return this.fetchPromise;
    }
    
    this.fetchPromise = this._fetchNewToken();
    try {
      const token = await this.fetchPromise;
      // Clear the promise after a short delay to allow for immediate retries
      setTimeout(() => {
        this.fetchPromise = null;
      }, 5000);
      return token;
    } catch (error) {
      this.fetchPromise = null;
      
      // Use enhanced error handling for token fetch failures
      errorHandler.handle(error, {
        operation: 'authentication',
        context: 'Token fetch failed',
        component: 'tokenManager'
      });
      
      throw error;
    }
  },
  
  async _fetchNewToken() {
    const apiUrl = 'script/calendar/get-access-token.php';
    const cacheBuster = new Date().getTime();
    const urlWithNoCaching = apiUrl + '?nocache=' + cacheBuster;

    try {
      const response = await fetch(urlWithNoCaching, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const error = new Error(`Failed to fetch token: ${response.status}`);
        error.status = response.status;
        error.context = 'HTTP error during token fetch';
        throw error;
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        const error = new Error('Invalid JSON response from token endpoint');
        error.originalError = e;
        error.responseText = text;
        throw error;
      }

      if (data.success && data.access_token) {
        return data.access_token;
      } else {
        const error = new Error(data.error || 'No access token in response');
        error.serverResponse = data;
        error.context = 'Server returned unsuccessful response';
        throw error;
      }
    } catch (error) {
      // Add additional context for network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        error.context = 'Network connectivity issue during token fetch';
      }
      throw error;
    }
  }
};

/**
 * Timezone utilities for proper date handling
 */
const timezoneUtils = {
  // Create a date in business timezone from date string and time string
  createBusinessDateTime(dateString, timeString) {
    // Parse the date components
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create date in business timezone using proper constructor
    // This avoids timezone conversion issues
    const date = new Date();
    date.setFullYear(year);
    date.setMonth(month - 1); // Month is 0-indexed
    date.setDate(day);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    return date;
  },
  
  // Format date to business timezone for display
  formatDateInBusinessTZ(date) {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  },
  
  // Format time to business timezone for display
  formatTimeInBusinessTZ(date) {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: BUSINESS_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  },
  
  // Get current time in business timezone
  getCurrentBusinessTime() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {timeZone: BUSINESS_TIMEZONE}));
  },
  
  // Create a date string (YYYY-MM-DD) in business timezone
  getDateStringInBusinessTZ(date) {
    const businessDate = new Date(date.toLocaleString("en-US", {timeZone: BUSINESS_TIMEZONE}));
    return businessDate.toISOString().split('T')[0];
  },
  
  // Check if a date is today in business timezone
  isToday(date) {
    const today = this.getCurrentBusinessTime();
    const checkDate = new Date(date.toLocaleString("en-US", {timeZone: BUSINESS_TIMEZONE}));
    
    return today.getFullYear() === checkDate.getFullYear() &&
           today.getMonth() === checkDate.getMonth() &&
           today.getDate() === checkDate.getDate();
  }
};

/**
 * Format a date string for display using proper timezone
 */
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return timezoneUtils.formatDateInBusinessTZ(date);
}

/**
 * Format a time string for display
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const paddedMinutes = minutes.padStart(2, '0');

  if (hour === 0) {
    return `12:${paddedMinutes}am`;
  } else if (hour < 12) {
    return `${hour}:${paddedMinutes}am`;
  } else if (hour === 12) {
    return `12:${paddedMinutes}pm`;
  } else {
    return `${hour - 12}:${paddedMinutes}pm`;
  }
}

/**
 * On page load, initialize Google API client and calendar manager
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Starting calendar initialization');
  console.log('Current protocol:', window.location.protocol);
  console.log('Current hostname:', window.location.hostname);
  
  // Check if we're running on a local file or localhost
  const isLocalAccess = window.location.protocol === 'file:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';
  
  if (isLocalAccess) {
    console.log('Local access detected - checking for Google API with shorter timeout');
  }
  
  // Set the selected service if not already set
  if (!window.selectedService) {
    window.selectedService = 'dentures';
  }

  // Initialize the calendar manager with dependencies
  calendarManager.init({
    appState: appState,
    errorHandler: errorHandler,
    timezoneUtils: timezoneUtils
  });

  // Make calendarManager globally accessible for onclick handlers
  window.calendarManager = calendarManager;

  // Set initial service
  calendarManager.setService(window.selectedService);

  // Check if Google API is already available
  if (window.gapi) {
    // Google API is already loaded, start initialization
    console.log('Google API already available, starting initialization');
    if (!appState.isInitialized && !appState.isInitializing) {
      initializeCalendar();
    }
  } else {
    // Google API not available yet, wait for it with progressive timeouts
    console.log('Google API not available yet, waiting for it to load...');
    console.log('Available globals:', Object.keys(window).filter(key => key.includes('goog') || key.includes('api')));
    
    let checkCount = 0;
    // Shorter timeout for local access, longer for production
    const maxChecks = isLocalAccess ? 10 : 30; // 1 second for local, 3 seconds for production
    
    const checkGoogleAPI = () => {
      checkCount++;
      console.log(`Checking for Google API... attempt ${checkCount}/${maxChecks}`);
      
      if (window.gapi) {
        console.log('Google API loaded after', checkCount * 100, 'ms');
        if (!appState.isInitialized && !appState.isInitializing) {
          initializeCalendar();
        }
        return;
      }
      
      if (checkCount >= maxChecks) {
        console.log('Google API failed to load after', maxChecks * 100, 'ms - showing fallback');
        console.log('Final available globals:', Object.keys(window).filter(key => key.includes('goog') || key.includes('api')));
        showLocalTestingFallback();
        return;
      }
      
      // Continue checking
      setTimeout(checkGoogleAPI, 100);
    };
    
    // Start checking immediately
    checkGoogleAPI();
  }

  // Add timeout for initialization to prevent infinite loading
  // Shorter timeout for local access
  const finalTimeout = isLocalAccess ? 3000 : 8000; // 3 seconds for local, 8 seconds for production
  setTimeout(() => {
    if (!appState.isInitialized && !appState.isInitializing) {
      console.log('Final timeout reached - Google API may not be available');
      showLocalTestingFallback();
    } else if (appState.isInitializing) {
      console.log(`Initialization still in progress after ${finalTimeout/1000} seconds - showing fallback`);
      appState.isInitializing = false;
      appState.isInitialized = true;
      showServerErrorFallback(new Error('Initialization timeout'));
    }
  }, finalTimeout);
});

/**
 * Initialize the calendar system - orchestrates the initialization process
 */
function initializeCalendar() {
  // Prevent multiple initializations
  if (appState.isInitializing) {
    return;
  }

  appState.isInitializing = true;

  // Step 1: Initialize Google API
  if (!initializeGoogleAPI()) {
    return;
  }

  // Step 2: Load API client and authenticate
  loadGoogleAPIClient();
}

/**
 * Initialize Google API client - handles only API client setup
 */
function initializeGoogleAPI() {
  appState.gapi = window.gapi;
  if (!appState.gapi) {
    appState.isInitializing = false;
    appState.isInitialized = true; // Mark as initialized to prevent retry loops
    
    // Show a user-friendly fallback message instead of error
    showLocalTestingFallback();
    return false;
  }
  return true;
}

/**
 * Show fallback UI for local testing when Google API is not available
 */
function showLocalTestingFallback() {
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) return;
  
  // Set flag to prevent this message from being overridden
  appState.fallbackMessageDisplayed = true;
  appState.isInitialized = true; // Mark as initialized to prevent further attempts
  appState.isInitializing = false;
  
  calendarContainer.innerHTML = `
    <div class="alert alert-warning">
      <div class="text-center mb-4">
        <i class="fas fa-exclamation-triangle text-warning" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">Our Booking System is Temporarily Unavailable</h4>
      <p class="text-left mb-4">We're currently experiencing a technical issue and are unable to process online bookings at the moment. We understand this may be inconvenient, and we're working to resolve the issue as quickly as possible. In the meantime, we're here to help you book your appointment directly. Please don't hesitate to contact our friendly team.</p>
      <div class="alert alert-info mt-3">
        <h6><strong>You can reach us via:</strong></h6>
        <ul class="mb-0">
          <li><strong>📞 Phone:</strong> <a href="tel:0293987578">(02) 9398 7578</a></li>
          <li><strong>📧 Email:</strong> <a href="mailto:info@dkdental.au">info@dkdental.au</a></li>
        </ul>
      </div>
      <p class="text-center mt-4 mb-4">Thank you for your patience and understanding. We look forward to speaking with you soon and getting your appointment scheduled.</p>
      <div class="text-center">
        <a href="contact-us.html" class="btn btn-outline-primary">
          <i class="fas fa-phone"></i> Contact Us
        </a>
      </div>
    </div>
  `;
}

/**
 * Load Google API client libraries - handles only API loading
 */
function loadGoogleAPIClient() {
  appState.gapi.load('client', function() {
    initializeAPIClient();
  });
}

/**
 * Initialize API client with discovery docs - handles only client initialization
 */
function initializeAPIClient() {
  appState.gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
  }).then(async () => {
    await authenticateAndLoadCalendar();
  })
  .catch(err => {
    appState.isInitializing = false;
    
    // Use enhanced error handling
    errorHandler.handle(err, {
      operation: 'initialization',
      context: 'Failed to initialize Google API client',
      component: 'initializeAPIClient'
    });
  });
}

/**
 * Authenticate and load calendar data - handles authentication and data loading
 */
async function authenticateAndLoadCalendar() {
  try {
    // Step 1: Authenticate
    const token = await tokenManager.getToken();
    appState.serverAccessToken = token;
    appState.gapi.client.setToken({ access_token: token });

    // Step 2: Load data
    await loadInitialCalendarData();
    
    // Step 3: Complete initialization
    completeInitialization();
  } catch (err) {
    handleInitializationError(err);
  }
}

/**
 * Load initial calendar data - handles only data loading
 */
async function loadInitialCalendarData() {
  await loadAllAvailabilityData();
}

/**
 * Complete the initialization process - uses calendar manager
 */
function completeInitialization() {
  appState.isInitialized = true;
  appState.isInitializing = false;
  
  // Use calendar manager for rendering
  calendarManager.render();
}

/**
 * Handle initialization errors - handles only error state management
 */
function handleInitializationError(error) {
  appState.isInitialized = true;
  appState.isInitializing = false;
  
  // Show user-friendly fallback instead of complex error handling
  showServerErrorFallback(error);
}

/**
 * Show fallback UI for server/authentication errors
 */
function showServerErrorFallback(error) {
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) return;
  
  // Set flag to prevent this message from being overridden
  appState.fallbackMessageDisplayed = true;
  appState.isInitialized = true; // Mark as initialized to prevent further attempts
  appState.isInitializing = false;
  
  calendarContainer.innerHTML = `
    <div class="alert alert-warning">
      <div class="text-center mb-4">
        <i class="fas fa-exclamation-triangle text-warning" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">Our Booking System is Temporarily Unavailable</h4>
      <p class="text-left mb-4">We're currently experiencing a technical issue and are unable to process online bookings at the moment. We understand this may be inconvenient, and we're working to resolve the issue as quickly as possible. In the meantime, we're here to help you book your appointment directly. Please don't hesitate to contact our friendly team.</p>
      <div class="alert alert-info mt-3">
        <h6><strong>You can reach us via:</strong></h6>
        <ul class="mb-0">
          <li><strong>📞 Phone:</strong> <a href="tel:0293987578">(02) 9398 7578</a></li>
          <li><strong>📧 Email:</strong> <a href="mailto:info@dkdental.au">info@dkdental.au</a></li>
        </ul>
      </div>
      <p class="text-center mt-4 mb-4">Thank you for your patience and understanding. We look forward to speaking with you soon and getting your appointment scheduled.</p>
      <div class="text-center">
        <a href="contact-us.html" class="btn btn-outline-primary">
          <i class="fas fa-phone"></i> Contact Us
        </a>
      </div>
    </div>
  `;
}

/**
 * Simplified load calendar function - delegates to calendar manager
 */
function loadCalendar(service) {
  // Don't render if fallback message is displayed
  if (appState.fallbackMessageDisplayed) {
    console.log('Skipping calendar load - fallback message displayed');
    return;
  }
  calendarManager.setService(service).render();
}

/**
 * Expose the loadCalendarForService function globally - uses calendar manager
 */
window.loadCalendarForService = function(service) {
  // Skip if we're displaying a booking confirmation or fallback message
  if (appState.bookingConfirmationDisplayed || appState.fallbackMessageDisplayed) {
    console.log('Skipping service load - fallback or confirmation displayed');
    return;
  }

  // Use calendar manager for service switching
  calendarManager.setService(service);
  
  // If system is ready, render immediately
  if (appState.isInitialized) {
    calendarManager.render();
  } else if (!appState.isInitializing) {
    // Start initialization if not already in progress
    initializeCalendar();
  }
};

// Backward compatibility functions - simplified versions that delegate to calendar manager

/**
 * Show time slots - delegates to calendar manager
 */
window.showTimeSlots = function(dayElement) {
  const dateString = dayElement.getAttribute('data-date');
  calendarManager.selectDay(dateString);
};

/**
 * Select time slot - delegates to calendar manager
 */
window.selectTimeSlot = function(timeSlot, dateString, timeString) {
  calendarManager.selectTimeSlot(dateString, timeString);
};

/**
 * Navigation functions - delegate to calendar manager
 */
window.prevMonth = function() {
  calendarManager.navigatePrevious();
};

window.nextMonth = function() {
  calendarManager.navigateNext();
};

/**
 * Reset booking form - updated to work with calendar manager
 */
window.resetBookingForm = function() {
  // Reset the booking process
  calendarManager.clearSelection();
  appState.bookingConfirmationDisplayed = false;

  // Clear UI
  calendarManager.clearTimeSlots();
  calendarManager.clearBookingForm();

  // Re-render calendar
  calendarManager.render();

  // Scroll back to the calendar
  const calendarContainer = document.getElementById('appointment-calendar');
  if (calendarContainer) {
    calendarContainer.scrollIntoView({ behavior: 'smooth' });
  }
};

/**
 * Enhanced booking error display - replaces showBookingError
 */
function showBookingError(errorType = ERROR_TYPES.UNKNOWN, customMessage = null) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;

  const errorConfig = ERROR_CONFIG[errorType];
  const message = customMessage || errorConfig.message;

  bookingFormContainer.innerHTML = `
    <div class="booking-error">
      <div class="text-center mb-4">
        <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">${errorConfig.title}</h4>
      <p class="text-center">${message}</p>
      <div class="alert alert-info mt-3">
        <h6><strong>Alternative booking options:</strong></h6>
        <ul class="mb-0">
          <li><strong>Phone:</strong> <a href="tel:0293987578">(02) 9398 7578</a></li>
          <li><strong>Email:</strong> <a href="mailto:info@dkdental.au">info@dkdental.au</a></li>
        </ul>
      </div>
      <div class="text-center mt-4">
        ${errorConfig.isRetryable ? '<button class="btn btn-primary" onclick="resetBookingForm()">Try Again</button>' : ''}
        <a href="contact-us.html" class="btn btn-outline-primary ${errorConfig.isRetryable ? 'ml-2' : ''}">
          <i class="fas fa-phone"></i> Contact Us
        </a>
      </div>
    </div>
  `;
}

/**
 * Load all availability data for the next 6 weeks
 */
function loadAllAvailabilityData() {
  // Prevent multiple simultaneous loading
  if (appState.isLoadingAvailability) {
    if (appState.availabilityLoadingPromise) {
      return appState.availabilityLoadingPromise;
    }
    // If we don't have a promise but the flag is set, something went wrong
    // Reset the flag and try again
    appState.isLoadingAvailability = false;
  }

  appState.isLoadingAvailability = true;

  // Create the promise
  appState.availabilityLoadingPromise = new Promise((resolve, reject) => {
    // Get dates for the next 3 months
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3); // 3 months

    // Set a longer timeout for the loading process (30 seconds)
    const timeoutId = setTimeout(() => {
      // Reject on timeout with proper error structure
      appState.isLoadingAvailability = false;
      appState.availabilityLoadingPromise = null;
      
      const error = new Error('Calendar loading timeout');
      error.context = 'Data loading exceeded 30 second timeout';
      reject(error);
    }, 30000);

    // Load availability data for the next 3 months
    loadAvailabilityPeriod(today, threeMonthsLater)
      .then((data) => {
        // Clear the timeout
        clearTimeout(timeoutId);

        // Store the data using the state management
        appState.setAvailabilityData(data);

        resolve(data);
      })
      .catch(err => {
        // Clear the timeout
        clearTimeout(timeoutId);

        appState.isLoadingAvailability = false;
        appState.availabilityLoadingPromise = null;

        // Enhance error with context if needed
        if (!err.context) {
          err.context = 'Failed to load calendar availability data';
        }
        
        reject(err);
      });
  });

  return appState.availabilityLoadingPromise;
}

/**
 * Load availability data for a specific period
 */
function loadAvailabilityPeriod(startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    try {
      // Format dates for the API
      const timeMin = startDate.toISOString();
      const timeMax = endDate.toISOString();

      // Make sure we have a valid token before proceeding
      if (!appState.gapi.client.getToken()) {
        const token = await tokenManager.getToken();
        appState.serverAccessToken = token;
        appState.gapi.client.setToken({ access_token: token });
      }

      // Make the calendar API call
      try {
        const response = await getCalendarEvents(timeMin, timeMax);
        processCalendarData(response, startDate, endDate, resolve);
      } catch (err) {
        // Try refreshing the token once
        const token = await tokenManager.getToken();
        appState.serverAccessToken = token;
        appState.gapi.client.setToken({ access_token: token });

        // Retry the calendar API call
        const response = await getCalendarEvents(timeMin, timeMax);
        processCalendarData(response, startDate, endDate, resolve);
      }
    } catch (error) {
      // Add context to the error
      if (!error.context) {
        error.context = 'Failed to load availability period from Google Calendar API';
      }
      reject(error);
    }
  });
}

/**
 * Make the actual API call to get calendar events
 */
function getCalendarEvents(timeMin, timeMax) {
  return appState.gapi.client.calendar.events.list({
    calendarId: CALENDAR_ID[window.selectedService],
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  });
}

/**
 * Process calendar data from API response - orchestrates data processing
 */
function processCalendarData(response, startDate, endDate, resolve) {
  // Step 1: Parse events into busy periods
  const busyPeriods = parseCalendarEvents(response);
  
  // Step 2: Generate availability for the period
  const periodData = generatePeriodAvailability(startDate, endDate, busyPeriods);
  
  // Step 3: Return the processed data
  resolve(periodData);
}

/**
 * Parse calendar events into busy periods - handles only event parsing
 */
function parseCalendarEvents(response) {
  const busyPeriods = {};

  if (response.result && response.result.items && response.result.items.length > 0) {
    response.result.items.forEach(event => {
      // Skip certain types of events
      if (shouldSkipEvent(event)) {
        return;
      }

      // Only process events with dateTime (not all-day events)
      if (event.start.dateTime && event.end.dateTime) {
        const busyPeriod = createBusyPeriodFromEvent(event);
        if (busyPeriod) {
          addBusyPeriodToDay(busyPeriods, busyPeriod);
        }
      }
    });
  }

  return busyPeriods;
}

/**
 * Check if an event should be skipped - handles only event filtering logic
 */
function shouldSkipEvent(event) {
  return event.eventType === 'workingLocation' ||
         event.transparency === 'transparent' ||
         (event.start.date && !event.start.dateTime) ||
         (event.start && event.end && event.start.dateTime === event.end.dateTime);
}

/**
 * Create a busy period object from a calendar event - handles only data transformation
 */
function createBusyPeriodFromEvent(event) {
  const startDate = new Date(event.start.dateTime);
  const endDate = new Date(event.end.dateTime);
  
  return {
    dayKey: startDate.toISOString().split('T')[0],
    summary: event.summary,
    start: startDate,
    end: endDate
  };
}

/**
 * Add a busy period to the appropriate day - handles only data aggregation
 */
function addBusyPeriodToDay(busyPeriods, busyPeriod) {
  const dayKey = busyPeriod.dayKey;
  
  if (!busyPeriods[dayKey]) {
    busyPeriods[dayKey] = [];
  }
  
  busyPeriods[dayKey].push({
    summary: busyPeriod.summary,
    start: busyPeriod.start,
    end: busyPeriod.end
  });
}

/**
 * Generate availability data for a date period - handles only availability generation
 */
function generatePeriodAvailability(startDate, endDate, busyPeriods) {
  const periodData = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Loop through each day in the period
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dayData = processDayAvailability(new Date(day), busyPeriods);
    if (dayData) {
      periodData[dayData.dayKey] = dayData.availableSlots;
    }
  }

  return periodData;
}

/**
 * Process availability for a single day - handles only single day processing
 */
function processDayAvailability(dateObj, busyPeriods) {
  const dayOfWeek = dateObj.getDay();
  
  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return null;
  }

  const dayKey = dateObj.toISOString().split('T')[0];
  const allSlots = getAllPossibleTimeSlots(dateObj);
  const availableSlots = filterAvailableSlots(allSlots, dateObj, busyPeriods[dayKey] || []);
  
  return {
    dayKey,
    availableSlots: validateDaySlots(availableSlots, allSlots, busyPeriods[dayKey])
  };
}

/**
 * Validate and correct day slots if needed - handles only data validation
 */
function validateDaySlots(availableSlots, allSlots, dayBusyPeriods) {
  // Safety measure: provide default slots if incorrectly marked as fully booked
  if (availableSlots.length === 0 && (!dayBusyPeriods || dayBusyPeriods.length === 0)) {
    return allSlots;
  }
  return availableSlots;
}

/**
 * Get all possible time slots for a day
 */
function getAllPossibleTimeSlots(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check for weekends first
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // No appointments on weekends
    return [];
  }

  // Get the selected service
  const selectedService = window.selectedService || 'dentures';

  // Business hours based on service and day
  const startHour = 10; // 10 AM for all services
  let endHour;

  if (selectedService === 'mouthguards') {
    // Mouthguards: Mon-Thu 10AM-5PM, Fri 10AM-3PM
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
      endHour = 18; // 6 PM (last slot 5PM for 5-6PM booking)
    } else if (dayOfWeek === 5) { // Friday
      endHour = 16; // 4 PM (last slot 3PM for 3-4PM booking)
    }
  } else {
    // Dentures and Repairs: Mon-Fri 10AM-3PM
    endHour = 16; // 4 PM (last slot 3PM for 3-4PM booking)
  }

  // Generate time slots every 60 minutes - business requirement
  const allSlots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    // Add hour slots (e.g. 10:00, 11:00)
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
  }

  return allSlots;
}

/**
 * Check if today should be marked as unavailable due to business hours being over
 */
function isTodayUnavailableDueToBusinessHours(date) {
  // Use business timezone for proper time checking
  const businessNow = timezoneUtils.getCurrentBusinessTime();
  
  // Only check for today in business timezone
  if (!timezoneUtils.isToday(date)) {
    return false;
  }

  const dayOfWeek = businessNow.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const selectedService = window.selectedService || 'dentures';

  // Get business closing hour for the service and day
  let businessCloseHour;

  if (selectedService === 'mouthguards') {
    // Mouthguards: Mon-Thu until 6PM, Fri until 4PM
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
      businessCloseHour = 18; // 6 PM
    } else if (dayOfWeek === 5) { // Friday
      businessCloseHour = 16; // 4 PM
    } else {
      return true; // Weekend - always unavailable
    }
  } else {
    // Dentures and Repairs: Mon-Fri until 4PM
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      businessCloseHour = 16; // 4 PM
    } else {
      return true; // Weekend - always unavailable
    }
  }

  // Check if current time is past business hours in business timezone
  const currentHour = businessNow.getHours();
  const isBusinessClosed = currentHour >= businessCloseHour;

  return isBusinessClosed;
}

/**
 * Filter available slots based on busy periods
 */
function filterAvailableSlots(allSlots, date, busyPeriods) {
  if (!busyPeriods || !busyPeriods.length) {
    return allSlots; // No busy periods, all slots available
  }

  const dateStr = date.toISOString().split('T')[0];
  const busySlots = [];

  // Process each slot and determine if it's busy
  allSlots.forEach(slot => {
    const [hoursStr, minutesStr] = slot.split(':');
    const slotHour = parseInt(hoursStr, 10);
    const slotMinute = parseInt(minutesStr, 10);

    // Calculate slot end time (adding service duration)
    const slotDuration = SERVICE_DURATION[window.selectedService];
    const slotEndHour = slotHour + Math.floor((slotMinute + slotDuration) / 60);
    const slotEndMinute = (slotMinute + slotDuration) % 60;

    // Check against each busy period
    for (const period of busyPeriods) {
      // Get period times as explicit hours/minutes
      const periodStart = period.start instanceof Date ? period.start : new Date(period.start);
      const periodEnd = period.end instanceof Date ? period.end : new Date(period.end);

      const periodStartHour = periodStart.getHours();
      const periodStartMinute = periodStart.getMinutes();
      const periodEndHour = periodEnd.getHours();
      const periodEndMinute = periodEnd.getMinutes();

      // Skip if the period is on a different day
      if (periodStart.toISOString().split('T')[0] !== dateStr &&
          periodEnd.toISOString().split('T')[0] !== dateStr) {
        continue;
      }

      // Compare time directly using numeric values for reliable comparison
      // Convert hours and minutes to minutes-since-midnight for easier comparison
      const slotStartMinutes = slotHour * 60 + slotMinute;
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
      const periodStartMinutes = periodStartHour * 60 + periodStartMinute;
      const periodEndMinutes = periodEndHour * 60 + periodEndMinute;

      // Check for overlap - basic interval overlap check
      const isOverlap = (
        // Either the slot starts during the busy period
        (slotStartMinutes >= periodStartMinutes && slotStartMinutes < periodEndMinutes) ||
        // Or the slot ends during the busy period
        (slotEndMinutes > periodStartMinutes && slotEndMinutes <= periodEndMinutes) ||
        // Or the slot completely covers the busy period
        (slotStartMinutes <= periodStartMinutes && slotEndMinutes >= periodEndMinutes)
      );

      if (isOverlap) {
        busySlots.push(slot);
        break;  // No need to check other periods once we know it's busy
      }
    }
  });

  // Filter out busy slots to get available slots
  const availableSlots = allSlots.filter(slot => !busySlots.includes(slot));

  return availableSlots;
}

/**
 * Enhanced Error Handler - Centralized error management with user feedback
 */
const errorHandler = {
  // Track retry attempts to prevent infinite loops
  retryAttempts: new Map(),
  maxRetries: 3,

  /**
   * Handle errors with proper classification and user feedback
   */
  handle(error, context = {}) {
    const errorType = this.classifyError(error);
    const errorConfig = ERROR_CONFIG[errorType];
    
    // Log error for debugging (could be sent to logging service)
    this.logError(error, errorType, context);
    
    // Show appropriate user feedback
    this.showErrorUI(errorType, errorConfig, context);
    
    return {
      type: errorType,
      config: errorConfig,
      canRetry: this.canRetry(context.operation)
    };
  },

  /**
   * Classify error type based on error properties
   */
  classifyError(error) {
    if (!error) return ERROR_TYPES.UNKNOWN;
    
    const errorMessage = error.message || error.toString();
    
    // Network-related errors
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      return ERROR_TYPES.NETWORK;
    }
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return ERROR_TYPES.NETWORK;
    }
    
    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    if (errorMessage.includes('token') || errorMessage.includes('auth')) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    
    // API limit errors
    if (error.status === 429 || errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return ERROR_TYPES.API_LIMIT;
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return ERROR_TYPES.TIMEOUT;
    }
    
    // Data validation errors
    if (error.status === 400 || errorMessage.includes('Invalid JSON') || errorMessage.includes('validation')) {
      return ERROR_TYPES.INVALID_DATA;
    }
    
    return ERROR_TYPES.UNKNOWN;
  },

  /**
   * Log error for debugging and monitoring
   */
  logError(error, errorType, context) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message || error.toString(),
      stack: error.stack,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // In production, this could send to a logging service
    console.error('Calendar Error:', logData);
  },

  /**
   * Show error UI with consistent styling and actions
   */
  showErrorUI(errorType, errorConfig, context) {
    const targetContainer = this.getErrorContainer(context);
    if (!targetContainer) return;

    const canRetry = this.canRetry(context.operation);
    const retryAction = canRetry ? this.createRetryAction(context) : null;

    targetContainer.innerHTML = this.createErrorHTML(errorConfig, retryAction);
  },

  /**
   * Determine the appropriate container for error display
   */
  getErrorContainer(context) {
    if (context.container) {
      return context.container;
    }
    
    // Default containers based on context
    if (context.operation === 'booking') {
      return document.getElementById('booking-form-container');
    }
    if (context.operation === 'timeSlots') {
      return document.getElementById('time-slots-container');
    }
    
    // Default to calendar container
    return document.getElementById('appointment-calendar');
  },

  /**
   * Create error HTML with consistent styling
   */
  createErrorHTML(errorConfig, retryAction) {
    const retryButton = retryAction ? 
      `<button class="btn btn-primary" onclick="${retryAction.handler}">${retryAction.text}</button>` : '';
    
    const contactInfo = errorConfig.showContactInfo ? `
      <div class="alert alert-info mt-3">
        <h6><strong>Need immediate assistance?</strong></h6>
        <ul class="mb-0">
          <li><strong>Phone:</strong> <a href="tel:0293987578">(02) 9398 7578</a></li>
          <li><strong>Email:</strong> <a href="mailto:info@dkdental.au">info@dkdental.au</a></li>
        </ul>
      </div>
    ` : '';

    return `
      <div class="error-container">
        <div class="text-center mb-4">
          <i class="fas fa-exclamation-triangle text-warning" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">${errorConfig.title}</h4>
        <p class="text-center">${errorConfig.message}</p>
        ${contactInfo}
        <div class="text-center mt-4">
          ${retryButton}
          <a href="contact-us.html" class="btn btn-outline-primary ml-2">
            <i class="fas fa-phone"></i> Contact Us
          </a>
        </div>
      </div>
    `;
  },

  /**
   * Check if operation can be retried
   */
  canRetry(operation) {
    if (!operation) return false;
    
    const attempts = this.retryAttempts.get(operation) || 0;
    return attempts < this.maxRetries;
  },

  /**
   * Create retry action for recoverable errors
   */
  createRetryAction(context) {
    const operation = context.operation;
    if (!this.canRetry(operation)) return null;

    return {
      text: 'Try Again',
      handler: `errorHandler.retry('${operation}', ${JSON.stringify(context).replace(/"/g, "'")})`
    };
  },

  /**
   * Retry a failed operation
   */
  async retry(operation, context) {
    const attempts = this.retryAttempts.get(operation) || 0;
    this.retryAttempts.set(operation, attempts + 1);

    try {
      // Show loading state
      const container = this.getErrorContainer(context);
      if (container) {
        container.innerHTML = `
          <div class="text-center">
            <div class="spinner" style="margin: 20px auto;"></div>
            <h4 class="mt-3">Retrying...</h4>
            <p>Attempting to reconnect to the booking system...</p>
          </div>
        `;
      }

      // Perform retry based on operation type
      switch (operation) {
        case 'initialization':
          await this.retryInitialization();
          break;
        case 'dataLoading':
          await this.retryDataLoading();
          break;
        case 'booking':
          await this.retryBooking(context);
          break;
        default:
          window.location.reload();
      }
      
      // Clear retry count on success
      this.retryAttempts.delete(operation);
      
    } catch (error) {
      // Handle retry failure
      this.handle(error, context);
    }
  },

  /**
   * Retry initialization process
   */
  async retryInitialization() {
    appState.isInitializing = false;
    appState.isInitialized = false;
    initializeCalendar();
  },

  /**
   * Retry data loading process
   */
  async retryDataLoading() {
    appState.clearAvailabilityData();
    await loadAllAvailabilityData();
    calendarManager.render();
  },

  /**
   * Retry booking submission
   */
  async retryBooking(context) {
    if (context.bookingData) {
      await sendBookingConfirmation(context.bookingData);
    } else {
      // If no booking data, restart the booking process
      window.resetBookingForm();
    }
  }
};

/**
 * Centralized Calendar Manager - Manages all calendar state and rendering
 * Eliminates complex dependencies and scattered re-rendering logic
 */
const calendarManager = {
  // Internal state - encapsulated and controlled
  currentState: {
    service: 'dentures',
    month: null,
    year: null,
    selectedDate: null,
    selectedTime: null,
    isRendered: false,
    container: null
  },

  // Dependencies injection - makes dependencies explicit
  dependencies: {
    appState: null,
    errorHandler: null,
    timezoneUtils: null
  },

  /**
   * Initialize the calendar manager with dependencies
   */
  init(dependencies) {
    this.dependencies = dependencies;
    this.currentState.container = document.getElementById('appointment-calendar');
    
    if (!this.currentState.container) {
      console.error('Calendar container not found');
      return;
    }

    // Set initial state
    const now = this.dependencies.timezoneUtils.getCurrentBusinessTime();
    this.currentState.month = now.getMonth();
    this.currentState.year = now.getFullYear();
    this.currentState.service = this.dependencies.appState.selectedService;
    
    // Add resize event listener to handle mobile/desktop view changes
    this.setupResizeHandler();
  },

  /**
   * Setup resize handler for responsive calendar
   */
  setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Re-render calendar when view changes
        if (this.isSystemReady()) {
          this.render();
        }
      }, 250); // Debounce resize events
    });
  },

  /**
   * Get current calendar state - single source of truth
   */
  getState() {
    return { ...this.currentState };
  },

  /**
   * Set service and trigger re-render if needed
   */
  setService(service) {
    const previousService = this.currentState.service;
    this.currentState.service = service;
    
    // Update global reference for backward compatibility
    window.selectedService = service;
    
    // If service changed and calendar is rendered, handle the change
    if (previousService !== service && this.currentState.isRendered) {
      this.handleServiceChange(previousService, service);
    }
    
    return this;
  },

  /**
   * Set date display and trigger re-render
   */
  setDate(month, year) {
    this.currentState.month = month;
    this.currentState.year = year;
    
    if (this.currentState.isRendered) {
      this.renderCalendar();
    }
    
    return this;
  },

  /**
   * Set selected date and time
   */
  setSelection(dateString, timeString = null) {
    this.currentState.selectedDate = dateString;
    this.currentState.selectedTime = timeString;
    
    // Update appState for backward compatibility
    if (dateString && timeString) {
      this.dependencies.appState.selectedDateTime = {
        date: dateString,
        time: timeString,
        service: this.currentState.service
      };
    }
    
    return this;
  },

  /**
   * Clear selections
   */
  clearSelection() {
    this.currentState.selectedDate = null;
    this.currentState.selectedTime = null;
    this.dependencies.appState.selectedDateTime = null;
    
    return this;
  },

  /**
   * Main render method - single entry point for all calendar rendering
   */
  render() {
    if (!this.currentState.container) {
      return this;
    }

    // Don't override fallback messages
    if (this.dependencies.appState.fallbackMessageDisplayed) {
      console.log('Fallback message is displayed, skipping render');
      return this;
    }

    // Check if system is ready
    if (!this.isSystemReady()) {
      this.renderLoadingState();
      return this;
    }

    // Render the calendar
    this.renderCalendar();
    return this;
  },

  /**
   * Check if the system is ready for rendering
   */
  isSystemReady() {
    const appState = this.dependencies.appState;
    return appState.isInitialized && appState.availabilityLoaded;
  },

  /**
   * Render loading state
   */
  renderLoadingState() {
    this.currentState.container.innerHTML = `
      <div class="calendar-loading">
        <div class="spinner"></div>
        <p>Loading appointment calendar for ${this.getServiceName()}...</p>
      </div>
    `;
  },

  /**
   * Core calendar rendering logic - consolidated from scattered functions
   */
  renderCalendar() {
    const container = this.currentState.container;
    
    // Generate calendar HTML
    const calendarHTML = this.createCalendarHTML();
    container.innerHTML = calendarHTML;
    
    // Setup interactions
    this.setupInteractions();
    
    // Mark available dates
    this.markAvailableDates();
    
    // Update state
    this.currentState.isRendered = true;
    window.currentCalendarService = this.currentState.service;
    
    // Update service UI
    this.updateServiceUI();
  },

  /**
   * Create calendar HTML - centralized HTML generation
   */
  createCalendarHTML() {
    const { month, year, service } = this.currentState;
    
    const structure = this.createCalendarStructure(month, year);
    const days = this.generateCalendarDays(month, year);
    
    return `
      ${structure.header}
      ${structure.gridStart}
      ${days}
      ${structure.gridEnd}
      ${structure.containers}
    `;
  },

  /**
   * Create calendar structure components
   */
  createCalendarStructure(month, year) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
    
    // Check if we're in mobile view
    const isMobile = window.innerWidth <= 991;
    
    // Generate appropriate day headers
    const dayHeaders = isMobile 
      ? '<div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div>'
      : '<div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>';
    
    return {
      header: `
        <div class="calendar-header">
          <h3 class="calendar-month-title">${monthNames[month]} ${year}</h3>
          <div class="calendar-navigation">
            <button class="btn btn-sm btn-outline-primary" onclick="calendarManager.navigatePrevious()">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="calendarManager.navigateNext()">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>`,
      
      gridStart: `
        <div class="calendar-grid">
          <div class="calendar-days-header">
            ${dayHeaders}
          </div>
          <div class="calendar-days">`,
      
      gridEnd: `
          </div>
        </div>`,
      
      containers: `
        <div id="time-slots-container"></div>
        <div id="booking-form-container" style="display: none;"></div>`
    };
  },

  /**
   * Generate all calendar days HTML
   * 
   * Handles responsive design by:
   * - Desktop (>991px): Shows full 7-day calendar (Mon-Sun)
   * - Mobile (≤991px): Shows 5-day calendar (Mon-Fri only) to match CSS grid
   * 
   * This prevents date misalignment issues where CSS hides weekends but 
   * JavaScript still generates weekend day elements.
   */
  generateCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Check if we're in mobile view
    const isMobile = window.innerWidth <= 991;
    
    let html = '';

    if (isMobile) {
      // Mobile view: Generate only weekdays in correct 5-day grid positions
      
      // Convert starting day to Monday=0 system
      const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
      
      // For mobile 5-day grid, calculate empty cells only for weekday start positions
      let emptyCount = 0;
      if (adjustedStartingDay <= 4) {
        // Month starts on a weekday, so we need empty cells before it
        emptyCount = adjustedStartingDay;
      }
      // If month starts on weekend (adjustedStartingDay 5 or 6), no empty cells needed
      
      // Add empty cells
      for (let i = 0; i < emptyCount; i++) {
        html += '<div class="calendar-day empty"></div>';
      }
      
      // Add only weekdays
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        
        // Only generate weekdays (skip weekends entirely)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          html += this.createDayHTML(year, month, day);
        }
      }
      
    } else {
      // Desktop view: Show all days including weekends
      
      // Add empty cells for days before the first of the month
      const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
      for (let i = 0; i < adjustedStartingDay; i++) {
        html += '<div class="calendar-day empty"></div>';
      }
      
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        html += this.createDayHTML(year, month, day);
      }
    }
    
    return html;
  },

  /**
   * Create HTML for a single day
   */
  createDayHTML(year, month, day) {
    const date = new Date(year, month, day);
    const dayData = this.calculateDayData(date);
    const dayStatus = this.determineDayStatus(dayData);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const clickHandler = dayData.isAvailable ? `onclick="calendarManager.selectDay('${dateString}')"` : '';
    
    return `
      <div class="calendar-day ${dayStatus.classes}"
           data-date="${dateString}"
           ${clickHandler}>
        <div class="day-number">${day}</div>
        ${dayStatus.text ? `<div class="availability">${dayStatus.text}</div>` : ''}
      </div>
    `;
  },

  /**
   * Calculate day data and availability
   */
  calculateDayData(date) {
    const businessToday = this.dependencies.timezoneUtils.getCurrentBusinessTime();
    
    const isToday = this.dependencies.timezoneUtils.isToday(date);
    const isPast = date < businessToday && !isToday;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isTodayUnavailable = this.isTodayUnavailable(date);
    const isAvailable = !isPast && !isWeekend && !isTodayUnavailable;
    
    return {
      isToday,
      isPast,
      isWeekend,
      isTodayUnavailable,
      isAvailable
    };
  },

  /**
   * Determine day status and classes
   */
  determineDayStatus(dayData) {
    let statusText = '';
    let dayClasses = '';

    if (dayData.isPast) {
      dayClasses = 'past';
    } else if (dayData.isWeekend) {
      dayClasses = 'closed';
      statusText = 'Closed';
    } else if (dayData.isTodayUnavailable) {
      dayClasses = 'closed';
      statusText = 'Closed';
    } else if (dayData.isAvailable) {
      dayClasses = 'available';
      statusText = 'Available';
    }

    // Add today class if it's today
    if (dayData.isToday && !dayData.isWeekend && !dayData.isTodayUnavailable && !dayData.isPast) {
      dayClasses += ' today';
    }

    return {
      classes: dayClasses,
      text: statusText
    };
  },

  /**
   * Check if today should be marked as unavailable due to business hours
   */
  isTodayUnavailable(date) {
    const businessNow = this.dependencies.timezoneUtils.getCurrentBusinessTime();
    
    if (!this.dependencies.timezoneUtils.isToday(date)) {
      return false;
    }

    const dayOfWeek = businessNow.getDay();
    const service = this.currentState.service;

    let businessCloseHour;
    if (service === 'mouthguards') {
      if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        businessCloseHour = 18; // 6 PM
      } else if (dayOfWeek === 5) {
        businessCloseHour = 16; // 4 PM
      } else {
        return true; // Weekend
      }
    } else {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessCloseHour = 16; // 4 PM
      } else {
        return true; // Weekend
      }
    }

    return businessNow.getHours() >= businessCloseHour;
  },

  /**
   * Setup calendar interactions
   */
  setupInteractions() {
    // Navigation is handled by direct method calls
    // Day selection is handled by direct method calls
    // Time slot selection will use the existing system
  },

  /**
   * Mark dates with available slots
   */
  markAvailableDates() {
    const calendarDays = this.currentState.container.querySelectorAll('.calendar-day:not(.empty)');
    const availabilityData = this.dependencies.appState.availabilityData;

    calendarDays.forEach(dayElement => {
      const dateString = dayElement.getAttribute('data-date');
      if (!dateString) return;

      // Skip if already marked as past/closed
      if (dayElement.classList.contains('past') || dayElement.classList.contains('closed')) {
        return;
      }

      // Check availability
      let hasSlots = false;
      if (dateString in availabilityData) {
        hasSlots = availabilityData[dateString] && availabilityData[dateString].length > 0;
      } else if (this.dependencies.appState.availabilityLoaded) {
        hasSlots = true; // Generate slots for weekdays
      } else {
        hasSlots = true; // Basic mode - all weekdays available
      }

      // Update availability indicator
      const availabilityDiv = dayElement.querySelector('.availability');
      if (hasSlots) {
        dayElement.classList.add('available');
        if (availabilityDiv) {
          availabilityDiv.textContent = 'Available';
        }
      } else {
        dayElement.classList.add('fully-booked');
        if (availabilityDiv) {
          availabilityDiv.textContent = 'Fully Booked';
          availabilityDiv.style.color = '#f44336';
        }
      }
    });
  },

  /**
   * Update service selection UI
   */
  updateServiceUI() {
    // Update service cards UI
    document.querySelectorAll('.service-card').forEach(card => {
      if (card.dataset.service === this.currentState.service) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Update appointment type text
    const appointmentTypeText = document.getElementById('appointment-type-text');
    if (appointmentTypeText) {
      appointmentTypeText.textContent = 'Booking: ' + this.getServiceName();
    }
  },

  /**
   * Handle service change - centralized service switching logic
   */
  handleServiceChange(previousService, newService) {
    // Clear selections
    this.clearSelection();
    this.clearTimeSlots();
    this.clearBookingForm();

    // Clear availability data for new service
    const wasLoaded = this.dependencies.appState.availabilityLoaded;
    this.dependencies.appState.clearAvailabilityData();

    // Reload data if previously loaded
    if (wasLoaded) {
      this.renderLoadingState();
      this.reloadAvailabilityData()
        .then(() => {
          this.renderCalendar();
        })
        .catch(err => {
          this.dependencies.errorHandler.handle(err, {
            operation: 'dataLoading',
            context: 'Failed to reload calendar data for new service',
            component: 'calendarManager.handleServiceChange',
            service: newService,
            container: this.currentState.container
          });
        });
    } else {
      // Re-render with current data
      this.renderCalendar();
    }
  },

  /**
   * Navigate to previous month
   */
  navigatePrevious() {
    const { month, year } = this.currentState;
    
    let newMonth = month - 1;
    let newYear = year;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    if (this.validateNavigation(newMonth, newYear, 'previous')) {
      this.setDate(newMonth, newYear);
      this.clearSelection();
      this.clearTimeSlots();
      this.clearBookingForm();
    }
  },

  /**
   * Navigate to next month
   */
  navigateNext() {
    const { month, year } = this.currentState;
    
    let newMonth = month + 1;
    let newYear = year;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    if (this.validateNavigation(newMonth, newYear, 'next')) {
      this.setDate(newMonth, newYear);
      this.clearSelection();
      this.clearTimeSlots();
      this.clearBookingForm();
    }
  },

  /**
   * Validate navigation
   */
  validateNavigation(month, year, direction) {
    const businessToday = this.dependencies.timezoneUtils.getCurrentBusinessTime();
    
    if (direction === 'previous') {
      if (year < businessToday.getFullYear() || 
          (year === businessToday.getFullYear() && month < businessToday.getMonth())) {
        alert('Cannot navigate to past months');
        return false;
      }
    } else if (direction === 'next') {
      const maxDate = new Date(businessToday.getFullYear(), businessToday.getMonth() + 3, 1);
      if (year > maxDate.getFullYear() ||
          (year === maxDate.getFullYear() && month > maxDate.getMonth())) {
        alert('Cannot book appointments more than 3 months in advance.\n\nIf you need to schedule an appointment beyond this timeframe, please contact our team directly at (02) 9398 7578.');
        return false;
      }
    }
    
    return true;
  },

  /**
   * Select a day
   */
  selectDay(dateString) {
    // Clear previous selections
    this.currentState.container.querySelectorAll('.calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Mark new selection
    const dayElement = this.currentState.container.querySelector(`[data-date="${dateString}"]`);
    if (dayElement) {
      dayElement.classList.add('selected');
    }

    this.setSelection(dateString);
    this.showTimeSlots(dateString);
  },

  /**
   * Show time slots for selected date
   */
  showTimeSlots(dateString) {
    const timeSlotsContainer = document.getElementById('time-slots-container');
    if (!timeSlotsContainer) return;

    // Show loading
    timeSlotsContainer.innerHTML = `
      <h4 class="text-center">Loading available times...</h4>
      <div class="text-center"><div class="spinner"></div></div>
    `;

    // Get time slots
    const timeSlots = this.getTimeSlotsForDate(dateString);
    
    // Show slots
    timeSlotsContainer.innerHTML = this.createTimeSlotsHTML(dateString, timeSlots);
    timeSlotsContainer.scrollIntoView({ behavior: 'smooth' });

    // Clear booking form
    this.clearBookingForm();
  },

  /**
   * Get time slots for a date
   */
  getTimeSlotsForDate(dateString) {
    if (!this.dependencies.appState.availabilityLoaded) {
      return [];
    }

    return this.dependencies.appState.availabilityData[dateString] || [];
  },

  /**
   * Create time slots HTML
   */
  createTimeSlotsHTML(dateString, timeSlots) {
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = this.formatDate(dateString);

    if (!timeSlots || timeSlots.length === 0) {
      return `
        <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
        <div class="alert alert-info">
          <p class="text-center mb-0">No available appointments for this date. Please select another date.</p>
        </div>
      `;
    }

    const sortedSlots = [...timeSlots].sort((a, b) => {
      const [aHours, aMinutes] = a.split(':').map(Number);
      const [bHours, bMinutes] = b.split(':').map(Number);
      return (aHours - bHours) || (aMinutes - bMinutes);
    });

    let html = `
      <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
      <div class="time-slots-grid">
    `;

    sortedSlots.forEach(slot => {
      html += `
        <div class="time-slot" onclick="calendarManager.selectTimeSlot('${dateString}', '${slot}')">
          ${this.formatTime(slot)}
        </div>
      `;
    });

    html += `</div>`;
    return html;
  },

  /**
   * Select a time slot
   */
  selectTimeSlot(dateString, timeString) {
    // Clear previous selections
    document.querySelectorAll('.time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Mark new selection
    const selectedSlot = [...document.querySelectorAll('.time-slot')]
      .find(slot => slot.textContent.trim() === this.formatTime(timeString));
    if (selectedSlot) {
      selectedSlot.classList.add('selected');
    }

    this.setSelection(dateString, timeString);
    
    // Trigger booking form display using existing system
    if (window.showBookingForm) {
      window.showBookingForm(dateString, timeString);
    }
  },

  /**
   * Clear time slots
   */
  clearTimeSlots() {
    const container = document.getElementById('time-slots-container');
    if (container) {
      container.innerHTML = '';
    }
  },

  /**
   * Clear booking form
   */
  clearBookingForm() {
    const container = document.getElementById('booking-form-container');
    if (container) {
      container.style.display = 'none';
    }
  },

  /**
   * Reload availability data
   */
  async reloadAvailabilityData() {
    if (window.loadAllAvailabilityData) {
      return await window.loadAllAvailabilityData();
    }
    throw new Error('Data loading function not available');
  },

  /**
   * Get service name
   */
  getServiceName() {
    const service = this.currentState.service;
    switch (service) {
      case 'dentures': return 'Dentures Consultation';
      case 'repairs': return 'Repairs & Maintenance';
      case 'mouthguards': return 'Mouthguards Consultation';
      default: return 'Appointment';
    }
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return this.dependencies.timezoneUtils.formatDateInBusinessTZ(date);
  },

  /**
   * Format time for display
   */
  formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const paddedMinutes = minutes.padStart(2, '0');

    if (hour === 0) {
      return `12:${paddedMinutes}am`;
    } else if (hour < 12) {
      return `${hour}:${paddedMinutes}am`;
    } else if (hour === 12) {
      return `12:${paddedMinutes}pm`;
    } else {
      return `${hour - 12}:${paddedMinutes}pm`;
    }
  }
};

/**
 * Get the name of a service
 */
function getServiceName(service) {
  switch (service) {
    case 'dentures':
      return 'Dentures Consultation';
    case 'repairs':
      return 'Repairs & Maintenance';
    case 'mouthguards':
      return 'Mouthguards Consultation';
    default:
      return 'Appointment';
  }
}

/**
 * Show the booking form - globally accessible
 */
window.showBookingForm = showBookingForm;

/**
 * Show the booking form
 */
function showBookingForm(dateString, timeString) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;

  bookingFormContainer.style.display = 'block';

  bookingFormContainer.innerHTML = `
    <h4 class="mb-4">Complete Your Booking</h4>
    <p><strong>Service:</strong> ${getServiceName(window.selectedService)}</p>
    <p><strong>Date:</strong> ${formatDate(dateString)}</p>
    <p><strong>Time:</strong> ${formatTime(timeString)}</p>
    <p><strong>Duration:</strong> ${SERVICE_DURATION[window.selectedService]} minutes</p>

    <form class="booking-form mt-4" onsubmit="event.preventDefault(); submitBookingForm();">
      <div class="form-group">
        <label for="booking-first-name">First Name *</label>
        <input type="text" class="form-control" id="booking-first-name" required>
      </div>

      <div class="form-group">
        <label for="booking-last-name">Last Name *</label>
        <input type="text" class="form-control" id="booking-last-name" required>
      </div>

      <div class="form-group">
        <label for="booking-email">Email *</label>
        <input type="email" class="form-control" id="booking-email" required>
      </div>

      <div class="form-group">
        <label for="booking-phone">Phone Number *</label>
        <input type="tel" class="form-control" id="booking-phone" required>
      </div>

      <div class="form-group" style="grid-column: span 2;">
        <label for="booking-notes">Additional Notes</label>
        <textarea class="form-control" id="booking-notes" rows="3"></textarea>
      </div>

      <div class="form-group" style="grid-column: span 2;">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="booking-consent" required>
          <label class="form-check-label" for="booking-consent">
            I confirm that I want to receive content from DK Dental Studio using any contact information I provide.
          </label>
        </div>
      </div>

      <div style="grid-column: span 2; text-align: center; margin-top: 20px;">
        <button type="button" class="btn btn-outline-secondary mr-2" onclick="resetBookingForm()">Cancel</button>
        <button type="submit" class="btn btn-primary">Confirm Booking</button>
      </div>
    </form>
  `;

  // Scroll to the form
  bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Submit booking form function
 */
window.submitBookingForm = function() {
  // Get form values
  const firstName = document.getElementById('booking-first-name').value;
  const lastName = document.getElementById('booking-last-name').value;
  const email = document.getElementById('booking-email').value;
  const phone = document.getElementById('booking-phone').value;
  const notes = document.getElementById('booking-notes').value;

  // Validate form
  if (!firstName || !lastName || !email || !phone) {
    alert('Please fill in all required fields.');
    return;
  }

  // Get the booking form container
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;

  // Show processing message
  bookingFormContainer.innerHTML = `
    <div class="text-center">
      <div class="spinner" style="margin: 20px auto;"></div>
      <h4 class="mt-3">Processing Your Booking</h4>
      <p>Please wait while we confirm your appointment...</p>
    </div>
  `;

  // Immediately update local availability data to mark this slot as unavailable
  // This ensures the time slot appears booked even before server confirmation
  if (appState.selectedDateTime && appState.selectedDateTime.date && appState.selectedDateTime.time) {
    const dateKey = appState.selectedDateTime.date;
    const timeSlot = appState.selectedDateTime.time;

    // Update availability data in memory to remove this time slot
    appState.markSlotAsBooked(dateKey, timeSlot);
  }

  // Create booking data
  const bookingData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    notes: notes,
    service: window.selectedService,
    date: appState.selectedDateTime.date,
    time: appState.selectedDateTime.time,
    isFullyLoaded: appState.availabilityLoaded // Add the calendar status
  };

  // Create Google Calendar event if calendar is fully loaded
  if (appState.availabilityLoaded) {
    // Format date and time for Google Calendar using proper timezone handling
    const startDateTime = timezoneUtils.createBusinessDateTime(appState.selectedDateTime.date, appState.selectedDateTime.time);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + SERVICE_DURATION[window.selectedService]);

    // Convert to ISO format with proper timezone
    // Note: Google Calendar expects times in the correct timezone
    const timeZoneOffset = '+11:00'; // Sydney timezone (adjust for DST if needed)
    const startDateTimeIso = startDateTime.toISOString().replace('Z', timeZoneOffset);
    const endDateTimeIso = endDateTime.toISOString().replace('Z', timeZoneOffset);

    // Create event object
    const eventData = {
      'summary': `${getServiceName(window.selectedService)} - ${firstName} ${lastName}`,
      'description': `
        Appointment Details:
        Service: ${getServiceName(window.selectedService)}
        Name: ${firstName} ${lastName}
        Email: ${email}
        Phone: ${phone}
        Notes: ${notes}
      `,
      'start': {
        'dateTime': startDateTimeIso,
        'timeZone': BUSINESS_TIMEZONE
      },
      'end': {
        'dateTime': endDateTimeIso,
        'timeZone': BUSINESS_TIMEZONE
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 60} // 1 hour before
        ]
      }
    };

    // Send the event data to the server to create the calendar event
    fetch('/script/calendar/create-event.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventData,
        service: window.selectedService
      })
    })
    .then(response => response.json())
    .then(eventResult => {
      if (!eventResult.success) {
        // Log the calendar event creation failure but don't block booking
        const error = new Error('Calendar event creation failed');
        error.serverResponse = eventResult;
        error.context = 'Google Calendar event creation unsuccessful';
        errorHandler.logError(error, 'calendar_event', {
          operation: 'calendarEvent',
          component: 'submitBookingForm',
          bookingData: bookingData
        });
      }

      // Proceed with email confirmation regardless of calendar event success
      sendBookingConfirmation(bookingData);
    })
    .catch(error => {
      // Log the calendar event creation error but don't block booking
      error.context = 'Network error during calendar event creation';
      errorHandler.logError(error, 'network', {
        operation: 'calendarEvent',
        component: 'submitBookingForm',
        bookingData: bookingData
      });

      // Proceed with email confirmation even if calendar event fails
      sendBookingConfirmation(bookingData);
    });
  } else {
    // If in basic mode, just send the email confirmation
    sendBookingConfirmation(bookingData);
  }
};

/**
 * Send booking confirmation email with enhanced error handling
 */
function sendBookingConfirmation(bookingData) {
  // Send the booking data to the server for email confirmation
  fetch('/script/calendar/booking-fallback.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  })
  .then(response => {
    if (!response.ok) {
      const error = new Error(`Booking submission failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      showBookingSuccess(bookingData.firstName, bookingData.lastName, bookingData.email);
    } else {
      const error = new Error('Booking submission unsuccessful');
      error.serverResponse = data;
      error.context = 'Server returned unsuccessful booking response';
      
      errorHandler.handle(error, {
        operation: 'booking',
        context: 'Booking submission failed on server',
        component: 'sendBookingConfirmation',
        bookingData: bookingData,
        container: document.getElementById('booking-form-container')
      });
    }
  })
  .catch(error => {
    // Use enhanced error handling for booking failures
    errorHandler.handle(error, {
      operation: 'booking',
      context: 'Failed to submit booking confirmation',
      component: 'sendBookingConfirmation',
      bookingData: bookingData,
      container: document.getElementById('booking-form-container')
    });
  });
}

/**
 * Show booking success message
 */
function showBookingSuccess(firstName, lastName, email) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;

  // Set the flag to prevent automatic reloads
  appState.bookingConfirmationDisplayed = true;

  // Update availability data to mark the booked slot as unavailable
  if (appState.selectedDateTime && appState.selectedDateTime.date && appState.selectedDateTime.time) {
    // Get the date from the selected booking
    const dateKey = appState.selectedDateTime.date;
    const timeSlot = appState.selectedDateTime.time;

    // Update both current and next month data to ensure it's properly marked as booked
    appState.markSlotAsBooked(dateKey, timeSlot);
  }

  bookingFormContainer.innerHTML = `
    <div class="booking-success">
      <div class="text-center mb-4">
        <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">Booking Request Submitted!</h4>
      <p class="text-center">We've received your appointment request for ${getServiceName(window.selectedService)} on ${formatDate(appState.selectedDateTime.date)} at ${formatTime(appState.selectedDateTime.time)}.</p>
      <p class="text-center">Our staff will contact you shortly to confirm your appointment.</p>
      <div class="alert alert-info mt-3">
        <p class="mb-0"><strong>What happens next:</strong></p>
        <ul class="mb-0 text-left">
          <li>Our team will review your booking</li>
          <li>You'll receive a confirmation email</li>
          <li>You'll receive a reminder email 24 hours before your appointment</li>
          <li>If you need to change your appointment, please call us at (02) 9398 7578</li>
        </ul>
      </div>
      <div class="text-center mt-4">
        <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
      </div>
    </div>
  `;
}
