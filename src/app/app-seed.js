'use strict';

/**
 * @function app.core.seed
 * @inner
 * @desc `seed` is an implicit function which runs on application startup to
 * initialize all marked DOM nodes to map instances
 */
angular.element(document)
    .ready(() => {
        'use strict';
        // NOTE: let and const cannot be used in this file due to protractor problems

        // The app nodes in the dom
        window.RV._nodes.forEach(node => {

            // load shell templateUrl into the node
            // we need to create an explicit child under app's root node, otherwise animation
            // doesnt' work; see this plunk: http://plnkr.co/edit/7EIM71IOwC8h1HdguIdD
            // or this one: http://plnkr.co/edit/Ds8e8d?p=preview
            node.appendChild(angular.element('<rv-shell class="md-body-1">')[0]);

            // bootstrap each node as an Angular app
            // strictDi enforces explicit dependency names on each component: ngAnnotate should find most automatically
            // this checks for any failures; to fix a problem add 'ngInject'; to the function preamble
            angular.bootstrap(node, ['app'], {
                strictDi: false
            });
        });
    });
