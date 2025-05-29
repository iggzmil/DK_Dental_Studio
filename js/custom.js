/**
 * DK Dental Studio - Complete JavaScript Bundle
 * Contains ALL JavaScript functionality for the entire website
 * This replaces common-init.js, function.js, process-toggle.js, and smooth-accordion.js
 * 
 * Template: Medic - Health and Medical HTML Template
 * Author: potenzaglobalsolutions
 * Updated for Bootstrap 5.3.6 - DK Dental Studio
 */

(function() {
  'use strict';
  
  // Main initialization function - runs when DOM is ready
  $(document).ready(function() {
    // Initialize all functionality
    initializeAAACity();
    initChatIcon();
    initSmoothAccordion();
    initializeProcessToggles();
  });

})();

/**
 * ========================================
 * MAIN TEMPLATE FUNCTIONALITY (AAACity)
 * ========================================
 */
(function ($) {
  "use strict";
  
  // Global initialization function
  window.initializeAAACity = function() {
    var AAACity = {};

    /*************************
      Predefined Variables
    *************************/
    var $window = $(window),
      $document = $(document),
      $body = $('body'),
      $progressBar = $('.skill-bar'),
      $countdownTimer = $('.countdown'),
      $counter = $('.counter');
      
    //Check if function exists
    $.fn.exists = function () {
      return this.length > 0;
    };

    /*************************
            Menu (Updated for Bootstrap 5.3.6)
    *************************/
    AAACity.dropdownmenu = function () {
      if ($('.navbar').exists()) {
        $('.dropdown-menu a.dropdown-toggle').on('click', function (e) {
          if (!$(this).next().hasClass('show')) {
            $(this).parents('.dropdown-menu').first().find('.show').removeClass("show");
          }
          var $subMenu = $(this).next(".dropdown-menu");
          $subMenu.toggleClass('show');
          $(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', function (e) {
            $('.dropdown-submenu .show').removeClass("show");
          });
          return false;
        });
      }
    };

    /*************************
         Mobile Navigation (Bootstrap 5.3.6)
    *************************/
    AAACity.mobileNavigation = function () {
      // Manually handle Bootstrap navbar collapse functionality
      if ($('.navbar-toggler').exists()) {
        $('.navbar-toggler').off('click').on('click', function(e) {
          e.preventDefault();
          
          var target = $(this).attr('data-bs-target');
          var $navbarCollapse = $(target);
          
          if ($navbarCollapse.hasClass('show')) {
            $navbarCollapse.removeClass('show');
            $(this).attr('aria-expanded', 'false');
          } else {
            $navbarCollapse.addClass('show');
            $(this).attr('aria-expanded', 'true');
          }
        });
      }
    };

    /*************************
             Sticky
    *************************/
    AAACity.isSticky = function () {
      $(window).scroll(function(){
        if ($(this).scrollTop() > 150) {
           $('.header-sticky').addClass('is-sticky');
        } else {
           $('.header-sticky').removeClass('is-sticky');
        }
      });
    };

    /*************************
          Tooltip
    *************************/
    AAACity.initTooltips = function() {
      // Updated for Bootstrap 5.3.6
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });

      var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
      var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
      });
    };

    /*************************
           Counter
    *************************/
    AAACity.counters = function () {
      var counter = jQuery(".counter");
      if (counter.length > 0) {
        $counter.each(function () {
          var $elem = $(this);
          var $timer = $elem.find('.timer');
          
          if ($timer.length > 0) {
            // Custom counter animation since countTo plugin is not available
            $timer.each(function() {
              var $this = $(this);
              var countTo = parseInt($this.attr('data-to')) || 0;
              var speed = parseInt($this.attr('data-speed')) || 2000;
              var increment = Math.ceil(countTo / (speed / 50));
              var current = 0;
              var $plusSign = $this.next('span'); // Get the + sign element
              
              // Start animation with a small delay for better visual effect
              setTimeout(function() {
                var timer = setInterval(function() {
                  current += increment;
                  if (current >= countTo) {
                    current = countTo;
                    clearInterval(timer);
                  }
                  $this.text(current);
                }, 50);
              }, 500);
            });
          }
        });
      }
    };

    /*************************
         Back to top
    *************************/
    AAACity.goToTop = function () {
      var $goToTop = $('#back-to-top');
      $goToTop.hide();
      $window.scroll(function () {
        if ($window.scrollTop() > 100) $goToTop.fadeIn();
        else $goToTop.fadeOut();
      });
      $goToTop.on("click", function () {
        $('body,html').animate({
          scrollTop: 0
        }, 1000);
        return false;
      });
    }

    /*************************
            Progressbar (Updated for Bootstrap 5.3.6)
    *************************/
    AAACity.progressBar = function () {
        if ($progressBar.exists()) {
            $progressBar.each(function (i, elem) {
                var $elem = $(this),
                    percent = $elem.attr('data-bs-percent') || "100",
                    delay = $elem.attr('data-bs-delay') || "100",
                    type = $elem.attr('data-bs-type') || "%";

                if (!$elem.hasClass('progress-animated')) {
                    $elem.css({
                        'width': '0%'
                    });
                }
                var progressBarRun = function () {
                    $elem.animate({
                        'width': percent + '%'
                    }, 'easeInOutCirc').addClass('progress-animated');

                    $elem.delay(delay).append('<span class="progress-type animated fadeIn">' + type + '</span><span class="progress-number animated fadeIn">' + percent + '</span>');
                };
                
                // Run the animation immediately since appear plugin is not available
                setTimeout(function () {
                    progressBarRun();
                }, delay);
            });
        }
    };

    /****************************************************
         AAACity Window load and functions
    ****************************************************/
    //Window load functions
    $window.on("load", function () {
      AAACity.progressBar();
    });

    //Document ready functions - Initialize everything
    AAACity.counters();
    AAACity.dropdownmenu();
    AAACity.isSticky();
    AAACity.goToTop();
    AAACity.initTooltips();
    AAACity.mobileNavigation();
  };
})(jQuery);

