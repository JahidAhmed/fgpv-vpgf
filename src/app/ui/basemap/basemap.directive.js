(() => {
    'use strict';

    /**
     * @module rvBasemap
     * @memberof app.ui.basemap
     * @restrict E
     * @description
     *
     * The `rvBasemap` directive displays a basemap selector. Its template uses a content pane which is loaded into the `other` panel opening on the right side of the screen. Selector groups basemaps by projection.
     *
     */
    angular
        .module('app.ui.basemap')
        .directive('rvBasemap', rvBasemap);

    function rvBasemap() {
        const directive = {
            restrict: 'A',
            controller: Controller,
            controllerAs: 'self',
            bindToController: true
        };

        return directive;
    }

    function Controller(geoService, basemapService) {
        'ngInject';
        const self = this;

        // TODO: update when config is typed
        // TODO: wait on config ready event
        self.geoService = geoService;

        // self.basemaps = geoService._map.basemaps;
        // self.tileSchemas = geoService._map.tileSchemas;

        // self.selectBasemap = basemapService.selectBasemap;
        self.closeSelector = basemapService.close;

        // TODO: remove
        basemapService.open();

        //self.minimize = basemapService.close;

        /*basemapService.setOnChangeCallback((projs, selectedBM) => {
            self.projections = projs;
            self.selectedWkid = selectedBM.wkid;
        });

        self.select = bm => {
            basemapService.select(bm);
            self.selectedWkid = basemapService.getSelected().wkid;
        };*/
    }
})();
