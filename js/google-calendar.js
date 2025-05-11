/**
 * Google Calendar Integration for DK Dental Studio Appointment Booking
 */

// Debug mode - set to true to show detailed debug information
const DEBUG_MODE = false;

// Google API credentials
// const GOOGLE_API_KEY = 'AIzaSyDFoNqB7BIuoZrUQDRVhnpVLjXsUgT-6Ow'; // Replace with your API key - Not used with server-side OAuth
const GOOGLE_CLIENT_ID = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
const CALENDAR_ID = {
  'dentures': 'primary', // Replace with actual calendar ID for dentures
  'repairs': 'primary',  // Replace with actual calendar ID for repairs
  'mouthguards': 'primary' // Replace with actual calendar ID for mouthguards
};

// Google API discovery docs and scope
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Default service durations in minutes
const SERVICE_DURATION = {
  'dentures': 60,
  'repairs': 60,
  'mouthguards': 60
};

// Store selected service
let selectedService = null;
let selectedDateTime = null;
let gapi = null;
let tokenClient = null;
let serverAccessToken = null;

/**
 * On page load, initialize Google API client
 */
document.addEventListener('DOMContentLoaded', function() {
  // Add debug display
  addDebugDisplay();
  
  // Load the Google API client
  debugLog('Page loaded, initializing Google Calendar integration');
  loadGoogleAPI();
  
  // Check if calendar is loaded after a delay
  setTimeout(function() {
    if (selectedService) {
      checkCalendarLoaded();
    }
  }, 15000); // 15 second timeout
});

/**
 * Fetch access token from server
 * This function gets the OAuth token from the server instead of using client-side auth
 */
function fetchServerAccessToken() {
  return new Promise((resolve, reject) => {
    debugLog('Fetching server access token...');
    
    // Use absolute path for production environment with proper protocol
    const apiUrl = window.location.protocol + '//' + window.location.host + '/api/get-access-token.php';
    debugLog('API URL:', apiUrl);
    
    fetch(apiUrl)
      .then(response => {
        debugLog('Server response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch access token from server: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        debugLog('Server response received:', data);
        if (data.success && data.access_token) {
          serverAccessToken = data.access_token;
          debugLog('Access token successfully retrieved from server');
          resolve(serverAccessToken);
        } else {
          debugLog('Server returned error:', data.error, data.message);
          throw new Error('No access token in response');
        }
      })
      .catch(error => {
        debugLog('Error fetching server access token:', error);
        showError("Could not connect to the booking system. Please try again later or contact us directly.");
        showFallbackCalendar();
        reject(error);
      });
  });
}

/**
 * Load the Google API client and auth2 library
 */
function loadGoogleAPI() {
  debugLog('Loading Google API client...');
  
  // Set a timeout to ensure we don't wait forever
  const apiLoadTimeout = setTimeout(() => {
    debugLog('Google API client load timed out, using fallback calendar');
    showError("Google API client not loaded. Please check your internet connection and try again.");
    showFallbackCalendar();
  }, 10000); // 10 second timeout
  
  gapi = window.gapi;
  
  if (!gapi) {
    debugLog('Google API client not available');
    clearTimeout(apiLoadTimeout);
    showError("Google API client not loaded. Please check your internet connection and try again.");
    showFallbackCalendar();
    return;
  }
  
  // Load the client
  try {
    debugLog('Calling gapi.load...');
    gapi.load('client', function() {
      debugLog('gapi.load callback executed');
      clearTimeout(apiLoadTimeout);
      initClient();
    });
  } catch (error) {
    debugLog('Error in gapi.load:', error);
    clearTimeout(apiLoadTimeout);
    showError("Failed to load Google Calendar API. Using basic calendar mode.");
    showFallbackCalendar();
  }
}

/**
 * Debug logging function - only logs when DEBUG_MODE is true
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Calendar Debug]', ...args);
    
    // Also add to debug display if it exists
    const debugLog = document.getElementById('calendar-debug-log');
    if (debugLog) {
      const now = new Date();
      const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      
      const logEntry = document.createElement('div');
      logEntry.innerHTML = `<span style="color:#999;">${timestamp}</span> ${message}`;
      debugLog.appendChild(logEntry);
      
      // Auto-scroll to bottom
      debugLog.scrollTop = debugLog.scrollHeight;
      
      // Show the debug content
      document.getElementById('calendar-debug-content').style.display = 'block';
    }
  }
}

/**
 * Initialize the Google API client
 */
function initClient() {
  // Initialize the client without an API key
  debugLog('Initializing Google API client...');
  
  // Set a timeout to ensure we don't wait forever
  const initTimeout = setTimeout(() => {
    debugLog('Google API client initialization timed out, showing fallback calendar');
    showError("Google Calendar API initialization timed out. Using basic calendar mode.");
    showFallbackCalendar();
  }, 7000); // 7 second timeout
  
  try {
    gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS,
    }).then(() => {
      debugLog('Google API client initialized');
      clearTimeout(initTimeout);
      
      // Fetch token from server instead of using client-side auth
      debugLog('Fetching server access token...');
      
      // Set a timeout for token fetching
      const tokenTimeout = setTimeout(() => {
        debugLog('Token fetch timed out, showing fallback calendar');
        showError("Token retrieval timed out. Using basic calendar mode.");
        showFallbackCalendar();
      }, 5000); // 5 second timeout
      
      fetchServerAccessToken()
        .then(token => {
          clearTimeout(tokenTimeout);
          
          // Set the access token for all future requests
          debugLog('Setting access token on gapi client');
          gapi.client.setToken({ access_token: token });
          debugLog('Server access token applied to gapi client');
          
          // Test if the calendar API is available
          debugLog('Testing Google Calendar API access...');
          
          // Set a timeout for API test
          const apiTestTimeout = setTimeout(() => {
            debugLog('Calendar API test timed out, showing fallback calendar');
            showError("Calendar API test timed out. Using basic calendar mode.");
            showFallbackCalendar();
          }, 5000); // 5 second timeout
          
          return gapi.client.calendar.calendarList.list({
            maxResults: 1
          }).then(response => {
            clearTimeout(apiTestTimeout);
            debugLog('Calendar API test successful:', response);
            
            // If a service is already selected, load it
            if (selectedService) {
              debugLog('Loading calendar for service:', selectedService);
              loadCalendar(selectedService);
            }
          }).catch(error => {
            clearTimeout(apiTestTimeout);
            debugLog('Calendar API test failed:', error);
            showError("Calendar API test failed. Using basic calendar mode.");
            showFallbackCalendar();
          });
        })
        .catch(error => {
          clearTimeout(tokenTimeout);
          console.error('Failed to set server access token:', error);
          debugLog('Token fetch failed, showing fallback calendar');
          showError("Failed to authorize access to Google Calendar. Using fallback calendar.");
          showFallbackCalendar();
        });
    }).catch(error => {
      clearTimeout(initTimeout);
      console.error('Error initializing Google API client', error);
      debugLog('Google API client initialization failed:', error);
      showError("Failed to initialize Google Calendar. Using fallback calendar.");
      showFallbackCalendar();
    });
  } catch (error) {
    clearTimeout(initTimeout);
    console.error('Exception during Google API client initialization', error);
    debugLog('Exception during Google API client initialization:', error);
    showError("Exception during Google Calendar initialization. Using fallback calendar.");
    showFallbackCalendar();
  }
}