/**
 * ========================================
 * CHAT ICON FUNCTIONALITY
 * ========================================
 */
window.initChatIcon = function() {
  // Don't create the chat icon on contact page
  if (document.body.classList.contains('contact-page')) {
    return;
  }

  // Create the button if it doesn't exist
  if (!document.getElementById('chatIconBtn')) {
    // Create the chat button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'chatIconContainer';

    // Create the chat label (bubble)
    const label = document.createElement('div');
    label.id = 'chatIconLabel';
    label.textContent = 'Need help? Let\'s chat!';

    // Create the button
    const button = document.createElement('a');
    button.id = 'chatIconBtn';
    button.title = 'Chat with us';
    button.href = 'contact-us.html?openChat=true';
    button.innerHTML = '<i class="fas fa-comment"></i>';

    // Add elements to page in correct order (label first, then button)
    buttonContainer.appendChild(label);
    buttonContainer.appendChild(button);
    document.body.appendChild(buttonContainer);
  }
};

/**
 * ========================================
 * SMOOTH ACCORDION FUNCTIONALITY
 * ========================================
 */
window.initSmoothAccordion = function() {
  /**
   * Initialize smooth accordion functionality
   */
  function setupSmoothAccordion() {
    // Target all accordion buttons
    const accordionButtons = document.querySelectorAll('.accordion .btn-link');
    
    // Add event listeners to each button
    accordionButtons.forEach(button => {
      button.addEventListener('click', handleAccordionClick);
    });

    // Add CSS classes for transitions to all accordion content elements
    const accordionContents = document.querySelectorAll('.accordion .collapse');
    accordionContents.forEach(content => {
      content.style.transition = 'all 0.3s ease-in-out';
    });
  }

  /**
   * Handle accordion button clicks for smooth animation
   */
  function handleAccordionClick(event) {
    const button = event.currentTarget;
    const targetId = button.getAttribute('data-bs-target') || button.getAttribute('href');
    
    if (!targetId) return;
    
    const targetContent = document.querySelector(targetId);
    if (!targetContent) return;

    // Smooth transition effect
    targetContent.addEventListener('show.bs.collapse', function() {
      this.style.maxHeight = '0px';
      this.style.overflow = 'hidden';
      
      // Animate to full height
      setTimeout(() => {
        this.style.maxHeight = this.scrollHeight + 'px';
      }, 10);
    });

    targetContent.addEventListener('shown.bs.collapse', function() {
      this.style.maxHeight = 'none';
      this.style.overflow = 'visible';
    });

    targetContent.addEventListener('hide.bs.collapse', function() {
      this.style.maxHeight = this.scrollHeight + 'px';
      this.style.overflow = 'hidden';
      
      // Animate to zero height
      setTimeout(() => {
        this.style.maxHeight = '0px';
      }, 10);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSmoothAccordion);
  } else {
    setupSmoothAccordion();
  }
};

/**
 * ========================================
 * PROCESS TOGGLE FUNCTIONALITY
 * ========================================
 */
window.initializeProcessToggles = function() {
  // Generic toggle function that works with any section
  function toggleSection(detailsId, buttonId) {
    var details = document.getElementById(detailsId);
    var btn = document.getElementById(buttonId);

    if (!details || !btn) {
      return;
    }

    if (details.style.display === 'none' || details.style.display === '') {
      // Show the section
      details.style.display = 'block';
      btn.innerHTML = '<i class="fas fa-minus mr-2"></i>Hide';
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-outline-secondary');
    } else {
      // Hide the section
      details.style.display = 'none';
      btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Show';
      btn.classList.remove('btn-outline-secondary');
      btn.classList.add('btn-outline-primary');
    }
  }

  // Specific toggle functions for different sections
  window.toggleProcessSection = function() {
    toggleSection('processDetails', 'processToggleBtn');
  };

  window.toggleImplantSection = function() {
    toggleSection('implantDetails', 'implantToggleBtn');
  };

  window.toggleAllon4Section = function() {
    toggleSection('allon4Details', 'allon4ToggleBtn');
  };

  window.toggleCareSection = function() {
    toggleSection('careDetails', 'careToggleBtn');
  };

  window.toggleImplantRetainedSection = function() {
    toggleSection('implantRetainedDetails', 'implantRetainedToggleBtn');
  };

  window.toggleRepairsSection = function() {
    toggleSection('repairsDetails', 'repairsToggleBtn');
  };

  window.toggleCleanSection = function() {
    toggleSection('cleanDetails', 'cleanToggleBtn');
  };
}; 