(() => {
    'use strict';

    /**
     * @module LayerBlueprintUserOptions
     * @memberof app.geo
     * @requires dependencies
     * @description
     *
     * The `LayerBlueprintUserOptions` service returns a collection of file option classes. These specify user selectable options when importing layer.
     *
     */
    angular
        .module('app.geo')
        .factory('layerSource', layerSource);

    function layerSource($q, gapiService, Geo, LayerSourceInfo, ConfigObject, configService) {
        const ref = {
            idCounter: 0, // layer counter for generating layer ids
            serviceType: Geo.Service.Types
        }

        const service = {
            fetchServiceInfo,
            fetchFileInfo
        };

        const serviceType = Geo.Service.Types;

        return service;

        /**
         * Get service info from the supplied url. Service info usually include information like service type, name, available fields, etc.
         * TODO: there is a lot of workarounds since wms layers need special handling, and it's not possible to immediately detect if the layer is not a service endpoint .
         */
        function fetchServiceInfo(serviceUrl) {

            const fetchPromise = gapiService.gapi.layer.ogc.parseCapabilities(serviceUrl)
                .then(data => {
                    if (data.layers.length > 0) { // if there are layers, it's a wms layer
                        return _parseCapabilitiesAsWMS(data);
                    } else {
                        return gapiService.gapi.layer.predictLayerUrl(serviceUrl).then(serviceInfo =>
                            _parseAsSomethingElse(serviceInfo));
                    }
                })
                .catch(error =>
                    $q.reject(error));

            return fetchPromise;

            function _parseAsSomethingElse(serviceInfo) {
                if (serviceInfo.serviceType === Geo.Service.Types.Error) {
                    // this is not a service URL;
                    // in some cases, if URL is not a service URL, dojo script used to interogate the address
                    // will throw a page-level error which cannot be caught; in such cases, it's not clear to the user what has happened;
                    // timeout error will eventually be raised and this block will trigger
                    // TODO: as a workaround, block continue button until interogation is complete so users can't click multiple times, causing multiple checks
                    return $q.reject(serviceInfo); // reject promise if the provided url cannot be accessed

                } else if (serviceInfo.serviceType === Geo.Service.Types.RasterLayer) {
                    return _parseAsRaster(serviceInfo);
                } else if (serviceInfo.serviceType === Geo.Service.Types.DynamicService) {
                    return _parseAsDynamic(serviceInfo);
                } else if (serviceInfo.serviceType === Geo.Service.Types.FeatureLayer) {
                    return _parseAsFeature(serviceInfo);
                } else if (serviceInfo.serviceType === Geo.Service.Types.TileService) {
                    return _parseAsTile(serviceInfo);
                } else {
                    throw Error('BBBB feck');
                }
            }

            function _predictAsDynamic(serviceUrl) {
                const layerId = serviceUrl.split('/').pop(); // get layer ID

                // remove the layer id so we get a dynamic service instead
                serviceUrl = serviceUrl.substring(0, serviceUrl.lastIndexOf('/'));

                // get a dynamic service prediction (with the raster layer as one of its layers)
                return gapiService.gapi.layer.predictLayerUrl(serviceUrl, Geo.Service.Types.DynamicService)
                    .then(data => ({
                        data,
                        layerInfo: _parseAsDynamic(data),
                        layerId: parseInt(layerId)
                    }));
            }

            function _parseAsRaster(data) {
                const doublePrediction = _predictAsDynamic(serviceUrl)
                    .then(({ layerInfo: [dynamicLayerInfo], layerId, data }) => {
                        dynamicLayerInfo.config.layerEntries = [dynamicLayerInfo.layers.find(layer =>
                            layer.index === layerId)];

                        // create another layer info
                        const rasterLayerList = flattenDynamicLayerList(data.layers)
                            .filter(layer =>
                                layer.index === layerId)
                            .map(layerEntry =>
                                (new ConfigObject.layers.DynamicLayerEntryNode(layerEntry)));

                        const rasterLayerConfig = new ConfigObject.layers.DynamicLayerNode({
                            id: `${Geo.Layer.Types.ESRI_RASTER}#${++ref.idCounter}`,
                            url: serviceUrl,
                            layerType: Geo.Layer.Types.ESRI_DYNAMIC,
                            name: data.name,
                            layerEntries: rasterLayerList
                        });

                        const rasterLayerInfo = new LayerSourceInfo.RasterServiceInfo(rasterLayerConfig);

                        return [rasterLayerInfo, dynamicLayerInfo];
                    });

                return doublePrediction;
            }

            function _parseCapabilitiesAsWMS(data) {
                RV.logger.log('layerBlueprint', `the url ${serviceUrl} is a WMS`);

                // it is mandatory to set featureInfoMimeType attribute to get fct identifyOgcWmsLayer to work.
                // get the first supported format available in the GetFeatureInfo section of the Capabilities XML.
                const formatType = Object.values(data.queryTypes)
                    .filter(format =>
                        typeof format === 'string')
                    .find(format =>
                        format in Geo.Layer.Ogc.INFO_FORMAT_MAP);

                const wmsLayerList = _flattenWmsLayerList(data.layers)
                    .map(layerEntry =>
                        (new ConfigObject.layers.WMSLayerEntryNode(layerEntry)));

                const layerConfig = new ConfigObject.layers.WMSLayerNode({
                    id: `${Geo.Layer.Types.OGC_WMS}#${++ref.idCounter}`,
                    url: serviceUrl,
                    layerType: Geo.Layer.Types.OGC_WMS,
                    name: serviceUrl,
                    layerEntries: [],
                    featureInfoMimeType: formatType
                });

                const layerInfo = new LayerSourceInfo.WMSServiceInfo(layerConfig, wmsLayerList);

                return [layerInfo];
            }

            function _parseAsFeature(data) {
                const layerConfig = new ConfigObject.layers.FeatureLayerNode({
                    id: `${Geo.Layer.Types.ESRI_FEATURE}#${++ref.idCounter}`,
                    url: serviceUrl,
                    layerType: Geo.Layer.Types.ESRI_FEATURE,
                    name: data.name
                });

                const featureLayerInfo = new LayerSourceInfo.FeatureServiceInfo(layerConfig, data.fields);

                const doublePrediction = _predictAsDynamic(serviceUrl)
                    .then(({ layerInfo: [dynamicLayerInfo], layerId }) => {
                        dynamicLayerInfo.config.layerEntries = [dynamicLayerInfo.layers.find(layer =>
                            layer.index === layerId)];

                        return [featureLayerInfo, dynamicLayerInfo];
                    });

                return doublePrediction;
            }

            function _parseAsDynamic(data) {
                const dynamicLayerList = flattenDynamicLayerList(data.layers)
                    .map(layerEntry =>
                        (new ConfigObject.layers.DynamicLayerEntryNode(layerEntry)));

                const layerConfig = new ConfigObject.layers.DynamicLayerNode({
                    id: `${Geo.Layer.Types.ESRI_DYNAMIC}#${++ref.idCounter}`,
                    url: serviceUrl,
                    layerType: Geo.Layer.Types.ESRI_DYNAMIC,
                    name: data.name,
                    layerEntries: []
                });

                const layerInfo = new LayerSourceInfo.DynamicServiceInfo(layerConfig, dynamicLayerList);

                return [layerInfo];
            }

            function _parseAsTile(data) {
                const layerConfig = new ConfigObject.layers.BasicLayerNode({
                    id: `${Geo.Layer.Types.ESRI_TILE}#${++ref.idCounter}`,
                    url: serviceUrl,
                    layerType: Geo.Layer.Types.ESRI_TILE,
                    name: data.name
                });

                const layerInfo = new LayerSourceInfo.TileServiceInfo(layerConfig);

                return [layerInfo];
            }

            /**
             * This flattens wms array hierarchy into a flat list to be displayed in a drop down selector
             * TODO: this is temporary, possibly, as we want to provide user with an actual tree to select from
             * @param  {Array} layers array of layer objects
             * @param  {Number} level  =             0 tells how deep the layer is in the hierarchy
             * @return {Array}        layer list
             */
            function _flattenWmsLayerList(layers, level = 0) {
                return [].concat.apply([], layers.map(layer => {
                    layer.level = level;
                    layer.indent = Array.from(Array(level)).fill('-').join('');

                    if (layer.layers.length > 0) {
                        return [].concat(layer, _flattenWmsLayerList(layer.layers, ++level));
                    } else {
                        return layer;
                    }
                }));
            }

            /**
             * This calculates relative depth of the dynamic layer hierarchy on the provided flat list of layers
             * TODO: this is temporary, possibly, as we want to provide user with an actual tree to select from
             * @return {Array} layer list
             */
            function flattenDynamicLayerList(layers) {
                return layers.map(layer => {
                    const level = calculateLevel(layer, layers);

                    layer.level = level;
                    layer.indent = Array.from(Array(level)).fill('-').join('');
                    layer.index = layer.id;

                    return layer;
                });

                function calculateLevel(layer, layers) {
                    if (layer.parentLayerId === -1) {
                        return 0;
                    } else {
                        return calculateLevel(layers[layer.parentLayerId], layers) + 1;
                    }
                }
            }
        }

        function fetchFileInfo(path, file, progressCallback = angular.noop) {
            const fetchPromise = gapiService.gapi.layer.predictLayerUrl(path)
                .then(fileInfo => {
                    // fileData is returned only if path is a url; if it's just a file name, only serviceType is returned                            this.fileData = fileInfo.fileData;
                    this.layerType = Geo.Layer.Types.ESRI_FEATURE;
                    this.fileType = fileInfo.serviceType;

                    // error type means the file cannot be accessed
                    if (this.fileType === Geo.Service.Types.Error) {
                        throw new Error('Cannot retrieve file data');
                    }

                    const layerConfig = new ConfigObject.layers.FeatureLayerNode({
                        id: `${Geo.Layer.Types.ESRI_FEATURE}-file#${++ref.idCounter}`,
                        url: path,
                        layerType: Geo.Layer.Types.ESRI_FEATURE,
                        name: typeof file !== 'undefined' ? file.name : path
                    });

                    // load file data and return generated file options
                    return _loadFileData(fileInfo).then(rawData => {
                        const targetWkid = configService._sharedConfig_.map.body.spatialReference.wkid

                        // upfront validation is expensive and time consuming - create all file options and let the user decide, then validate
                        const fileInfoOptions = [
                            new LayerSourceInfo.CSVFileInfo(layerConfig, rawData, targetWkid),
                            new LayerSourceInfo.GeoJSONFileInfo(layerConfig, rawData, targetWkid),
                            new LayerSourceInfo.ShapefileFileInfo(layerConfig, rawData, targetWkid)
                        ];

                        const preselectedIndex = fileInfo.serviceType ?
                            fileInfoOptions.findIndex(option =>
                                option.type === fileInfo.serviceType) :
                            0;

                        return {
                            options: fileInfoOptions,
                            preselectedIndex
                        };
                    });
                });

            return fetchPromise;

            function _loadFileData(fileInfo) {
                // if there is file object, read it and store the data
                if (typeof file !== 'undefined') {
                    return _readFile(file, progressCallback);

                } else if (typeof fileInfo.fileData !== 'undefined') {
                    return fileInfo.fileData

                } else {
                    throw new Error('Cannot retrieve file data');
                }
            }

            /**
             * Reads HTML5 File object data.
             * @private
             * @param {File} file a file object to read
             * @param {Function} progressCallback a function which is called during the process of reading file indicating how much of the total data has been read
             * @return {Promise}      promise resolving with file's data
             */
            function _readFile(file, progressCallback) {
                const dataPromise = $q((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => {
                        RV.logger.error('layerBlueprint', 'failed to read a file');
                        reject('Failed to read a file');
                    };
                    reader.onload = () =>
                        resolve(reader.result);
                    reader.onprogress = event =>
                        progressCallback(event);

                    reader.readAsArrayBuffer(file);
                });

                return dataPromise;
            }
        }


    }
})();