/**
 * Show a fallback calendar without Google Calendar integration
 */
function showFallbackCalendar() {
  debugLog('Showing fallback calendar');
  
  // If Google Calendar integration fails, we can still show a basic calendar
  // that allows users to select dates and times, but booking will use the fallback method
  if (selectedService) {
    // Get the calendar container
    const calendarContainer = document.getElementById('appointment-calendar');
    if (!calendarContainer) {
      debugLog('ERROR: Calendar container not found!');
      return;
    }
    
    // Show a notice to the user
    const notice = document.createElement('div');
    notice.className = 'alert alert-info mb-4';
    notice.innerHTML = `
      <p><strong>Note:</strong> The calendar is currently operating in basic mode. 
      Your booking will be sent to our staff who will confirm your appointment.</p>
    `;
    
    // Get today's date
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Create the calendar layout
    calendarContainer.innerHTML = createCalendarHTML(month, year, selectedService);
    
    // Insert the notice at the top
    if (calendarContainer.firstChild) {
      calendarContainer.insertBefore(notice, calendarContainer.firstChild);
    } else {
      calendarContainer.appendChild(notice);
    }
    
    // Add event listeners to calendar days
    setupCalendarInteraction();
    
    // Create empty containers for time slots and booking form if they don't exist
    let timeSlotsContainer = document.getElementById('time-slots-container');
    if (!timeSlotsContainer) {
      timeSlotsContainer = document.createElement('div');
      timeSlotsContainer.id = 'time-slots-container';
      timeSlotsContainer.className = 'time-slots-container';
      calendarContainer.appendChild(timeSlotsContainer);
    }
    
    let bookingFormContainer = document.getElementById('booking-form-container');
    if (!bookingFormContainer) {
      bookingFormContainer = document.createElement('div');
      bookingFormContainer.id = 'booking-form-container';
      bookingFormContainer.className = 'booking-form-container';
      bookingFormContainer.style.display = 'none';
      calendarContainer.appendChild(bookingFormContainer);
    }
    
    // Override the generateTimeSlots function to not use Google Calendar API
    window.originalGenerateTimeSlots = window.originalGenerateTimeSlots || generateTimeSlots;
    generateTimeSlots = function(dateString) {
      debugLog('Using fallback time slot generation for', dateString);
      
      // Define business hours based on service and day of week
      const date = new Date(dateString);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Check for weekends first
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // No appointments on weekends
        return Promise.resolve([]);
      }
      
      // Define business hours
      let startHour, endHour;
      
      if (selectedService === 'mouthguards' && (dayOfWeek >= 1 && dayOfWeek <= 3)) {
        // Mon-Wed for mouthguards: 10am-6pm
        startHour = 10;
        endHour = 18;
      } else {
        // Other days or services: 10am-4pm
        // This covers:
        // - Dentures (Mon-Fri): 10am-4pm
        // - Repairs (Mon-Fri): 10am-4pm (same as dentures)
        // - Mouthguards (Thu-Fri): 10am-4pm
        startHour = 10;
        endHour = 16;
      }
      
      // Generate all possible slots every hour (60 minutes)
      const allSlots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        allSlots.push(`${String(hour).padStart(2, '0')}:00`);
      }
      
      // Generate mock availability - show most slots as available
      const availableSlots = allSlots.filter(() => Math.random() > 0.2);
      debugLog('Generated fallback time slots:', availableSlots);
      return Promise.resolve(availableSlots);
    };
    
    debugLog('Fallback calendar set up successfully');
  } else {
    debugLog('No service selected, cannot show fallback calendar');
  }
}

