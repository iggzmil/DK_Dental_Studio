/**
 * DK Dental Studio - Universal JavaScript Bundle
 * Contains ALL JavaScript needed for the entire website
 * This is the ONLY JavaScript file that all pages load
 */

// Include jQuery appear plugin
/*! jquery.appear.js */
(function($) {
  $.fn.appear = function(fn, options) {
    var settings = $.extend({
      data: undefined,
      one: true,
      accX: 0,
      accY: 0
    }, options);

    return this.each(function() {
      var t = $(this);
      t.appeared = false;

      if (!fn) {
        t.trigger('appear', settings.data);
        return;
      }

      var w = $(window);
      var check = function() {
        if (!t.is(':visible')) {
          return;
        }

        var a = w.scrollTop();
        var b = a + w.height();
        var o = t.offset();
        var x = o.left;
        var y = o.top;

        if (y + t.height() + settings.accY >= a &&
            y <= b + settings.accY &&
            x + t.width() + settings.accX >= w.scrollLeft() &&
            x <= w.scrollLeft() + w.width() + settings.accX) {
          if (!t.appeared) t.trigger('appear', settings.data);
        } else {
          t.appeared = false;
        }
      };

      var modifiedFn = function() {
        t.appeared = true;
        if (settings.one) {
          w.unbind('scroll', check);
          var i = $.inArray(check, $.fn.appear.checks);
          if (i >= 0) $.fn.appear.checks.splice(i, 1);
        }
        fn.apply(this, arguments);
      };

      if (settings.one) t.one('appear', settings.data, modifiedFn);
      else t.bind('appear', settings.data, modifiedFn);

      w.scroll(check);
      $.fn.appear.checks.push(check);
      (check)();
    });
  };

  $.extend($.fn.appear, {
    checks: [],
    timeout: null,
    checkAll: function() {
      var length = $.fn.appear.checks.length;
      if (length > 0) while (length--) ($.fn.appear.checks[length])();
    },
    run: function() {
      if ($.fn.appear.timeout) clearTimeout($.fn.appear.timeout);
      $.fn.appear.timeout = setTimeout($.fn.appear.checkAll, 20);
    }
  });

  $.each(['append', 'prepend', 'after', 'before', 'attr',
          'removeAttr', 'addClass', 'removeClass', 'toggleClass',
          'remove', 'css', 'show', 'hide'], function(i, n) {
    var old = $.fn[n];
    if (old) {
      $.fn[n] = function() {
        var r = old.apply(this, arguments);
        $.fn.appear.run();
        return r;
      };
    }
  });
})(jQuery);

// Include jQuery countTo plugin
/*! jquery.countTo.js */
(function ($) {
  $.fn.countTo = function (options) {
    options = options || {};

    return $(this).each(function () {
      var settings = $.extend({}, $.fn.countTo.defaults, {
        from:            $(this).data('from'),
        to:              $(this).data('to'),
        speed:           $(this).data('speed'),
        refreshInterval: $(this).data('refresh-interval'),
        decimals:        $(this).data('decimals')
      }, options);

      var loops = Math.ceil(settings.speed / settings.refreshInterval),
          increment = (settings.to - settings.from) / loops;

      var self = this,
          $self = $(this),
          loopCount = 0,
          value = settings.from,
          data = $self.data('countTo') || {};

      $self.data('countTo', data);

      if (data.interval) {
        clearInterval(data.interval);
      }
      data.interval = setInterval(updateTimer, settings.refreshInterval);

      render(value);

      function updateTimer() {
        value += increment;
        loopCount++;

        render(value);

        if (typeof(settings.onUpdate) == 'function') {
          settings.onUpdate.call(self, value);
        }

        if (loopCount >= loops) {
          $self.removeData('countTo');
          clearInterval(data.interval);
          value = settings.to;

          if (typeof(settings.onComplete) == 'function') {
            settings.onComplete.call(self, value);
          }
        }
      }

      function render(value) {
        var formattedValue = settings.formatter.call(self, value, settings);
        $self.html(formattedValue);
      }
    });
  };

  $.fn.countTo.defaults = {
    from: 0,
    to: 0,
    speed: 1000,
    refreshInterval: 100,
    decimals: 0,
    formatter: function (value, options) {
      return value.toFixed(options.decimals);
    },
    onUpdate: null,
    onComplete: null
  };
})(jQuery);

