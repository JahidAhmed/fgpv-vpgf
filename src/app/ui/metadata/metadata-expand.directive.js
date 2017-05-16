const templateUrl = require('./metadata-expand.html');

/**
 * @module rvMetadataExpand
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `rvMetadataExpand` directive allows metadata to be expanded into a modal box when
 * the expand button is clicked.
 *
 */
angular
    .module('app.ui')
    .directive('rvMetadataExpand', rvMetadataExpand);

/**
 * `rvMetadataExpand` directive body.
 *
 * @function  rvMetadataExpand
 * @return {object} directive body
 */
function rvMetadataExpand() {
    const directive = {
        restrict: 'E',
        templateUrl,
        scope: {},
        controller: Controller,
        controllerAs: 'self',
        bindToController: true
    };

    return directive;
}

function Controller(stateManager, $mdDialog, storageService) {
    'ngInject';
    const self = this;

    self.expandPanel = expandPanel;

    function expandPanel() {
        $mdDialog.show({
            controller: (display, cancel) => {
                const self = this;

                self.display = display;
                self.cancel = cancel;
            },
            locals: {
                display: stateManager.display.metadata,
                cancel: $mdDialog.cancel
            },
            templateUrl: 'app/ui/metadata/metadata-modal.html',
            clickOutsideToClose: true,
            escapeToClose: true,
            controllerAs: 'self',
            disableParentScroll: false,
            bindToController: true,
            parent: storageService.panels.shell
        });
    }
}