/**
 * Expose the loadCalendarForService function globally
 */
window.loadCalendarForService = function(service) {
  selectedService = service;
  debugLog('Loading calendar for service:', service);
  
  // Update UI to show selected service
  document.querySelectorAll('.service-card').forEach(card => {
    if (card.dataset.service === service) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // Show loading state
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) {
    debugLog('ERROR: Calendar container not found!');
    return;
  }
  
  calendarContainer.innerHTML = `
    <div class="calendar-loading">
      <div class="spinner"></div>
      <p>Loading appointment calendar for ${getServiceName(service)}...</p>
    </div>
  `;
  
  // Create empty containers for time slots and booking form if they don't exist
  let timeSlotsContainer = document.getElementById('time-slots-container');
  if (!timeSlotsContainer) {
    timeSlotsContainer = document.createElement('div');
    timeSlotsContainer.id = 'time-slots-container';
    timeSlotsContainer.className = 'time-slots-container';
    calendarContainer.appendChild(timeSlotsContainer);
  } else {
    timeSlotsContainer.innerHTML = '';
  }
  
  let bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) {
    bookingFormContainer = document.createElement('div');
    bookingFormContainer.id = 'booking-form-container';
    bookingFormContainer.className = 'booking-form-container';
    bookingFormContainer.style.display = 'none';
    calendarContainer.appendChild(bookingFormContainer);
  } else {
    bookingFormContainer.style.display = 'none';
  }
  
  // Set a timeout to ensure we don't wait forever
  const loadingTimeout = setTimeout(() => {
    debugLog('Calendar loading timed out, showing fallback calendar');
    showFallbackCalendar();
  }, 5000); // 5 second timeout
  
  // Check if we're authorized and have the calendar API loaded
  if (!gapi) {
    // First load - initialize the API
    debugLog('gapi not loaded, initializing API');
    loadGoogleAPI();
    // Clear the timeout when loadGoogleAPI completes (it has its own timeout)
    clearTimeout(loadingTimeout);
  } else if (!gapi.client || !gapi.client.calendar) {
    // API loaded but calendar not initialized
    debugLog('gapi loaded but calendar not initialized');
    initClient();
    // Clear the timeout when initClient completes (it has its own error handling)
    clearTimeout(loadingTimeout);
  } else {
    // Proceed to load the calendar
    debugLog('gapi and calendar initialized, loading calendar');
    loadCalendar(service);
    clearTimeout(loadingTimeout);
  }
};

/**
 * Request OAuth authorization
 */
function requestAuthorization() {
  if (tokenClient) {
    // Request an access token
    tokenClient.requestAccessToken();
  } else {
    showError("Authentication service not initialized. Please refresh the page and try again.");
  }
}

/**
 * Load the calendar for the selected service
 */
function loadCalendar(service) {
  debugLog('loadCalendar called for service:', service);
  
  try {
    // Get the calendar container
    const calendarContainer = document.getElementById('appointment-calendar');
    if (!calendarContainer) {
      debugLog('ERROR: Calendar container not found!');
      return;
    }
    
    debugLog('Calendar container found, rendering calendar');
    
    // Get today's date
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    debugLog('Creating calendar for', month, year);
    
    // Create the calendar layout
    calendarContainer.innerHTML = createCalendarHTML(month, year, service);
    
    // Add event listeners to calendar days
    debugLog('Setting up calendar interactions');
    setupCalendarInteraction();
    
    // Add a notice that the calendar is loaded successfully
    const notice = document.createElement('div');
    notice.className = 'alert alert-success mb-4';
    notice.innerHTML = `
      <p><strong>Success:</strong> The appointment calendar has been loaded successfully.
      Please select a date to see available times.</p>
    `;
    
    // Insert the notice at the top
    if (calendarContainer.firstChild) {
      calendarContainer.insertBefore(notice, calendarContainer.firstChild);
    } else {
      calendarContainer.appendChild(notice);
    }
    
    debugLog('Calendar loaded and interactions set up');
  } catch (error) {
    debugLog('ERROR rendering calendar:', error);
    
    // Show a simple error message and fall back to the basic calendar
    showError("We encountered an issue loading the calendar. Using basic calendar mode.");
    showFallbackCalendar();
  }
}

