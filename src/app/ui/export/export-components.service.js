/**
 * @module exportComponentsService
 * @memberof app.ui
 * @requires dependencies
 * @description
 *
 * The `exportComponentsService` service handles available map export componets.
 *
 */
angular
    .module('app.ui')
    .factory('exportComponentsService', exportComponentsService);

function exportComponentsService($q, ExportComponent, configService, exportSizesService,
    exportLegendService, graphicsService, exportGenerators) {

    // these are initial configs for the default map export components; all default values are being filled by the ExportComponent constructor class
    const initialExportConfig = {
        title: {
            generators: [exportGenerators.titleGenerator],
            value: '',
            isVisible: false
        },
        map: {
            generators: [
                exportGenerators.mapDummyGenerator,
                exportGenerators.mapLocalGenerator,
                exportGenerators.mapServerGenerator],
            graphicOrder: [0, 2, 1]
        },
        mapelements: {
            generators: [exportGenerators.scalebarGenerator, exportGenerators.northarrowGenerator]
        },
        legend: {
            generators: [exportGenerators.legendGenerator]
        },
        footnote: {
            value: '',
            generators: [exportGenerators.footnoteGenerator]
        },
        timestamp: {
            generators: [exportGenerators.timestampGenerator],
            isVisible: false
        }
    };

    // indicates the order of the components, top to bottom
    const componentOrder = ['title', 'map', 'mapelements', 'legend', 'footnote', 'timestamp'];

    const service = {
        items: null,

        init,
        update,
        get
    };

    return service;

    /**
     * Generates (or regenerates) the graphics from all export components after they initialized.
     * @function update
     * @param {Function} showToast [optional = angular.noop] a function to show notification toasts in the export dialog
     */
    function update(showToast = angular.noop) {

        init().then(() => {
            service.items.forEach(item =>
                item.generate(exportSizesService.selectedOption, showToast, true));
        });

        return service;
    }

    /**
     * Creates ExportComponents using values from the config.
     *
     * @function init
     * @param {Boolean} force [optional = false] inidicates that export components will be created anew, all setting will be reset to defaults; the config will be read again; this should be used after switching being different config files
     */
    function init(force = false) {
        let initPromise;

        // TODO: if config changed (like changing language or loading from a bookmark, need to reenable export components)
        if (service.items === null || force) {
            service.items = [];

            initPromise = configService.getAsync.then(config => {
                const newConfig = angular.merge({}, initialExportConfig, config.export);

                componentOrder.forEach(id => {
                    const componentConfig = newConfig[id];
                    service.items.push(new ExportComponent(id, componentConfig));
                });
            });
        } else {
            initPromise = $q.resolve();
        }

        return initPromise;
    }

    /**
     * Returns an ExportComponent with the specified name.
     *
     * @function get
     * @param {String} id the internal name of the component
     * @return {ExportComponent} component with the specified id
     */
    function get(id) {
        return service.items.find(c =>
            c.id === id);
    }
}
