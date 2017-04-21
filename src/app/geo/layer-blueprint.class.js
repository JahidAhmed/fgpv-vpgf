(() => {
    'use strict';

    /**
     * @module LayerBlueprintFactory
     * @memberof app.geo
     * @requires dependencies
     * @description
     *
     * The `LayerBlueprint` service returns `LayerBlueprint` class which abstracts common elements of layer creating (either from file or online servcie).
     * The `LayerServiceBlueprint` service returns `LayerServiceBlueprint` class to be used when creating layers from online services (supplied by config, RCS or user added).
     * The `LayerFileBlueprint` service returns `LayerFileBlueprint` class to be used when creating layers from user-supplied files.
     *
     */
    angular
        .module('app.geo')
        .factory('LayerBlueprint', LayerBlueprintFactory);

    function LayerBlueprintFactory($q, $http, LayerBlueprintUserOptions, gapiService, Geo,
        layerDefaults, LayerRecordFactory, ConfigObject, common) {

        let idCounter = 0; // layer counter for generating layer ids

        // destructure Geo into `layerTypes` and `serviceTypes`
        const { Layer: { Types: layerTypes }, Service: { Types: serviceTypes } } = Geo;

        class LayerBlueprint {
            /**
             * Creates a new LayerBlueprint.
             * @param  {Object} initialConfig partial config, can be an empty object.
             * @param  {Function} epsgLookup a function which takes and EPSG code and returns a projection definition (see geoService for the exact signature)
             */
            constructor(source, layerType) {
                // this.initialConfig = this._applyLayerDefaults(source);

                // this._source = this._applyLayerDefaults(source);
                // this._config = new LayerBlueprint.LAYER_TYPE_TO_LAYER_NODE[this._source.layerType](this._source);


                // this._epsgLookup = epsgLookup;

                /* if (typeof initialConfig !== 'undefined') {
                    this.initialConfig = initialConfig;
                    this.config = angular.merge({}, initialConfig);
                }

                this._applyDefaults();

                this._userOptions = {};*/
            }

            // get id () { return this.isReady ? this.config.id : '?'; }

            get config () { return this._config; }

            /**
             * @returns {Object} layer node source config object with applied defaults
             */
            get source () { return this._source; }
            setSource (value) {
                if (this._source) {
                    console.warn('source is already set');
                    return;
                }

                // this._source = this._applyLayerDefaults(value);
                this._source = value;
                this._config = new LayerBlueprint.LAYER_TYPE_TO_LAYER_NODE[this._source.layerType](this._source);

                // resolving construction promise to signal
                // this._constructorPromiseResolve();
            }

            /**
             * Fills in the missing values in controls, disabledControls, userDisabledControls, and state with defaults.
             * @function _applyLayerDefaults
             * @private
             * @param {Object} source JSON object of the layer defintion from the config
             * @return {Object} a copy of the source with filled-in defaults; the original object is not modified
             */
            _applyLayerDefaults(source) {
                const defaults = ConfigObject.DEFAULTS.layer[source.layerType];

                const sourceCopy = angular.copy(source);

                // taking the default state and overriding any options that are specified in the config
                // this is moved to the layer class
                // TODO: remove after geoapi can accept config instead of layer source
                sourceCopy.state = angular.extend({}, defaults.state, sourceCopy.state);

                if (typeof sourceCopy.controls === 'undefined') {
                    sourceCopy.controls = angular.copy(defaults.controls);
                } else {
                    sourceCopy.controls = common.intersect(sourceCopy.controls, defaults.controls);
                }

                if (typeof sourceCopy.disabledControls === 'undefined') {
                    sourceCopy.disabledControls = angular.copy(defaults.disabledControls);
                } else {
                    sourceCopy.disabledControls = common.intersect(sourceCopy.disabledControls, defaults.controls);
                }

                // userDisabledControls cannot be specified in schema, using straight defaults
                sourceCopy.userDisabledControls = angular.copy(defaults.userDisabledControls);

                // remove metadata control if no metadata url is specified after applying defaults
                if (!sourceCopy.metadataUrl) {
                    common.removeFromArray(sourceCopy.controls, 'metadata');
                }

                return sourceCopy;
            }

            /**
             * Applies layer defaults based on the layer type.
             */
            _applyDefaults() {
                if (this.layerType !== null) {
                    const defaults = layerDefaults[this.layerType];

                    // TODO: add defautls for wms and dynamic layerEntries
                    // this is mostly useless right now since we apply defaults in `legend-entry` service
                    this.config.options = angular.merge({}, defaults.options, this.initialConfig.options);
                    this.config.flags = angular.merge({}, defaults.flags, this.initialConfig.flags);
                }
            }

            /**
             * Returns layer type or null if not set of the blueprint.
             * @return {String|null} layer type as String or null
             */
            get layerType() {
                return (typeof this.config.layerType !== 'undefined') ? this.config.layerType : null;
            }

            /**
             * Sets layer type.
             * @param  {String} value layer type as String
             */
            set layerType(value) {
                // apply config defaults when setting layer type
                this.config.layerType = value;
                this._applyDefaults();

                // generate id if missing when generating layer
                if (typeof this.config.id === 'undefined') {
                    this.config.id = `${this.layerType}#${idCounter++}`;
                }
            }

            /**
             * Returns a constructor promise which resolves when file or service data is loaded and read in.
             * @return {Promise} constructor promise
             */
            get ready() { return    $q.resolve(); }

            /**
             * Returns user layer options class instance or a plain object if type is not yet set.
             * @return {Object} user options
             */
            get userOptions() { return this._userOptions; }

            /**
             * Returns fields found in the blueprint.
             * @return {Array|null} array of fields in the form of [{ name: "Long", type: "esriFieldTypeString"}]
             */
            get fields() { throw new Error(`Access fields on a subclass instead.`); }

            validate() { throw new Error(`Call validate on a subclass instead.`); }

            /**
             * Generates a layer object. This is a stub function to be fully implemented by subcalasses.
             * @return {Object} "common config" ? witch contains layer id
             */
            generateLayer() {
                throw new Error('Call generateLayer on a subclass instead.');
            }

            static LAYER_TYPE_TO_LAYER_NODE = {
                [layerTypes.ESRI_TILE]: ConfigObject.layers.BasicLayerNode,
                [layerTypes.ESRI_FEATURE]: ConfigObject.layers.FeatureLayerNode,
                [layerTypes.ESRI_IMAGE]: ConfigObject.layers.BasicLayerNode,
                [layerTypes.ESRI_DYNAMIC]: ConfigObject.layers.DynamicLayerNode,
                [layerTypes.OGC_WMS]: ConfigObject.layers.WMSLayerNode
            };

            static get LAYER_TYPE_TO_LAYER_RECORD () {
                const gapiLayer = gapiService.gapi.layer;

                return {
                    [layerTypes.ESRI_TILE]: gapiLayer.createTileRecord,
                    [layerTypes.ESRI_FEATURE]: gapiLayer.createFeatureRecord,
                    [layerTypes.ESRI_IMAGE]: gapiLayer.createImageRecord,
                    [layerTypes.ESRI_DYNAMIC]: gapiLayer.createDynamicRecord,
                    [layerTypes.OGC_WMS]: gapiLayer.createWmsRecord
                }
            }

            static SERVICE_TYPE_TO_LAYER_TYPE = {
                [serviceTypes.FeatureLayer]: layerTypes.ESRI_FEATURE,
                [serviceTypes.DynamicService]: layerTypes.ESRI_DYNAMIC,
                [serviceTypes.RasterLayer]: layerTypes.ESRI_DYNAMIC,
                [serviceTypes.TileService]: layerTypes.ESRI_TILE,
                [serviceTypes.ImageService]: layerTypes.ESRI_IMAGE,
                [serviceTypes.WMS]: layerTypes.OGC_WMS
            };
        }

        const serviceTypeToLayerType = {
            [Geo.Service.Types.FeatureLayer]: Geo.Layer.Types.ESRI_FEATURE,
            [Geo.Service.Types.DynamicService]: Geo.Layer.Types.ESRI_DYNAMIC,
            [Geo.Service.Types.RasterLayer]: Geo.Layer.Types.ESRI_DYNAMIC,
            [Geo.Service.Types.TileService]: Geo.Layer.Types.ESRI_TILE,
            [Geo.Service.Types.ImageService]: Geo.Layer.Types.ESRI_IMAGE,
            [Geo.Service.Types.WMS]: Geo.Layer.Types.OGC_WMS
        };

        // mappings
        /*const LAYER_TYPE_TO_LAYER_RECORD = {
            [layerTypes.ESRI_TILE]: 'createTileRecord',
            [layerTypes.ESRI_FEATURE]: 'createFeatureRecord',
            [layerTypes.ESRI_IMAGE]: 'createImageRecordBuilder',
            [layerTypes.ESRI_DYNAMIC]: 'createDynamicRecord',
            [layerTypes.OGC_WMS]: 'createWmsRecordBuilder'
        };*/

        class LayerServiceBlueprint extends LayerBlueprint {
            /**
             * Creates a new LayerServiceBlueprint.
             * @param  {Object|String} source fully-formed layer config object or url string
             */
            constructor(source) {

                super();

                if (!angular.isString(source)) {
                    // assuming a wellformed layer defintion object is supplied
                    this.setSource(source);
                }

                return;

                /*if (typeof initialConfig.url === 'undefined') {
                    // TODO: throw error ?
                    console.error('Service layer needs a url.');
                    return;
                } else if (initialConfig.layerType === Geo.Layer.Types.FeatureLayer) {
                    // `replace` strips trailing slashes. Assists in plucking index off url.
                    initialConfig.url = initialConfig.url.replace(/\/+$/, '');
                }

                super(initialConfig, epsgLookup);

                this._serviceType = null;
                this._serviceInfo = null;

                // if layerType is no specified, this is a user added layer; otherwise blueprint creation is deemed completed
                // call GeoApi to predict its type
                this._constructorPromise = this.layerType !== null ? $q.resolve() : this._fetchServiceInfo();*/
            }

            setConfig (value) {
                this._config = value;
            }

            /**
             * Get service info from the supplied url. Service info usually include information like service type, name, available fields, etc.
             * TODO: there is a lot of workarounds since wms layers need special handling, and it's not possible to immediately detect if the layer is not a service endpoint .
             */
            /*_fetchServiceInfo() {
                const hint = this._serviceInfo !== null ? this._serviceInfo.serviceType : undefined;

                // due to #702, wms detection is problematic; here are some workarounds
                // TODO: refactor when abovementioned issue is resolved
                return $q.resolve(gapiService.gapi.layer.ogc.parseCapabilities(this.config.url))
                    .then(data => {
                        if (data.layers.length > 0) { // if there are layers, it's a wms layer
                            RV.logger.log('layerBlueprint', `the url ${this.config.url} is a WMS`);

                            // it is mandatory to set featureInfoMimeType attribute to get fct identifyOgcWmsLayer to work.
                            // get the first supported format available in the GetFeatureInfo section of the Capabilities XML.
                            const formatType = Object.values(data.queryTypes)
                                .filter(format => typeof format === 'string')
                                .find(format => format in Geo.Layer.Ogc.INFO_FORMAT_MAP);

                            const featInfoMimeType = { featureInfoMimeType: formatType };
                            Object.assign(this.config, featInfoMimeType);

                            // return an object resembling fileInfo object returned by GeoApi
                            return {
                                serviceType: Geo.Service.Types.WMS,
                                name: this.config.url,
                                layers: flattenWmsLayerList(data.layers)
                            };

                        } else {
                            RV.logger.log('layerBlueprint', `the url ${this.config.url} is not a WMS`);
                            const prediction = gapiService.gapi.layer.predictLayerUrl(this.config.url, hint);

                            // if a raster layer is predicted we switch it to a dynamic service with the raster layer pre-selected
                            return prediction.then(info =>
                                // we may require another call to predictLayerUrl so return a promise
                                 $q(resolve => {
                                    if (info.serviceType === Geo.Service.Types.RasterLayer) {
                                        const layerID = this.config.url.split('/').pop(); // get layer ID
                                        // remove the layer id so we get a dynamic service instead
                                        this.config.url = this.config.url.substring(0,
                                            this.config.url.lastIndexOf('/'));
                                        // auto select the raster layer from the URL
                                        this.config.layerEntries = [{ index: layerID }];
                                        // get a dynamic service prediction (with the raster layer as one of its layers)
                                        gapiService.gapi.layer.predictLayerUrl(this.config.url, hint).then(data => {
                                            info.layers = data.layers;
                                            resolve(info);
                                        });
                                    } else {
                                        resolve(info);
                                    }
                                }));
                        }
                    })
                    .then(fileInfo => {
                        RV.logger.log('layerBlueprint', 'fileInfo', fileInfo);

                        // this is not a service URL;
                        // in some cases, if URL is not a service URL, dojo script used to interogate the address
                        // will throw a page-level error which cannot be caught; in such cases, it's not clear to the user what has happened;
                        // timeout error will eventually be raised and this block will trigger
                        // TODO: as a workaround, block continue button until interogation is complete so users can't click multiple times, causing multiple checks
                        if (fileInfo.serviceType === Geo.Service.Types.Error) {
                            return $q.reject(fileInfo); // reject promise if the provided url cannot be accessed
                        }

                        this._serviceInfo = fileInfo;
                        this.serviceType = this._serviceInfo.serviceType;
                        this.config.name = this._serviceInfo.name;

                        // some custom processing of Dynamic layers to let the user option to pick sublayers
                        if (this.serviceType === Geo.Service.Types.DynamicService) {
                            // change the group layer url to its parent dynamic layer one so data can be fetched properly
                            if (this._serviceInfo.groupIdx !== undefined) {
                                this.config.url = this.config.url.substring(0, this.config.url.lastIndexOf('/'));
                            }

                            flattenDynamicLayerList(this._serviceInfo.layers);
                        }
                    })
                    .catch(error => {
                        this._serviceInfo = null;
                        return $q.reject(error);
                    });

                /**
                 * This flattens wms array hierarchy into a flat list to be displayed in a drop down selector
                 * TODO: this is temporary, possibly, as we want to provide user with an actual tree to select from
                 * @param  {Array} layers array of layer objects
                 * @param  {Number} level  =             0 tells how deep the layer is in the hierarchy
                 * @return {Array}        layer list
                 */
                /*function flattenWmsLayerList(layers, level = 0) {
                    return [].concat.apply([], layers.map(layer => {
                        layer.indent = Array.from(Array(level)).fill('-').join('');

                        if (layer.layers.length > 0) {
                            return [].concat(layer, flattenWmsLayerList(layer.layers, ++level));
                        } else {
                            return layer;
                        }
                    }));
                }*/

                /**
                 * This calculates relative depth of the dynamic layer hierarchy on the provided flat list of layers
                 * TODO: this is temporary, possibly, as we want to provide user with an actual tree to select from
                 * @return {Array} layer list
                 */
                /*function flattenDynamicLayerList(layers) {
                    layers.forEach(layer => {
                        const level = calculateLevel(layer, layers);

                        layer.level = level;
                        layer.indent = Array.from(Array(level)).fill('-').join('');
                    });

                    function calculateLevel(layer, layers) {
                        if (layer.parentLayerId === -1) {
                            return 0;
                        } else {
                            return calculateLevel(layers[layer.parentLayerId], layers) + 1;
                        }
                    }
                }*/
            //}

            /**
             * Returns service type of the service layer blueprint. If type is `Unknown`, returns null for template bindings
             * @return {String|null} service type
             */
            /*get serviceType() {
                if (Geo.Service.Types.Unknown === this._serviceType) {
                    return null;
                }
                return this._serviceType;
            }*/

            /**
             * Sets service type
             * @param  {String} value service type
             */
            //set serviceType(value) { this._serviceType = value; }

            /**
             * Returns fields found in the file data.
             * @return {Array|null} array of fields in the form of [{ name: "Long", type: "esriFieldTypeString"}]
             */
            /*get fields() {
                if (this._serviceInfo !== null) {
                    return this._serviceInfo.fields;
                } else {
                    return null;
                }
            }

            get serviceInfo() {
                return this._serviceInfo;
            }*/

            /**
             * Validates service blueprint against selected service type.
             *
             * @return {Promise} a promise resolving if the validation is successful
             */
            /*validate() {
                // our prediction routine is infallible, so if the user disagrees, too bad :D
                // NOTE: in cases where we can't predict the service type (geoapi returns Unknown), we also cannot validate the service except if we make a layer and add it to the map and see if it loads or not
                return $q((resolve, reject) => {
                    if (this._serviceInfo.serviceType === this.serviceType ||
                        this._serviceInfo.serviceType === Geo.Service.Types.Unknown) {

                        this.layerType = serviceTypeToLayerType[this.serviceType];

                        // for feature layers, apply nameField smart default
                        // TODO: revisit when config objects are typed classes
                        if (this.serviceType === Geo.Service.Types.FeatureLayer && this._serviceInfo.smartDefaults) {
                            this.config.nameField = this._serviceInfo.smartDefaults.primary;
                        }
                        resolve();
                    } else {
                        reject();
                    }
                });
            }*/

            /**
             * Generates a layer from an online service based on the layer type.
             * Takes a layer in the config format and generates an appropriate layer object.
             * @param {Object} layerConfig a configuration fragment for a single layer
             * @return {Promise} resolving with a LayerRecord object matching one of the esri/layers objects based on the layer type
             */
            generateLayer () {

                return LayerBlueprint.LAYER_TYPE_TO_LAYER_RECORD[this.config.layerType](
                    this.config, undefined, epsgLookup);
                // return LayerBlueprint.LAYER_TYPE_TO_LAYER_RECORD[this.source.layerType](this.source);


                //return $q.resolve(LayerRecordFactory.makeServiceRecord(this.config, this._epsgLookup));
            }
        }

        /**
         * Create a LayerFileBlueprint.
         * Retrieves data from the file. The file can be either online or local.
         * @param  {Function} epsgLookup a function which takes and EPSG code and returns a projection definition (see geoService for the exact signature)
         * @param  {Number} targetWkid wkid of the current map object
         * @param  {String} path      either file name or file url; if it's a file name, need to provide a HTML5 file object
         * @param  {File} file      optional: HTML5 file object
         * @return {Function} progressCallback        optional: function to call on progress events druing when reading file
         * @return {String}           service type: 'csv', 'shapefile', 'geojson'
         */
        class LayerFileBlueprint extends LayerBlueprint {
            constructor (layerSource) {
                super();
                this._layerSource = layerSource;
            }

            get config () { return this._layerSource.config; }

            /*constructora(epsgLookup, targetWkid, path, file, progressCallback = angular.noop) { // , extension) {
                // super(undefined, epsgLookup);

                // when passing file object, path is its name
                this._fileName = typeof file !== 'undefined' ? file.name : path;
                this._fileData = null;
                this._formatedFileData = null;
                this._fileType = null;

                this._targetWkid = targetWkid;

                this._constructorPromise = gapiService.gapi.layer.predictLayerUrl(path)
                    .then(fileInfo => {
                        // fileData is returned only if path is a url; if it's just a file name, only serviceType is returned                            this.fileData = fileInfo.fileData;
                        this.layerType = 'esriFeature';
                        this.fileType = fileInfo.serviceType;

                        // error type means the file cannot be accessed
                        if (this.fileType === Geo.Service.Types.Error) {
                            throw new Error('Cannot retrieve file data');
                        }

                        if (typeof file !== 'undefined') {
                            // if there is file object, read it and store the data
                            return this._readFileData(file, progressCallback)
                                .then(fileData =>
                                    (this._fileData = fileData));

                        } else if (typeof fileInfo.fileData !== 'undefined') {
                            this._fileData = fileInfo.fileData;
                            return undefined;

                        } else {
                            throw new Error('Cannot retrieve file data');
                        }
                    });
            }*/

            /**
             * Returns the file type. If type is `Unknown`, returns null for template bindings
             * @return {String|null} file type
             */
            /*get fileType() {
                if (Geo.Service.Types.Unknown === this._fileType) {
                    return null;
                }
                return this._fileType;
            }*/

            /**
             * Sets file type. Setting file type does not triggers file validation.
             * @param  {String} value file type
             */
            //set fileType(value) { this._fileType = value; }

            /**
             * Validates file blueprint against selected file type.
             * @return {Promise} promise resolving if validation successful
             */
            /*validate() {
                return this._constructorPromise
                    .then(() => gapiService.gapi.layer.validateFile(this.fileType, this._fileData))
                    .then(result => {
                        // create user options object based on the layer type
                        const options = new LayerBlueprintUserOptions.File[this.fileType]
                            (this._epsgLookup, this._targetWkid, result.smartDefaults);
                        options.layerName = this._fileName;

                        this._userOptions = options;
                        this._formatedFileData = result;
                    });
            }*/

            /**
             * Returns fields found in the file data. This is used in template bindings.
             * @return {Array|null} array of fields in the form of [{ name: "Long", type: "esriFieldTypeString"}]
             */
            /*get fields() {
                if (this._formatedFileData !== null) {
                    return this._formatedFileData.fields;
                } else {
                    return null;
                }
            }*/

            validateFileLayerSource () {
                // clone data because the makeSomethingLayer functions mangle the config data
                const formattedDataCopy = angular.copy(this._layerSource.formattedData);

                // HACK: supply epsgLookup here;
                // TODO: find a better place for it

                this._layerSource.epsgLookup = epsgLookup;

                const layerFileGenerators = {
                    [Geo.Service.Types.CSV]: () =>
                        gapiService.gapi.layer.makeCsvLayer(formattedDataCopy, this._layerSource),
                    [Geo.Service.Types.GeoJSON]:  () =>
                        gapiService.gapi.layer.makeGeoJsonLayer(formattedDataCopy, this._layerSource),
                    [Geo.Service.Types.Shapefile]:  () =>
                        gapiService.gapi.layer.makeShapeLayer(formattedDataCopy, this._layerSource)
                };

                const layerPromise = layerFileGenerators[this._layerSource.type]();

                layerPromise.then(layer =>
                    (this.__layer__ = layer));

                return layerPromise;
            }

            /**
             * Generate actual esri layer object from the file data, config and user options.
             * @return {Promise} promise resolving with the esri layer object
             */
            generateLayer() {
                // const _clonedFormatedFileData = angular.merge({}, this._formatedFileData);

                // TODO: provide epsgLookup to builder function
                return LayerBlueprint.LAYER_TYPE_TO_LAYER_RECORD[this.config.layerType](this.config, this.__layer__);

                /*return layerPromise.then(layer =>
                    LayerBlueprint.LAYER_TYPE_TO_LAYER_RECORD[this.config.layerType](this.config, esriLayer));*/

                // do angular merge here too so as to not mangle config data

                /*
                // generator functions for different file types
                const layerFileGenerators = {
                    [Geo.Service.Types.CSV]: () =>
                        gapiService.gapi.layer.makeCsvLayer(_clonedFormatedFileData.formattedData, this.userOptions),
                    [Geo.Service.Types.GeoJSON]:  () =>
                        gapiService.gapi.layer.makeGeoJsonLayer(_clonedFormatedFileData.formattedData,
                            this.userOptions),
                    [Geo.Service.Types.Shapefile]:  () =>
                        gapiService.gapi.layer.makeShapeLayer(this._fileData, this.userOptions)
                };

                // set layer id to the config id; this is needed when using file layer generator function
                this.userOptions.layerId = this.config.id;

                // apply user selected layer name to the config so it appears in the legend entry
                this.config.name = this.userOptions.layerName;
                this.config.nameField = this.userOptions.primaryField;

                RV.logger.log('layerBlueprint', 'layer userOptions', this.userOptions);

                const layerPromise = layerFileGenerators[this.fileType]();

                // do angular merge here too so as to not mangle config data
                return layerPromise.then(layer => LayerRecordFactory.makeFileRecord(angular.merge({},
                    this.config), layer));
                */
            }

            /*_applyDefaults() {
                super._applyDefaults();

                // disable reloading for file-based layers
                // TODO: move this option when configs are typed
                if (this.config.options) {
                    this.config.options.reload.enabled = false;
                }
            }*/

            /**
             * Reads HTML5 File object data.
             * @private
             * @param {File} file a file object to read
             * @param {Function} progressCallback a function which is called during the process of reading file indicating how much of the total data has been read
             * @return {Promise}      promise resolving with file's data
             */
            /*_readFileData(file, progressCallback) {
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
            }*/
        }

        /**
         * Lookup a proj4 style projection definition for a given ESPG code.
         * @function epsgLookup
         * @param {string|number} code the EPSG code as a string or number
         * @return {Promise} a Promise resolving to proj4 style definition or null if the definition could not be found
         */
        function epsgLookup(code) {
            // FIXME this should be moved to a plugin; it is hardcoded to use epsg.io

            const urnRegex = /urn:ogc:def:crs:EPSG::(\d+)/;
            const epsgRegex = /EPSG:(\d+)/;
            let lookup = code;
            if (typeof lookup === 'number') {
                lookup = String(lookup);
            }
            const urnMatches = lookup.match(urnRegex);
            if (urnMatches) {
                lookup = urnMatches[1];
            }
            const epsgMatches = lookup.match(epsgRegex);
            if (epsgMatches) {
                lookup = epsgMatches[1];
            }

            return $http.get(`http://epsg.io/${lookup}.proj4`)
                .then(response =>
                    response.data)
                .catch(err => {
                    RV.logger.warn('geoService', 'proj4 style projection lookup failed with error', err);
                    // jscs check doesn't realize return null; returns a promise
                    return null; // jscs:ignore jsDoc
                });
        }

        const service = {
            service: LayerServiceBlueprint,
            file: LayerFileBlueprint
        };

        return service;
    }
})();
