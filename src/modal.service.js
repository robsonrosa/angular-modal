
/**
 * Module definition and dependencies
 */
angular.module('Modal.Service', [])

/**
 * Modal stack service
 */
.factory('$modalStack', function $modalStack() {

  //Stack of modals
  let stack = [];

  //Modal stack interface
  return {

    /**
     * Get modal instances stack
     */
    get: function() {
      return stack;
    },

    /**
     * Check if there are open instances
     */
    isEmpty: function() {
      return (stack.length === 0);
    },

    /**
     * Get number of modals that are open
     */
    numOpen: function() {
      return stack.length;
    },

    /**
     * Check if a specific modal is open
     */
    isOpen: function(name) {

      //Can't distinguish unnamed modals
      if (!name) {
        return false;
      }

      //Check if open
      for (let i = 0; i < stack.length; i++) {
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
    isLast: function(name) {

      //Can't distinguish unnamed modals or work with an empty stack
      if (!name || stack.length === 0) {
        return false;
      }

      //Get last modal and compare name
      let last = stack[stack.length - 1];
      return (last.name === name);
    },

    /**
     * Add modal instance to stack
     */
    add: function(modalInstance) {
      stack.push(modalInstance);
    },

    /**
     * Remove modal instance from stack
     */
    remove: function(modalInstance) {
      let index = stack.indexOf(modalInstance);
      if (index > -1) {
        stack.splice(index, 1);
      }
    },
  };
})

/**
 * Modal overlay service
 */
.factory('$modalOverlay', function($animate, $document, $appendAnimated) {

  //Global overlay element
  let overlayElement;
  let bodyElement = $document.find('body').eq(0);

  /**
   * Modal overlay service
   */
  return {

    /**
     * Show overlay element
     */
    show: function(overlayClass) {

      //Already visible?
      if (overlayElement) {
        return;
      }

      //Create element
      overlayElement = angular.element('<div></div>').attr({
        class: overlayClass,
      });

      //Animate in
      return $appendAnimated(overlayElement, bodyElement);
    },

    /**
     * Hide overlay element
     */
    hide: function() {
      if (overlayElement) {
        $animate.leave(overlayElement);
        overlayElement = null;
      }
    },

    /**
     * Set the proper z-index
     */
    setIndex: function(baseIndex, numModals) {
      if (overlayElement) {
        let zIndex = baseIndex + 2 * (numModals - 1);
        overlayElement[0].style.zIndex = zIndex;
      }
    },
  };
})

/**
 * Append animated helper
 */
.factory('$appendAnimated', function $appendAnimated($animate) {
  return function(child, parent) {
    let children = parent.children();
    if (children.length > 0) {
      return $animate.enter(child, parent, children[children.length - 1]);
    }
    return $animate.enter(child, parent);
  };
})

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
    controllerAs: null,
    resolve: {},
    locals: null,
    appendTo: null,
    overlay: true,
    wrapperClass: 'modal-wrapper ModalWrapper',
    overlayClass: 'modal-overlay ModalOverlay',
    onBeforeClose: null,
  };

  /**
   * Store of predefined modal configs
   */
  this.configs = {};

  /**
   * Set defaults
   */
  this.setDefaults = function(defaults) {
    this.defaults = angular.extend(this.defaults, defaults || {});
    return this;
  };

  /**
   * Predefine a modal config
   */
  this.modal = function(name, config) {

    //Object hash given?
    if (name && typeof name === 'object') {
      angular.forEach(name, function(config, name) {
        this.modal(name, config);
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
  this.$get = function(
    $rootScope, $q, $templateRequest, $injector, $controller,
    $compile, $document, $animate, $modalStack, $modalOverlay,
    $appendAnimated
  ) {

    //Get defaults and configs
    let baseIndex = 10000;
    let defaults = this.defaults;
    let configs = this.configs;

    //Get body element
    let bodyElement = $document.find('body').eq(0);

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
      let promises = [];
      angular.forEach(resolves, function(item) {
        if (angular.isFunction(item) || angular.isArray(item)) {
          promises.push($q.when($injector.invoke(item)));
        }
        else if (angular.isString(item)) {
          promises.push($q.when($injector.get(item)));
        }
        else {
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
      let modal = modalInstance.$$modal;
      let numModals = $modalStack.numOpen() + 1;

      //Create then compile modal element
      modal.element = angular.element('<div></div>').attr({
        class: modal.wrapperClass,
      }).html(modal.content);
      modal.element = $compile(modal.element)(modal.scope);
      modal.element[0].style.zIndex = baseIndex + (2 * numModals) - 1;

      //Close on click?
      if (modal.closeOnClick) {
        modal.element.on('click', function(event) {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            event.stopPropagation();
            $rootScope.$apply(function() {
              closeModal(modalInstance, 'cancel', true);
            });
          }
        });
      }

      //Add to stack and show overlay
      $modalStack.add(modalInstance);
      if (modal.showOverlay) {
        $modalOverlay.show(modal.overlayClass);
        $modalOverlay.setIndex(baseIndex, numModals);
      }

      //Append animated and resolve opened deferred
      return $appendAnimated(modal.element, modal.parent).then(function() {
        modal.openedDeferred.resolve(true);
      }, function(reason) {
        modal.openedDeferred.reject(reason);
      });
    }

    /**
     * Helper to actually close modal after confirmed
     */
    function confirmCloseModal(modalInstance, result, wasDismissed) {

      //Access modal data object
      let modal = modalInstance.$$modal;
      let numModals = $modalStack.numOpen() - 1;

      //No element present?
      if (!modal.element) {
        return $q.when(true);
      }

      //Did we get a result
      if (wasDismissed) {
        modal.resultDeferred.reject(result);
      }
      else {
        modal.resultDeferred.resolve(result);
      }

      //Remove from stack
      $modalStack.remove(modalInstance);
      if ($modalStack.isEmpty()) {
        $modalOverlay.hide();
      }
      else {
        $modalOverlay.setIndex(baseIndex, numModals);
      }

      //Animate out
      return $animate.leave(modal.element).then(function() {

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
      });
    }

    /**
     * Helper to close a modal
     */
    function closeModal(modalInstance, result, wasDismissed) {

      //Access modal data object
      let modal = modalInstance.$$modal;

      //No element present?
      if (!modal.element) {
        return $q.when(true);
      }

      //Call on before close handler if given
      if (typeof modal.onBeforeClose === 'function') {

        //Get outcome
        let outcome = modal.onBeforeClose(modalInstance, result, wasDismissed);

        //Handle promise
        if (outcome && typeof outcome.then === 'function') {
          return outcome
            .then(() => confirmCloseModal(modalInstance, result, wasDismissed))
            .catch(reason => $q.reject(reason || 'Close prevented'));
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
    let Modal = {

      /**
       * Open a new modal
       */
      open: function(name, options, closeOthers) {

        //No name given?
        if (typeof name !== 'string') {
          options = name || {};
          name = '';
        }

        //Name given? Merge with predefined configs
        if (name && typeof configs[name] !== 'undefined') {
          options = angular.extend({}, configs[name], options || {});
        }
        else if (name) {
          throw new Error('String given as options, but config with name ' +
            name + ' was not predefined');
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
        let modal = {
          openedDeferred: $q.defer(),
          resultDeferred: $q.defer(),
          parent: options.appendTo,
          wrapperClass: options.wrapperClass,
          overlayClass: options.overlayClass,
          showOverlay: options.overlay,
          closeOnClick: options.closeOnClick,
          onBeforeClose: options.onBeforeClose,
        };

        //Create modal instance interface
        let modalInstance = {
          $$modal: modal,
          name: name,
          opened: modal.openedDeferred.promise,
          result: modal.resultDeferred.promise,
          close: function(result) {
            return closeModal(modalInstance, result);
          },
          dismiss: function(reason) {
            return closeModal(modalInstance, reason, true);
          },
        };

        //Close on escape?
        if (options.closeOnEsc) {
          modal.closeOnEsc = function(event) {
            let key = event.keyCode || event.which;
            if (key === 27 && $modalStack.isLast(name)) {
              $rootScope.$apply(function() {
                closeModal(modalInstance, 'cancel', true);
              });
            }
          };
          $document[0].addEventListener('keydown', modal.closeOnEsc);
        }

        //Enter broadcast
        modal.broadcastEnter = function(event) {
          let key = event.keyCode || event.which;
          let isTextarea = (event.target.tagName === 'TEXTAREA');
          if (key === 13 && !event.defaultPrevented && !isTextarea) {
            $rootScope.$broadcast('$modalEnterKey', modalInstance, event);
          }
        };
        $document[0].addEventListener('keydown', modal.broadcastEnter);

        //Wait for template and resolves to resolve
        $q.all([
          getTemplatePromise(options.template, options.templateUrl),
        ].concat(getResolvePromises(options.resolve)))
          .then(function(resolves) {

            //Get template content
            modal.content = resolves.shift();

            //Determine modal scope and link close/dismiss handlers
            modal.scope = (options.scope || $rootScope).$new();
            modal.scope.$close = modalInstance.close;
            modal.scope.$dismiss = modalInstance.dismiss;

            //Controller given?
            if (options.controller) {

              //Initialize controller vars
              let locals = {};

              //Provide scope and modal instance
              locals.$scope = modal.scope;
              locals.$modalInstance = modalInstance;

              //Provide other passed locals
              if (options.locals && typeof options.locals === 'object') {
                angular.forEach(options.locals, function(value, key) {
                  locals[key] = value;
                });
              }

              //Provide resolved values
              angular.forEach(options.resolve, function(value, key) {
                locals[key] = resolves.shift();
              });

              //Create controller instance
              modal.controller = $controller(options.controller, locals);
              if (options.controllerAs) {
                modal.scope[options.controllerAs] = modal.controller;
              }
            }

            //Close others?
            if (closeOthers) {
              Modal.closeAll();
            }

            //Open modal now
            openModal(modalInstance);
          })
          .catch(function(reason) {
            modal.openedDeferred.reject(reason);
            modal.resultDeferred.reject(reason);
          });

        //Return modal instance
        return modalInstance;
      },

      /**
       * Close all modals
       */
      closeAll: function() {
        let stack = $modalStack.get();
        angular.forEach(stack, function(modalInstance) {
          closeModal(modalInstance, 'cancel', true);
        });
      },

      /**
       * Check if a specific modal is open
       */
      isOpen: function(name) {
        return $modalStack.isOpen(name);
      },
    };

    //Return the service
    return Modal;
  };
});