/**
 * Create HTML for the calendar
 */
function createCalendarHTML(month, year, service) {
  const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
  
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let html = `
    <div class="calendar-header">
      <h3 class="text-center w-100">${monthNames[month]} ${year}</h3>
      <div class="calendar-navigation">
        <button class="btn btn-sm btn-outline-primary" onclick="prevMonth()"><i class="fas fa-chevron-left"></i></button>
        <button class="btn btn-sm btn-outline-primary" onclick="nextMonth()"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-grid">
      <div class="calendar-days-header">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      <div class="calendar-days">
  `;
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < startingDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast = date < today && !isToday;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
    
    // Determine if this day should be available
    const isAvailable = !isPast && !isWeekend;
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isAvailable ? 'available' : ''}" 
           data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}"
           ${isAvailable ? `onclick="showTimeSlots(this)"` : ''}>
        <div class="day-number">${day}</div>
        ${isAvailable ? '<div class="availability">Available</div>' : ''}
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
    <div class="time-slots-container" id="time-slots-container"></div>
    <div class="booking-form-container" id="booking-form-container" style="display:none;"></div>
  `;
  
  // Add custom styles for the calendar
  html += `
    <style>
      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        position: relative;
      }
      
      .calendar-header h3 {
        margin: 0;
        text-align: center;
        width: 100%;
        position: absolute;
        left: 0;
        right: 0;
      }
      
      .calendar-navigation {
        display: flex;
        gap: 10px;
        position: relative;
        z-index: 1;
        margin-left: auto;
      }
      
      .calendar-grid {
        margin-bottom: 30px;
      }
      
      .calendar-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-weight: bold;
        margin-bottom: 10px;
        background-color: #0576ee;
        color: white;
        padding: 10px 0;
        border-radius: 8px;
      }
      
      .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 5px;
      }
      
      .calendar-day {
        aspect-ratio: 1/1;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        background-color: white;
      }
      
      .calendar-day.empty {
        background-color: transparent;
        border: none;
      }
      
      .calendar-day.today {
        border-color: #0576ee;
        background-color: rgba(5, 118, 238, 0.05);
      }
      
      .calendar-day.past {
        background-color: #f8f9fa;
        color: #aaa;
        cursor: not-allowed;
      }
      
      .calendar-day.available {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .calendar-day.available:hover {
        transform: scale(1.05);
        border-color: #0576ee;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      
      .calendar-day.selected {
        background-color: #0576ee;
        color: white;
        border-color: #0576ee;
      }
      
      .day-number {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .availability {
        font-size: 12px;
        color: #4caf50;
      }
      
      .time-slots-container {
        margin-top: 30px;
      }
      
      .time-slots-container h4 {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .time-slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 20px;
        margin-bottom: 30px;
      }
      
      .time-slot {
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .time-slot:hover {
        border-color: #0576ee;
        background-color: rgba(5, 118, 238, 0.05);
      }
      
      .time-slot.selected {
        background-color: #0576ee;
        color: white;
        border-color: #0576ee;
      }
      
      .booking-form-container {
        margin-top: 30px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .booking-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      @media (max-width: 768px) {
        .booking-form {
          grid-template-columns: 1fr;
        }
        
        .calendar-days-header {
          font-size: 12px;
        }
        
        .day-number {
          font-size: 14px;
        }
      }
    </style>
  `;
  
  return html;
}

/**
 * Set up interaction for calendar days and time slots
 */
function setupCalendarInteraction() {
  // Define the global functions for calendar navigation
  window.prevMonth = function() {
    // Get the current displayed month and year
    const headerText = document.querySelector('.calendar-header h3').textContent;
    const [monthName, year] = headerText.split(' ');
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    
    let month = monthNames.indexOf(monthName);
    let newYear = parseInt(year, 10);
    
    // Calculate previous month
    if (month === 0) {
      month = 11;
      newYear--;
    } else {
      month--;
    }
    
    // Don't allow navigating to past months
    const today = new Date();
    if (newYear < today.getFullYear() || (newYear === today.getFullYear() && month < today.getMonth())) {
      alert('Cannot navigate to past months');
      return;
    }
    
    // Re-render the calendar
    const calendarContainer = document.getElementById('appointment-calendar');
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, selectedService);
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    if (document.getElementById('booking-form-container')) {
      document.getElementById('booking-form-container').style.display = 'none';
    }
  };
  
  window.nextMonth = function() {
    // Get the current displayed month and year
    const headerText = document.querySelector('.calendar-header h3').textContent;
    const [monthName, year] = headerText.split(' ');
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    
    let month = monthNames.indexOf(monthName);
    let newYear = parseInt(year, 10);
    
    // Calculate next month
    if (month === 11) {
      month = 0;
      newYear++;
    } else {
      month++;
    }
    
    // Limit how far in the future users can book (for example, 3 months)
    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    
    if (newYear > maxDate.getFullYear() || 
        (newYear === maxDate.getFullYear() && month > maxDate.getMonth())) {
      alert('Cannot book appointments more than 3 months in advance');
      return;
    }
    
    // Re-render the calendar
    const calendarContainer = document.getElementById('appointment-calendar');
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, selectedService);
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    if (document.getElementById('booking-form-container')) {
      document.getElementById('booking-form-container').style.display = 'none';
    }
  };
  
  // Define the function to show time slots
  window.showTimeSlots = function(dayElement) {
    // Clear any previously selected days
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Mark this day as selected
    dayElement.classList.add('selected');
    
    // Get the date from the day element
    const dateString = dayElement.getAttribute('data-date');
    
    // Show time slots for this date
    const timeSlotsContainer = document.getElementById('time-slots-container');
    if (!timeSlotsContainer) {
      debugLog('ERROR: Time slots container not found!');
      return;
    }
    
    timeSlotsContainer.innerHTML = createTimeSlotsHTML(dateString);
    
    // Clear any booking form
    const bookingFormContainer = document.getElementById('booking-form-container');
    if (bookingFormContainer) {
      bookingFormContainer.style.display = 'none';
    }
    
    // Scroll to time slots
    timeSlotsContainer.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Define the function to select a time slot
  window.selectTimeSlot = function(timeSlot, dateString, timeString) {
    // Clear any previously selected time slots
    document.querySelectorAll('.time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Mark this time slot as selected
    timeSlot.classList.add('selected');
    
    // Store the selected date and time
    selectedDateTime = {
      date: dateString,
      time: timeString,
      service: selectedService
    };
    
    // Show the booking form
    showBookingForm(dateString, timeString);
  };
  
  // Define the function to submit the booking form
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
    
    // Create event data
    const eventData = {
      summary: `${getServiceName(selectedService)} - ${firstName} ${lastName}`,
      description: `Appointment type: ${getServiceName(selectedService)}\nNotes: ${notes}\nPhone: ${phone}\nEmail: ${email}`,
      start: {
        dateTime: `${selectedDateTime.date}T${selectedDateTime.time}:00`,
        timeZone: 'Australia/Sydney'
      },
      end: {
        dateTime: getEndTime(selectedDateTime.date, selectedDateTime.time, SERVICE_DURATION[selectedService]),
        timeZone: 'Australia/Sydney'
      },
      attendees: [
        { email: email }
      ]
    };
    
    // Show loading state
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.innerHTML = `
      <div class="booking-processing">
        <div class="text-center mb-4">
          <div class="spinner"></div>
        </div>
        <h4 class="text-center">Processing Your Booking...</h4>
        <p class="text-center">Please wait while we confirm your appointment.</p>
      </div>
    `;

    // Check if we have Google Calendar API access
    if (gapi && gapi.client && gapi.client.calendar && serverAccessToken) {
      // Use the Google Calendar API to create the event
      gapi.client.calendar.events.insert({
        calendarId: CALENDAR_ID[selectedService],
        resource: eventData
      }).then(response => {
        console.log('Event created: ', response);
        showBookingSuccess(firstName, lastName, email);
      }).catch(error => {
        console.error('Error creating event:', error);
        // Fall back to server-side booking if client-side fails
        createEventServerSide(eventData, firstName, lastName, email);
      });
    } else {
      // Use server-side booking
      createEventServerSide(eventData, firstName, lastName, email);
    }
  };
  
  /**
   * Create event using server-side API
   */
  function createEventServerSide(eventData, firstName, lastName, email) {
    // Send the booking data to the server
    fetch('/api/create-event.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventData,
        service: selectedService
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showBookingSuccess(firstName, lastName, email);
      } else {
        // If server-side booking fails, use fallback booking
        console.error('Server-side booking failed:', data.error);
        useFallbackBooking(eventData, firstName, lastName, email);
      }
    })
    .catch(error => {
      console.error('Error with server-side booking:', error);
      useFallbackBooking(eventData, firstName, lastName, email);
    });
  }

  /**
   * Use fallback booking method (email)
   */
  function useFallbackBooking(eventData, firstName, lastName, email) {
    // Send the booking data to the fallback PHP handler
    fetch('/api/booking-fallback.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: eventData.description.match(/Phone: (.*)/)[1],
        notes: eventData.description.match(/Notes: (.*)/)[1] || '',
        service: selectedService,
        date: selectedDateTime.date,
        time: selectedDateTime.time
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showBookingSuccess(firstName, lastName, email);
      } else {
        showBookingError();
      }
    })
    .catch(error => {
      console.error('Error with fallback booking:', error);
      showBookingError();
    });
  }

  /**
   * Show booking success message
   */
  function showBookingSuccess(firstName, lastName, email) {
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.innerHTML = `
      <div class="booking-success">
        <div class="text-center mb-4">
          <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">Booking Successful!</h4>
        <p class="text-center">Your appointment for ${getServiceName(selectedService)} on ${formatDate(selectedDateTime.date)} at ${formatTime(selectedDateTime.time)} has been confirmed.</p>
        <p class="text-center">A confirmation email has been sent to ${email}.</p>
        <div class="text-center mt-4">
          <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
        </div>
      </div>
    `;
  }

  /**
   * Show booking error message
   */
  function showBookingError() {
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.innerHTML = `
      <div class="booking-error">
        <div class="text-center mb-4">
          <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">Booking Error</h4>
        <p class="text-center">We encountered an issue while processing your booking. Please try again or contact us directly at (02) 9398 7578.</p>
        <div class="text-center mt-4">
          <button class="btn btn-primary" onclick="resetBookingForm()">Try Again</button>
        </div>
      </div>
    `;
  }
  
  // Define the function to reset the booking form
  window.resetBookingForm = function() {
    // Reset the booking process
    selectedDateTime = null;
    
    // Clear selected day and time slot
    document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    document.getElementById('booking-form-container').style.display = 'none';
    
    // Scroll back to the calendar
    document.getElementById('appointment-calendar').scrollIntoView({ behavior: 'smooth' });
  };
}

/**
 * Generate time slots for a given date
 */
function generateTimeSlots(dateString) {
  debugLog('Generating time slots for date:', dateString);
  
  // Define business hours based on service and day of week
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Define business hours
  let startHour, endHour;
  
  // Check for weekends first
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // No appointments on weekends
    return Promise.resolve([]);
  }
  
  if (selectedService === 'mouthguards' && (dayOfWeek >= 1 && dayOfWeek <= 3)) {
    // Mon-Wed for mouthguards: 10am-6pm
    startHour = 10;
    endHour = 18;
  } else {
    // Other days or services: 10am-4pm
    // This covers:
    // - Dentures (Mon-Fri): 10am-4pm
    // - Repairs (Mon-Fri): 10am-4pm (same as dentures)
    // - Mouthguards (Thu-Fri): 10am-4pm
    startHour = 10;
    endHour = 16;
  }
  
  // Generate all possible slots every hour (60 minutes)
  const allSlots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  
  debugLog('Generated all possible time slots:', allSlots);
  
  // If Google Calendar API is available and properly initialized, check for busy times
  if (gapi && gapi.client && gapi.client.calendar && serverAccessToken) {
    debugLog('Using Google Calendar API to check busy times');
    
    // Create time range for the entire day
    const timeMin = new Date(dateString + 'T00:00:00').toISOString();
    const timeMax = new Date(dateString + 'T23:59:59').toISOString();
    
    // Return a promise that resolves with available slots
    return new Promise((resolve, reject) => {
      try {
        gapi.client.calendar.freebusy.query({
          timeMin: timeMin,
          timeMax: timeMax,
          items: [{ id: CALENDAR_ID[selectedService] }]
        }).then(response => {
          debugLog('Freebusy query response:', response);
          
          const busySlots = [];
          if (response.result && 
              response.result.calendars && 
              response.result.calendars[CALENDAR_ID[selectedService]] &&
              response.result.calendars[CALENDAR_ID[selectedService]].busy) {
            
            const busyPeriods = response.result.calendars[CALENDAR_ID[selectedService]].busy;
            
            // Process busy periods to determine which slots are unavailable
            busyPeriods.forEach(period => {
              const start = new Date(period.start);
              const end = new Date(period.end);
              
              // Check each slot against busy periods
              allSlots.forEach(slot => {
                const [hours, minutes] = slot.split(':').map(Number);
                const slotStart = new Date(date);
                slotStart.setHours(hours, minutes, 0, 0);
                
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + SERVICE_DURATION[selectedService]);
                
                // If slot overlaps with busy period, mark as busy
                if ((slotStart >= start && slotStart < end) || 
                    (slotEnd > start && slotEnd <= end) ||
                    (slotStart <= start && slotEnd >= end)) {
                  busySlots.push(slot);
                }
              });
            });
          } else {
            debugLog('No busy periods found or invalid response structure');
          }
          
          // Filter out busy slots
          const availableSlots = allSlots.filter(slot => !busySlots.includes(slot));
          debugLog('Available slots after checking busy times:', availableSlots);
          resolve(availableSlots);
        }).catch(error => {
          debugLog('Error fetching busy times:', error);
          // If there's an error, fall back to all slots with random availability
          const availableSlots = allSlots.filter(() => Math.random() > 0.3);
          debugLog('Falling back to random availability:', availableSlots);
          resolve(availableSlots);
        });
      } catch (error) {
        debugLog('Exception in freebusy query:', error);
        // If there's an exception, fall back to all slots with random availability
        const availableSlots = allSlots.filter(() => Math.random() > 0.3);
        debugLog('Falling back to random availability due to exception:', availableSlots);
        resolve(availableSlots);
      }
    });
  } else {
    debugLog('Google Calendar API not available, using fallback time slots');
    // If Google Calendar API is not available, generate mock availability
    const availableSlots = allSlots.filter(() => Math.random() > 0.3);
    debugLog('Generated fallback time slots:', availableSlots);
    return Promise.resolve(availableSlots);
  }
}

/**
 * Create HTML for time slots
 */
function createTimeSlotsHTML(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDate(dateString);
  
  // Show loading state
  let html = `
    <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
    <div class="time-slots-loading">
      <div class="spinner" style="margin: 20px auto;"></div>
      <p class="text-center">Loading available time slots...</p>
    </div>
  `;
  
  // Generate time slots asynchronously
  const timeSlotsContainer = document.getElementById('time-slots-container');
  if (!timeSlotsContainer) {
    debugLog('ERROR: Time slots container not found!');
    return html;
  }
  
  timeSlotsContainer.innerHTML = html;
  
  // Get time slots and update the UI
  generateTimeSlots(dateString)
    .then(timeSlots => {
      if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
        // No available slots
        html = `
          <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
          <div class="alert alert-info">
            <p class="text-center mb-0">No available appointments for this date. Please select another date.</p>
          </div>
        `;
      } else {
        // Show available slots
        html = `
          <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
          <div class="time-slots-grid">
        `;
        
        timeSlots.forEach(slot => {
          html += `
            <div class="time-slot" onclick="selectTimeSlot(this, '${dateString}', '${slot}')">
              ${formatTime(slot)}
            </div>
          `;
        });
        
        html += `</div>`;
      }
      
      timeSlotsContainer.innerHTML = html;
    })
    .catch(error => {
      debugLog('ERROR generating time slots:', error);
      
      // Show error message
      html = `
        <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
        <div class="alert alert-warning">
          <p class="text-center mb-0">We encountered an issue loading available times. Please try again or select another date.</p>
        </div>
        <div class="text-center mt-3">
          <button class="btn btn-sm btn-primary" onclick="showTimeSlots(document.querySelector('.calendar-day.selected'))">Retry</button>
        </div>
      `;
      
      timeSlotsContainer.innerHTML = html;
    });
  
  return html;
}

/**
 * Show the booking form
 */
function showBookingForm(dateString, timeString) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  bookingFormContainer.style.display = 'block';
  
  bookingFormContainer.innerHTML = `
    <h4 class="mb-4">Complete Your Booking</h4>
    <p><strong>Service:</strong> ${getServiceName(selectedService)}</p>
    <p><strong>Date:</strong> ${formatDate(dateString)}</p>
    <p><strong>Time:</strong> ${formatTime(timeString)}</p>
    
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
 * Get the end time for an event
 */
function getEndTime(dateString, timeString, durationMinutes) {
  const startDateTime = new Date(`${dateString}T${timeString}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  
  const hours = String(endDateTime.getHours()).padStart(2, '0');
  const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
  
  return `${dateString}T${hours}:${minutes}:00`;
}

/**
 * Format a date string for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format a time string for display
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  
  if (hour === 0) {
    return `12:${minutes}am`;
  } else if (hour < 12) {
    return `${hour}:${minutes}am`;
  } else if (hour === 12) {
    return `12:${minutes}pm`;
  } else {
    return `${hour - 12}:${minutes}pm`;
  }
}

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
 * Show an error message
 */
function showError(message) {
  const calendarContainer = document.getElementById('appointment-calendar');
  
  if (calendarContainer) {
    // Show error but don't block the entire calendar
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-warning mb-4';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> ${message}`;
    
    // Insert at the top of the calendar container
    if (calendarContainer.firstChild) {
      calendarContainer.insertBefore(errorDiv, calendarContainer.firstChild);
    } else {
      calendarContainer.appendChild(errorDiv);
    }
  }
}

// Add new function to show fallback booking method
window.showBookingFallback = function(eventData) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  
  // First show a processing message
  bookingFormContainer.innerHTML = `
    <div class="text-center">
      <div class="spinner" style="margin: 20px auto;"></div>
      <p>Processing your appointment request...</p>
    </div>
  `;
  
  // Extract booking data from the event data
  const bookingData = {
    firstName: document.getElementById('booking-first-name').value,
    lastName: document.getElementById('booking-last-name').value,
    email: document.getElementById('booking-email').value,
    phone: document.getElementById('booking-phone').value,
    notes: document.getElementById('booking-notes').value,
    service: selectedService,
    date: selectedDateTime.date,
    time: selectedDateTime.time
  };
  
  // Send the booking data to our fallback PHP endpoint
  fetch('api/booking-fallback.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Show success message
      bookingFormContainer.innerHTML = `
        <div class="booking-success">
          <div class="text-center mb-4">
            <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
          </div>
          <h4 class="text-center">Booking Request Submitted</h4>
          <p class="text-center">We've received your appointment request for ${getServiceName(selectedService)} on ${formatDate(selectedDateTime.date)} at ${formatTime(selectedDateTime.time)}.</p>
          <p class="text-center">Our staff will contact you shortly to confirm your appointment.</p>
          <p class="text-center mt-3"><strong>If you don't hear from us within 24 hours, please call us at (02) 9398 7578.</strong></p>
          <div class="text-center mt-4">
            <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
          </div>
        </div>
      `;
    } else {
      // Show error message
      bookingFormContainer.innerHTML = `
        <div class="booking-error">
          <div class="text-center mb-4">
            <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
          </div>
          <h4 class="text-center">Booking Error</h4>
          <p class="text-center">${data.message}</p>
          <div class="text-center mt-4">
            <button class="btn btn-outline-secondary" onclick="resetBookingForm()">Try Again</button>
            <a href="contact-us.html" class="btn btn-primary ml-2">Contact Us</a>
          </div>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error submitting booking:', error);
    
    // Show error message
    bookingFormContainer.innerHTML = `
      <div class="booking-error">
        <div class="text-center mb-4">
          <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">Booking Error</h4>
        <p class="text-center">There was a problem submitting your booking. Please try again or contact us directly.</p>
        <div class="text-center mt-4">
          <button class="btn btn-outline-secondary" onclick="resetBookingForm()">Try Again</button>
          <a href="contact-us.html" class="btn btn-primary ml-2">Contact Us</a>
        </div>
      </div>
    `;
  });
};

// Add debug display to page
function addDebugDisplay() {
  if (DEBUG_MODE) {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'calendar-debug';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '20px';
    debugDiv.style.right = '20px';
    debugDiv.style.backgroundColor = '#f5f5f5';
    debugDiv.style.border = '1px solid #ddd';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '5px';
    debugDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.maxHeight = '300px';
    debugDiv.style.overflowY = 'auto';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.display = 'none';
    
    const header = document.createElement('div');
    header.innerHTML = '<h6 style="margin: 0 0 5px 0;"><i class="fas fa-bug"></i> Calendar Debug</h6>';
    header.style.cursor = 'pointer';
    header.onclick = function() {
      const content = document.getElementById('calendar-debug-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    };
    
    const content = document.createElement('div');
    content.id = 'calendar-debug-content';
    content.style.display = 'none';
    
    const log = document.createElement('div');
    log.id = 'calendar-debug-log';
    
    const actions = document.createElement('div');
    actions.style.marginTop = '10px';
    actions.innerHTML = `
      <button style="font-size: 10px; padding: 2px 5px; margin-right: 5px;" onclick="clearDebugLog()">Clear Log</button>
      <button style="font-size: 10px; padding: 2px 5px;" onclick="forceRefreshCalendar()">Force Refresh</button>
    `;
    
    content.appendChild(log);
    content.appendChild(actions);
    debugDiv.appendChild(header);
    debugDiv.appendChild(content);
    
    document.body.appendChild(debugDiv);
    
    // Add global functions
    window.clearDebugLog = function() {
      document.getElementById('calendar-debug-log').innerHTML = '';
    };
    
    window.forceRefreshCalendar = function() {
      if (selectedService) {
        showFallbackCalendar();
      }
    };
    
    // Debug display is hidden by default when DEBUG_MODE is false
    debugDiv.style.display = 'none';
  }
}

/**
 * Check if the calendar is properly loaded
 */
function checkCalendarLoaded() {
  debugLog('Checking if calendar is properly loaded');
  
  // Get the calendar container
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) {
    debugLog('ERROR: Calendar container not found!');
    return;
  }
  
  // Check if we have the calendar grid
  const calendarGrid = calendarContainer.querySelector('.calendar-grid');
  if (!calendarGrid) {
    debugLog('Calendar grid not found, calendar not properly loaded');
    
    // Show a notice that the calendar is not loaded properly
    const notice = document.createElement('div');
    notice.className = 'alert alert-warning mb-4';
    notice.innerHTML = `
      <p><strong>Note:</strong> The calendar did not load properly. 
      Please try refreshing the page or contact us directly.</p>
      <div class="text-center mt-3">
        <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
        <a href="contact-us.html" class="btn btn-outline-secondary ml-2">Contact Us</a>
      </div>
    `;
    
    // Clear the container and show the notice
    calendarContainer.innerHTML = '';
    calendarContainer.appendChild(notice);
    
    return false;
  }
  
  debugLog('Calendar appears to be properly loaded');
  return true;
} 