(() => {
    'use strict';

    /**
     * @name configDefaults
     * @constant
     * @memberof app.core
     * @description
     *
     * The `configDefaults` constant service provides default config values.
     */
    /**
     * @name templateRegistry
     * @constant
     * @memberof app.core
     * @description
     *
     * The `templateRegistry` constant service provides template URLs.
     */

    // do not modify the line below without also modifying the build function which fills in the translations
    const AUTOFILLED_TRANSLATIONS = {};

    angular
        .module('app.core')
        .factory('events', events)
        .constant('bookmarkVersions', { // Bookmark versions https://github.com/fgpv-vpgf/fgpv-vpgf/wiki/Bookmark-Formats
            A: 'A',
            B: 'B'
        })
        .constant('translations', AUTOFILLED_TRANSLATIONS)
        .factory('appInfo', appInfo);

    function events($rootScope) {
        return {
            /**
             * A shorthand for $rootScope.$on; no need to inject `$rootScope` separately;
             * @function $on
             * @param {String} eventName event name to listen once
             * @param {Function} listener a callback function to execute
             */
            $on: (eventName, listener) =>
                $rootScope.$on(eventName, listener),

            rvReady: 'rvReady', // Fired when map should be created the first time; should not be broadcasted more then once
            rvApiHalt: 'rvApiHalt', // Fired when API should be put back into 'queue' mode
            rvApiReady: 'rvApiReady', // Fired when API should let calls through
            rvBookmarkInit: 'rvBookmarkInit', // Fired after the bookmark has modified the config

            rvDataPrint: 'rvDataPrint', // these data events should be removed after switching to angular 1.5 or 2 or React
            rvDataExportCSV: 'rvDataExportCSV',

            rvLangSwitch: 'rvLangSwitch', // Fired when language is switch (loadNewLang function)

            rvMapPan: 'rvMapPan',
            rvExtentChange: 'extentChange', // TODO: rename event to `rvExtentChange` and all the instances that use hardcoded `extentChange` instance
            rvMouseMove: 'rvMouseMove', // Fired when mouse move over the map (use to calculate mouse coordinates)
            rvBasemapChange: 'rvBasemapChange', // Fired when basemap is changed

            rvGeosearchClose: 'rvGeosearchClose' // Fire when geosearch close
        };
    }

    // Angular services that have no constructors (services that are just plain objects) are __shared__ across app instances
    // to have it per instance, the appInfo service needs to have some initialization logic
    function appInfo() {
        const service = {
            id: null
            // something else ?
        };

        return service;
    }
})();
