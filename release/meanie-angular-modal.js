/**
 * meanie-angular-modal * https://github.com/meanie/angular-modal
 *
 * Copyright (c) 2017 Adam Reis <adam@reis.nz>
 * License: MIT
 */
(function (window, angular, undefined) {
  'use strict';
  /**
   * Module definition and dependencies
   */

  angular.module('AppendAnimated.Service', [])

  /**
   * Append animated helper
   */
  .factory('$appendAnimated', ['$animate', function ($animate) {
    return function (child, parent) {
      var children = parent.children();
      if (children.length > 0) {
        return $animate.enter(child, parent, children[children.length - 1]);
      }
      return $animate.enter(child, parent);
    };
  }]);
})(window, window.angular);
(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('ModalOverlay.Service', ['AppendAnimated.Service'])

  /**
   * Modal overlay service
   */
  .factory('$modalOverlay', ['$animate', '$document', '$appendAnimated', function ($animate, $document, $appendAnimated) {

    //Global overlay element
    var overlayElement = void 0;
    var bodyElement = $document.find('body').eq(0);

    /**
     * Modal overlay service
     */
    return {

      /**
       * Show overlay element
       */
      show: function show(overlayClass) {

        //Already visible?
        if (overlayElement) {
          return;
        }

        //Create element
        overlayElement = angular.element('<div></div>').attr({
          class: overlayClass
        });

        //Animate in
        return $appendAnimated(overlayElement, bodyElement);
      },


      /**
       * Hide overlay element
       */
      hide: function hide() {
        if (overlayElement) {
          $animate.leave(overlayElement);
          overlayElement = null;
        }
      },


      /**
       * Set the proper z-index
       */
      setIndex: function setIndex(baseIndex, numModals) {
        if (overlayElement) {
          var zIndex = baseIndex + 2 * (numModals - 1);
          overlayElement[0].style.zIndex = zIndex;
        }
      }
    };
  }]);
})(window, window.angular);
(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('ModalStack.Service', [])

  /**
   * Modal stack service
   */
  .factory('$modalStack', function () {

    //Stack of modals
    var stack = [];

    //Modal stack interface
    return {

      /**
       * Get modal instances stack
       */
      get: function get() {
        return stack;
      },


      /**
       * Check if there are open instances
       */
      isEmpty: function isEmpty() {
        return stack.length === 0;
      },


      /**
       * Get number of modals that are open
       */
      numOpen: function numOpen() {
        return stack.length;
      },


      /**
       * Check if a specific modal is open
       */
      isOpen: function isOpen(name) {

        //Can't distinguish unnamed modals
        if (!name) {
          return false;
        }

        //Check if open
        for (var i = 0; i < stack.length; i++) {
          if (stack[i].name === name) {
            return true;
          }
        }

        //Not open
        return false;
      },


      /**
       * Check if a specific modal is last
       */
      isLast: function isLast(name) {

        //Can't distinguish unnamed modals or work with an empty stack
        if (!name || stack.length === 0) {
          return false;
        }

        //Get last modal and compare name
        var last = stack[stack.length - 1];
        return last.name === name;
      },


      /**
       * Add modal instance to stack
       */
      add: function add(modalInstance) {
        stack.push(modalInstance);
      },


      /**
       * Remove modal instance from stack
       */
      remove: function remove(modalInstance) {
        var index = stack.indexOf(modalInstance);
        if (index > -1) {
          stack.splice(index, 1);
        }
      }
    };
  });
})(window, window.angular);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('Modal.Service', ['ModalStack.Service', 'ModalOverlay.Service', 'AppendAnimated.Service'])

  /**
   * Modal service
   */
  .provider('$modal', function $modalProvider() {

    /**
     * Defaults
     */
    this.defaults = {
      closeOnEsc: true,
      closeOnClick: true,
      template: null,
      templateUrl: null,
      scope: null,
      controller: null,
      controllerAs: '$ctrl',
      resolve: {},
      locals: null,
      appendTo: null,
      overlay: true,
      wrapperClass: 'modal-wrapper ModalWrapper',
      overlayClass: 'modal-overlay ModalOverlay',
      onBeforeClose: null,
      once: false
    };

    /**
     * Store of predefined modal configs
     */
    this.configs = {};

    /**
     * Set defaults
     */
    this.setDefaults = function (defaults) {
      this.defaults = angular.extend(this.defaults, defaults || {});
      return this;
    };

    /**
     * Predefine a modal config
     */
    this.modal = function (name, config) {
      var _this = this;

      //Object hash given?
      if (name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
        angular.forEach(name, function (config, name) {
          _this.modal(name, config);
        }, this);
        return;
      }

      //Set config and return self
      this.configs[name] = angular.extend({}, this.defaults, config || {});
      return this;
    };

    /**
     * Service getter
     */
    this.$get = ['$rootScope', '$q', '$templateRequest', '$injector', '$controller', '$compile', '$document', '$animate', '$modalStack', '$modalOverlay', '$appendAnimated', function ($rootScope, $q, $templateRequest, $injector, $controller, $compile, $document, $animate, $modalStack, $modalOverlay, $appendAnimated) {

      //Get defaults and configs
      var baseIndex = 10000;
      var defaults = this.defaults;
      var configs = this.configs;

      //Get body element
      var bodyElement = $document.find('body').eq(0);

      /**
       * Helper to get template promise
       */
      function getTemplatePromise(template, templateUrl) {
        if (template) {
          return $q.when(template);
        }
        return $templateRequest(templateUrl, true);
      }

      /**
       * Helper to get resolve promises
       */
      function getResolvePromises(resolves) {
        var promises = [];
        angular.forEach(resolves, function (item) {
          if (angular.isFunction(item) || angular.isArray(item)) {
            promises.push($q.when($injector.invoke(item)));
          } else if (angular.isString(item)) {
            promises.push($q.when($injector.get(item)));
          } else {
            promises.push($q.when(item));
          }
        });
        return promises;
      }

      /**
       * Helper to open a modal
       */
      function openModal(modalInstance) {

        //Access modal data object
        var modal = modalInstance.$$modal;
        var numModals = $modalStack.numOpen() + 1;

        //Create then compile modal element
        modal.element = angular.element('<div></div>').attr({ class: modal.wrapperClass }).html(modal.content);
        modal.element = $compile(modal.element)(modal.scope);
        modal.element[0].style.zIndex = baseIndex + 2 * numModals - 1;

        //Close on click handler
        //NOTE: This is applied on the base modal element, e.g. invisible
        //background, not the overlay. This is because clicking on the overlay
        //would then close all modals, which is probably not what you'd want.
        if (modal.closeOnClick) {
          modal.element.on('click', function (event) {
            if (event.target === event.currentTarget) {
              event.preventDefault();
              event.stopPropagation();
              $rootScope.$apply(function () {
                closeModal(modalInstance, 'cancel', true);
              });
            }
          });
        }

        //Tabbing control
        (function tabbingControl() {
          var tabbableSelector = 'a[href], ' + 'area[href], ' + 'input:not([disabled]):not([tabindex=\'-1\']), ' + 'button:not([disabled]):not([tabindex=\'-1\']),' + 'select:not([disabled]):not([tabindex=\'-1\']), ' + 'textarea:not([disabled]):not([tabindex=\'-1\']), ' + 'iframe, object, embed, ' + '*[tabindex]:not([tabindex=\'-1\']), ' + '*[contenteditable=true]';

          function isVisible(element) {
            return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
          }

          function focusElement(offset) {
            var possibleFocussable = modal.element[0].querySelectorAll(tabbableSelector);
            var focussable = Array.prototype.filter.call(modal.element[0].querySelectorAll(tabbableSelector), isVisible);
            var index = focussable.indexOf(document.activeElement) + offset;
            var target = index < 0 ? focussable.length - 1 : focussable.length > index ? index : 0;
            focussable[target].focus();
          }

          modal.lockTabbing = function (event) {
            var key = event.keyCode || event.which;
            if (key === 9) {
              focusElement(event.shiftKey ? -1 : 1);
              event.preventDefault();
              return false;
            }
          };

          $document[0].addEventListener('keydown', modal.lockTabbing);
        })();

        //Add to stack and show overlay
        $modalStack.add(modalInstance);
        if (modal.showOverlay) {
          $modalOverlay.show(modal.overlayClass);
          $modalOverlay.setIndex(baseIndex, numModals);
        }

        //Call controller on init now
        if (modal.controller && modal.controller.$onInit) {
          modal.controller.$onInit.call(modal.controller);
        }

        //Append animated and resolve opened deferred
        return $appendAnimated(modal.element, modal.parent).then(function () {

          //Call controller $postLink
          if (modal.controller && modal.controller.$postLink) {
            modal.controller.$postLink.call(modal.controller);
          }

          //Resolve open
          modal.openedDeferred.resolve(true);
        }).catch(function (reason) {
          return modal.openedDeferred.reject(reason);
        });
      }

      /**
       * Helper to actually close modal after confirmed
       */
      function confirmCloseModal(modalInstance, result, wasDismissed) {

        //Access modal data object
        var modal = modalInstance.$$modal;
        var numModals = $modalStack.numOpen() - 1;

        //No element present?
        if (!modal.element) {
          return $q.when(true);
        }

        //Did we get a result
        if (wasDismissed) {
          modal.resultDeferred.reject(result);
        } else {
          modal.resultDeferred.resolve(result);
        }

        //Remove from stack
        $modalStack.remove(modalInstance);
        if ($modalStack.isEmpty()) {
          $modalOverlay.hide();
        } else {
          $modalOverlay.setIndex(baseIndex, numModals);
        }

        //Animate out
        return $animate.leave(modal.element).then(function () {

          //Call controller on destroy now
          if (modal.controller && modal.controller.$onDestroy) {
            modal.controller.$onDestroy.call(modal.controller);
          }

          //Clean up scope
          if (modal.scope) {
            modal.scope.$destroy();
            modal.scope = null;
          }

          //Remove element reference
          modal.element = null;

          //Remove event listeners
          $document[0].removeEventListener('keydown', modal.broadcastEnter);
          if (modal.closeOnEsc) {
            $document[0].removeEventListener('keydown', modal.closeOnEsc);
            modal.closeOnEsc = null;
          }
          if (modal.lockTabbing) {
            $document[0].removeEventListener('keydown', modal.lockTabbing);
            modal.lockTabbing = null;
          }
        });
      }

      /**
       * Helper to close a modal
       */
      function closeModal(modalInstance, result, wasDismissed) {

        //Access modal data object
        var modal = modalInstance.$$modal;

        //No element present?
        if (!modal.element) {
          return $q.when(true);
        }

        //Call on before close handler if given
        if (typeof modal.onBeforeClose === 'function') {

          //Get outcome
          var outcome = modal.onBeforeClose(modalInstance, result, wasDismissed);

          //Handle promise
          if (outcome && typeof outcome.then === 'function') {
            return outcome.then(function () {
              return confirmCloseModal(modalInstance, result, wasDismissed);
            }).catch(function (reason) {
              return $q.reject(reason || 'Close prevented');
            });
          }

          //Handle other reject reasons
          if (typeof outcome !== 'undefined' && outcome !== true) {
            return $q.reject(outcome || 'Close prevented');
          }
        }

        //Confirm
        return confirmCloseModal(modalInstance, result, wasDismissed);
      }

      /**
       * Class definition
       */
      var Modal = {

        /**
         * Open a new modal
         */
        open: function open(name, options, closeOthers) {

          //No name given?
          if (typeof name !== 'string') {
            options = name || {};
            name = '';
          }

          //Name given? Merge with predefined configs
          if (name && typeof configs[name] !== 'undefined') {
            options = angular.extend({}, configs[name], options || {});
          } else if (name) {
            throw new Error('String given as options, but config with name ' + name + ' was not predefined');
          }

          //Check if already open
          if (name && options.once && $modalStack.isOpen(name)) {
            return null;
          }

          //Validate options
          options = angular.extend({}, defaults, options || {});
          options.resolve = options.resolve || {};
          options.appendTo = options.appendTo || bodyElement;

          //Must have either template or template url specified
          if (!options.template && !options.templateUrl) {
            throw new Error('One of template or templateUrl options is required');
          }

          if (!options.appendTo.length) {
            throw new Error('Element to append modal to not found in the DOM');
          }

          //Prepare modal data object
          var modal = {
            openedDeferred: $q.defer(),
            resultDeferred: $q.defer(),
            parent: options.appendTo,
            wrapperClass: options.wrapperClass,
            overlayClass: options.overlayClass,
            showOverlay: options.overlay,
            closeOnClick: options.closeOnClick,
            onBeforeClose: options.onBeforeClose
          };

          //Create modal instance interface
          var modalInstance = {
            $$modal: modal,
            name: name,
            opened: modal.openedDeferred.promise,
            result: modal.resultDeferred.promise,
            close: function close(result) {
              return closeModal(modalInstance, result);
            },
            dismiss: function dismiss(reason) {
              return closeModal(modalInstance, reason, true);
            }
          };

          //Close on escape?
          if (options.closeOnEsc) {
            modal.closeOnEsc = function (event) {
              var key = event.keyCode || event.which;
              if (key === 27 && (!name || $modalStack.isLast(name))) {
                $rootScope.$apply(function () {
                  closeModal(modalInstance, 'cancel', true);
                });
              }
            };
            $document[0].addEventListener('keydown', modal.closeOnEsc);
          }

          //Enter broadcast
          modal.broadcastEnter = function (event) {
            var key = event.keyCode || event.which;
            var isTextarea = event.target.tagName === 'TEXTAREA';
            if (key === 13 && !event.defaultPrevented && !isTextarea) {
              $rootScope.$broadcast('$modalEnterKey', modalInstance, event);
            }
          };
          $document[0].addEventListener('keydown', modal.broadcastEnter);

          //Wait for template and resolves to resolve
          $q.all([getTemplatePromise(options.template, options.templateUrl)].concat(_toConsumableArray(getResolvePromises(options.resolve)))).then(function (resolves) {

            //Get template content
            modal.content = resolves.shift();

            //Determine modal scope and link close/dismiss handlers
            modal.scope = (options.scope || $rootScope).$new();
            modal.scope.$close = modalInstance.close;
            modal.scope.$dismiss = modalInstance.dismiss;

            //Controller given?
            if (options.controller) {

              //Initialize controller vars
              var locals = {};

              //Provide scope and modal instance
              locals.$scope = modal.scope;
              locals.$modalInstance = modalInstance;

              //Provide other passed locals
              if (options.locals && _typeof(options.locals) === 'object') {
                angular.forEach(options.locals, function (value, key) {
                  locals[key] = value;
                });
              }

              //Provide resolved values
              angular.forEach(options.resolve, function (value, key) {
                locals[key] = resolves.shift();
              });

              //Create controller instance
              modal.controller = $controller(options.controller, locals);
              if (options.controllerAs) {
                modal.scope[options.controllerAs] = modal.controller;
              }

              //Attach locals to controller
              angular.forEach(options.locals, function (value, key) {
                modal.controller[key] = value;
              });
            }

            //Close others?
            if (closeOthers) {
              Modal.closeAll();
            }

            //Open modal now
            openModal(modalInstance);
          }).catch(function (reason) {
            modal.openedDeferred.reject(reason);
            modal.resultDeferred.reject(reason);
          });

          //Return modal instance
          return modalInstance;
        },


        /**
         * Close all modals
         */
        closeAll: function closeAll() {
          var stack = $modalStack.get();
          angular.forEach(stack, function (modalInstance) {
            closeModal(modalInstance, 'cancel', true);
          });
        },


        /**
         * Check if a specific modal is open
         */
        isOpen: function isOpen(name) {
          return $modalStack.isOpen(name);
        }
      };

      //Return the service
      return Modal;
    }];
  });
})(window, window.angular);