// Include all custom.js functionality
/*! custom.js - Template functionality */
(function ($) {
  "use strict";
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
// Updated for Bootstrap 5.3.6
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl);
});

/*************************
       Counter
*************************/
  AAACity.counters = function () {
    var counter = jQuery(".counter");
    if (counter.length > 0) {
      $counter.each(function () {
        var $elem = $(this);
        $elem.appear(function () {
          $elem.find('.timer').countTo();
        });
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
                  $(elem).appear(function () {
                      setTimeout(function () {
                          progressBarRun();
                      }, delay);
                  });
          });
      }
  };

/*************************
     Chat Icon Functions (from function.js)
*************************/
  // Initialize chat icon functionality and fix back-to-top button positioning
  function initChatIcon() {
      // Don't create the chat icon on contact page
      if (document.body.classList.contains('contact-page')) {
          return;
      }

      // Create the button if it doesn't exist
      if (!document.getElementById('chatIconBtn')) {
          // Create the chat button container
          const buttonContainer = document.createElement('div');
          buttonContainer.id = 'chatIconContainer';

          // Create the button
          const button = document.createElement('a');
          button.id = 'chatIconBtn';
          button.title = 'Chat with us';
          button.href = 'contact-us.html?openChat=true';

          // Create icon
          const icon = document.createElement('i');
          icon.className = 'fas fa-comment';
          button.appendChild(icon);

          // Create text label
          const textLabel = document.createElement('div');
          textLabel.id = 'chatIconLabel';
          textLabel.textContent = 'Need help? Let\'s chat!';

          // Add styles
          const style = document.createElement('style');
          style.textContent = \`
          /* Chat Icon Container */
          #chatIconContainer {
              position: fixed;
              bottom: 20px;
              right: 20px;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              z-index: 9998;
              font-family: 'Fira Sans', sans-serif;
          }

          /* Chat Icon Button */
          #chatIconBtn {
              width: 40px;
              height: 40px;
              background-color: #0d6efd;
              color: white;
              border: none;
              border-radius: 50%;
              cursor: pointer;
              display: flex;
              justify-content: center;
              align-items: center;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              transition: all 0.3s ease;
              font-size: 18px;
              text-decoration: none;
              margin-top: 8px;
          }

          #chatIconBtn:hover {
              background-color: #0b5ed7;
              transform: translateY(-2px);
          }

          /* Chat Icon Label */
          #chatIconLabel {
              position: relative;
              background-color: #0d6efd;
              color: white;
              padding: 8px 16px;
              border-radius: 16px;
              font-size: 14px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              font-weight: 500;
          }

          /* Chat bubble tail */
          #chatIconLabel:after {
              content: '';
              position: absolute;
              bottom: -6px;
              right: 10px;
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-top: 8px solid #0d6efd;
          }

          /* Back to Top Button - Override default styling */
          #back-to-top, .back-to-top {
              position: fixed !important;
              bottom: 20px !important;
              left: 20px !important;
              width: 40px !important;
              height: 40px !important;
              background-color: #0576ee !important;
              color: white !important;
              border-radius: 50% !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              z-index: 9997 !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
              transition: all 0.3s ease !important;
              text-decoration: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
          }
          #back-to-top.show, .back-to-top.show {
              opacity: 1 !important;
              visibility: visible !important;
          }
          #back-to-top:hover, .back-to-top:hover {
              background-color: #0461c7 !important;
              transform: translateY(-2px) !important;
          }
          #back-to-top i, .back-to-top i {
              font-size: 18px !important;
              line-height: 40px !important;
          }

          /* Hide chat bubble on tablets and mobile */
          @media (max-width: 991px) {
              #chatIconLabel {
                  display: none !important;
                  visibility: hidden !important;
                  opacity: 0 !important;
              }
              #chatIconBtn {
                  margin-top: 0;
              }
          }

          @media (max-width: 768px) {
              #chatIconContainer {
                  align-items: flex-end;
              }
              #chatIconBtn {
                  width: 40px;
                  height: 40px;
                  font-size: 16px;
              }
              #back-to-top, .back-to-top {
                  width: 40px !important;
                  height: 40px !important;
                  left: 20px !important;
              }
              #back-to-top i, .back-to-top i {
                  font-size: 16px !important;
              }
          }
          \`;

          document.head.appendChild(style);

          // Add elements to container and append to document
          buttonContainer.appendChild(textLabel);
          buttonContainer.appendChild(button);
          document.body.appendChild(buttonContainer);
      }
  }

  // Initialize back-to-top button functionality
  function initBackToTop() {
      // Get the back-to-top button
      const backToTop = document.getElementById('back-to-top') || document.querySelector('.back-to-top');

      if (backToTop) {
          // Initially hide the button
          backToTop.classList.remove('show');

          // Show/hide the button based on scroll position
          window.addEventListener('scroll', function() {
              if (window.pageYOffset > 300) {
                  backToTop.classList.add('show');
              } else {
                  backToTop.classList.remove('show');
              }
          });

          // Force initial check of scroll position
          window.dispatchEvent(new Event('scroll'));
      }
  }

/*************************
     Process Toggle Functions (from process-toggle.js)
*************************/
  // Generic toggle function that works with any section
  function toggleSection(detailsId, buttonId) {
    var details = document.getElementById(detailsId);
    var btn = document.getElementById(buttonId);

    if (!details || !btn) {
      console.warn('Toggle elements not found:', detailsId, buttonId);
      return;
    }

    if (details.style.display === 'none' || details.style.display === '') {
      // Show the section
      details.style.display = 'block';
      btn.innerHTML = '<i class="fas fa-minus mr-2"></i>Hide';
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-outline-primary');
    } else {
      // Hide the section
      details.style.display = 'none';
      btn.innerHTML = '<i class="fas fa-plus mr-2"></i>View';
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-outline-primary');
    }
  }

  // Define all the toggle functions used across the pages
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

/*************************
     Smooth Accordion Functions (from smooth-accordion.js)
*************************/
  /**
   * Initialize smooth accordion functionality
   */
  function initSmoothAccordion() {
    // Target all accordion buttons
    const accordionButtons = document.querySelectorAll('.accordion .btn-link');

    // Add event listeners to each button
    accordionButtons.forEach(button => {
      button.addEventListener('click', handleAccordionClick);
    });

    // Add CSS classes for transitions to all accordion content elements
    const accordionContents = document.querySelectorAll('.accordion .accordion-content');
    accordionContents.forEach(content => {
      content.classList.add('smooth-accordion-content');

      // Set initial state
      if (content.classList.contains('show')) {
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        content.style.maxHeight = '0px';
      }
    });
  }

  /**
   * Handle accordion button click
   * @param {Event} event - Click event
   */
  function handleAccordionClick(event) {
    // Prevent default behavior
    event.preventDefault();

    const button = event.currentTarget;
    const targetId = button.getAttribute('data-bs-target');
    const targetContent = document.querySelector(targetId);

    // If already animating, return
    if (targetContent.classList.contains('animating')) {
      return;
    }

    // Get parent accordion
    const accordion = button.closest('.accordion');
    const isMultiple = !accordion.querySelector('[data-bs-parent]');

    // Toggle current item
    toggleAccordionItem(button, targetContent);

    // If not multiple, close other items
    if (!isMultiple) {
      const otherButtons = accordion.querySelectorAll('.btn-link:not([data-bs-target="' + targetId + '"])');
      const otherContents = accordion.querySelectorAll('.accordion-content.show:not(' + targetId + ')');

      otherButtons.forEach(otherButton => {
        otherButton.classList.add('collapsed');
        otherButton.setAttribute('aria-expanded', 'false');
      });

      otherContents.forEach(otherContent => {
        closeAccordionItem(otherContent);
      });
    }
  }

  /**
   * Toggle accordion item open/closed
   * @param {Element} button - The accordion button
   * @param {Element} content - The accordion content
   */
  function toggleAccordionItem(button, content) {
    if (content.classList.contains('show')) {
      // Close item
      button.classList.add('collapsed');
      button.setAttribute('aria-expanded', 'false');
      closeAccordionItem(content);
    } else {
      // Open item
      button.classList.remove('collapsed');
      button.setAttribute('aria-expanded', 'true');
      openAccordionItem(content);
    }
  }

  /**
   * Open an accordion item with animation
   * @param {Element} content - The accordion content
   */
  function openAccordionItem(content) {
    // Mark as animating
    content.classList.add('animating');

    // Set max height to scroll height for animation
    const scrollHeight = content.scrollHeight;
    content.style.maxHeight = scrollHeight + 'px';

    // Add show class
    content.classList.add('show');

    // Scroll to the accordion item if it's not fully visible
    setTimeout(() => {
      scrollToAccordionIfNeeded(content);
    }, 50);

    // Remove animating class after animation completes
    setTimeout(() => {
      content.classList.remove('animating');
      // Set max height to none to allow for dynamic content
      content.style.maxHeight = 'none';
    }, 350);
  }

  /**
   * Close an accordion item with animation
   * @param {Element} content - The accordion content
   */
  function closeAccordionItem(content) {
    // Mark as animating
    content.classList.add('animating');

    // Set max height to current height first
    content.style.maxHeight = content.scrollHeight + 'px';

    // Force a reflow
    content.offsetHeight;

    // Then animate to zero
    setTimeout(() => {
      content.style.maxHeight = '0px';
    }, 10);

    // Remove show class after animation
    setTimeout(() => {
      content.classList.remove('show');
      content.classList.remove('animating');
    }, 350);
  }

  /**
   * Scroll to accordion item if it's not fully visible
   * @param {Element} content - The accordion content
   */
  function scrollToAccordionIfNeeded(content) {
    const rect = content.getBoundingClientRect();
    const accordionHeader = content.previousElementSibling;
    const headerRect = accordionHeader.getBoundingClientRect();

    // If the bottom of the content is below the viewport
    if (rect.bottom > window.innerHeight) {
      // Calculate how much of the content is visible
      const visibleHeight = window.innerHeight - rect.top;
      const contentHeight = rect.height;

      // If less than 50% is visible, scroll to make more visible
      if (visibleHeight < contentHeight * 0.5) {
        // Scroll to the header with some offset
        window.scrollTo({
          top: window.pageYOffset + headerRect.top - 100,
          behavior: 'smooth'
        });
      }
    }
  }

  /****************************************************
       AAACity Window load and functions
  ****************************************************/
  //Window load functions
  $window.on("load", function () {
    AAACity.progressBar();
  });

  //Document ready functions
  $document.ready(function () {
    AAACity.counters(),
    AAACity.dropdownmenu(),
    AAACity.isSticky(),
    AAACity.goToTop();

    // Initialize chat icon and back-to-top functionality
    initChatIcon();
    initBackToTop();

    // Initialize smooth accordion functionality
    initSmoothAccordion();

    // Initialize process toggle functionality
    // Add keyboard support for accessibility
    $('.process-header a[onclick]').on('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(this).click();
      }
    });

    // Add smooth scrolling when sections are expanded
    $('[id$="ToggleBtn"]').on('click', function() {
      var buttonId = $(this).attr('id');
      var detailsId = buttonId.replace('ToggleBtn', 'Details');
      var details = document.getElementById(detailsId);

      if (details && details.style.display === 'block') {
        // Scroll to the section after a short delay to allow for expansion
        setTimeout(function() {
          details.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    });
  });
})(jQuery);

// Initialize Bootstrap 5 navbar toggler and common functionality
$(document).ready(function() {
  $('.navbar-toggler').on('click', function() {
    var target = $(this).data('bs-target');
    $(target).toggleClass('show');
  });

  // Make footer logo function as back-to-top button
  $('.footer-logo-back-to-top').on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: 0 }, 800);
    return false;
  });

  // Set copyright year (common functionality for all pages)
  const copyrightElement = document.getElementById('copyright');
  if (copyrightElement) {
    copyrightElement.textContent = new Date().getFullYear();
  }
});