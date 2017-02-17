(() => {
    'use strict';

    /**
     * @module rvSettingsContent
     * @memberof app.ui
     * @restrict E
     * @description
     *
     * The `rvSettingsContent` directive renders the data content of details.
     * To improve efficency a document fragment is first created prior to
     * DOM insertion.
     *
     */
    angular
        .module('app.ui')
        .directive('rvSettingsContent', rvSettingsContent);

    /**
     * `rvSettingsContent` directive body.
     *
     * @function rvSettingsContent
     * @return {object} directive body
     */
    function rvSettingsContent() {
        const directive = {
            restrict: 'E',
            templateUrl: 'app/ui/settings/settings-content.html',
            scope: {
                block: '='
            },
            controller: () => {},
            controllerAs: 'self',
            bindToController: true
        };

        return directive;
    }
})();
