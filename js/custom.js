/*

Template: Medic - Health and Medical HTML Template
Author: potenzaglobalsolutions
Design and Developed by: potenzaglobalsolutions.com
Updated for Bootstrap 5.3.6

NOTE: This file contains all scripts for the actual Template.

*/

/*================================================
[  Table of contents  ]
================================================

:: Menu
:: Sticky
:: Tooltip
:: Counter
:: Owl carousel
:: Datetimepicker
:: Select2
:: Back to top
:: Progressbar

======================================
[ End table content ]
======================================*/
//POTENZA var

(function ($) {
  "use strict";
  var POTENZA = {};

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
  POTENZA.dropdownmenu = function () {
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

POTENZA.isSticky = function () {
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
  POTENZA.counters = function () {
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
       Owl carousel (Updated for Bootstrap 5.3.6)
  *************************/
  POTENZA.carousel = function () {
    var owlslider = jQuery("div.owl-carousel");
    if (owlslider.length > 0) {
      owlslider.each(function () {
        var $this = $(this),
          $items = ($this.data('bs-items')) ? $this.data('bs-items') : 1,
          $loop = ($this.attr('data-bs-loop')) ? $this.data('bs-loop') : true,
          $navdots = ($this.data('bs-nav-dots')) ? $this.data('bs-nav-dots') : false,
          $navarrow = ($this.data('bs-nav-arrow')) ? $this.data('bs-nav-arrow') : false,
          $autoplay = ($this.attr('data-bs-autoplay')) ? $this.data('bs-autoplay') : true,
          $autospeed = ($this.attr('data-bs-autospeed')) ? $this.data('bs-autospeed') : 5000,
          $smartspeed = ($this.attr('data-bs-smartspeed')) ? $this.data('bs-smartspeed') : 1000,
          $autohgt = ($this.data('bs-autoheight')) ? $this.data('bs-autoheight') : false,
          $space = ($this.attr('data-bs-space')) ? $this.data('bs-space') : 30,
          $animateOut = ($this.attr('data-bs-animateOut')) ? $this.data('bs-animateOut') : false;

        $(this).owlCarousel({
          loop: $loop,
          items: $items,
          responsive: {
            0: {
              items: $this.data('bs-xx-items') ? $this.data('bs-xx-items') : 1
            },
            480: {
              items: $this.data('bs-xs-items') ? $this.data('bs-xs-items') : 1
            },
            768: {
              items: $this.data('bs-sm-items') ? $this.data('bs-sm-items') : 2
            },
            980: {
              items: $this.data('bs-md-items') ? $this.data('bs-md-items') : 3
            },
            1200: {
              items: $items
            }
          },
          dots: $navdots,
          autoplayTimeout: $autospeed,
          smartSpeed: $smartspeed,
          autoHeight: $autohgt,
          margin: $space,
          nav: $navarrow,
          navText: ["<i class='fas fa-chevron-left'></i>", "<i class='fas fa-chevron-right'></i>"],
          autoplay: $autoplay,
          autoplayHoverPause: true
        });
      });
    }
  }

  /*************************
        Swiper slider (Removed - no longer used)
  *************************/
  POTENZA.swiperAnimation = function () {
    // Function removed - swiper files no longer included
  }

  /*************************
        Slickslider (Removed - no longer used)
  *************************/
  POTENZA.slickslider = function () {
    // Function removed - slick files no longer included
  };

  /*************************
      Magnific Popup (Removed - no longer used)
  *************************/
  POTENZA.mediaPopups = function () {
    // Function removed - magnific-popup files no longer included
  }

  /*************************
      Shuffle (Removed - no longer used)
  *************************/
   POTENZA.shuffle = function () {
    // Function removed - shuffle files no longer included
 }


  /*************************
      Datetimepicker
  *************************/
  POTENZA.datetimepickers = function () {
    if ($('.datetimepickers').exists()) {
      $('#datetimepicker-01, #datetimepicker-02').datetimepicker({
        format: 'L'
      });
      $('#datetimepicker-03, #datetimepicker-04').datetimepicker({
        format: 'LT'
      });
    }
  };

  /*************************
      Select2
  *************************/
  POTENZA.select2 = function () {
    if ($('.basic-select').exists()) {
      var select = jQuery(".basic-select");
      if (select.length > 0) {
        $('.basic-select').select2({dropdownCssClass : 'bigdrop'});
      }

    }
  };

  /*************************
      Range Slider (Removed - no longer used)
  *************************/
  POTENZA.rangesliders = function () {
    // Function removed - range-slider files no longer included
  };

  /*************************
           Countdown (Removed - no longer used)
  *************************/
  POTENZA.countdownTimer = function () {
    // Function removed - countdown files no longer included
  }

/*************************
     Back to top
*************************/
  POTENZA.goToTop = function () {
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
  POTENZA.progressBar = function () {
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

  /****************************************************
       POTENZA Window load and functions
  ****************************************************/
  //Window load functions
  $window.on("load", function () {
    POTENZA.progressBar();
  });

  //Document ready functions
  $document.ready(function () {
    POTENZA.counters(),
    POTENZA.datetimepickers(),
    POTENZA.select2(),
    POTENZA.dropdownmenu(),
    POTENZA.isSticky(),
    POTENZA.goToTop(),
    POTENZA.carousel();
  });
})(jQuery);
