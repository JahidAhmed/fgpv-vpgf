(() => {
    'use strict';

    /**
     * @ngdoc service
     * @name LayerBlueprint
     * @module app.geo
     * @requires dependencies
     * @description
     *
     * The `LayerBlueprint` service returns `LayerBlueprint` class which abstracts common elements of layer creating (either from file or online servcie).
     *
     */
    /**
     * @ngdoc service
     * @name LayerServiceBlueprint
     * @module app.geo
     * @requires dependencies
     * @description
     *
     * The `LayerServiceBlueprint` service returns `LayerServiceBlueprint` class to be used when creating layers from online services (supplied by config, RCS or user added).
     *
     */
    /**
     * @ngdoc service
     * @name LayerFileBlueprint
     * @module app.geo
     * @requires dependencies
     * @description
     *
     * The `LayerFileBlueprint` service returns `LayerFileBlueprint` class to be used when creating layers from user-supplied files.
     *
     */
    angular
        .module('app.geo')
        .factory('LayerBlueprint', LayerBlueprintWrapper)
        .factory('LayerServiceBlueprint', LayerServiceBlueprintWrapper)
        .factory('LayerFileBlueprint', LayerFileBlueprintWrapper);

    function LayerBlueprintWrapper(layerDefaults) {
        let idCounter = 0; // layer counter for generating layer ids

        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        class LayerBlueprint {
            /**
             * Creates a new LayerBlueprint.
             * @param  {Object} initialConfig partial config, can be an empty object.
             */
            constructor(initialConfig) {
                this.initialConfig = {};
                this.config = {};

                if (typeof initialConfig !== 'undefined') {
                    this.initialConfig = initialConfig;
                    this.config = angular.merge({}, initialConfig);
                }

                this._applyDefaults();

                this._userOptions = {};
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

            get userOptions() {
                return this._userOptions;
            }

            /**
             * Generates a layer object. This is a stub function to be fully implemented by subcalasses.
             * @return {Object} "common config" ? witch contains layer id
             */
            generateLayer() {
                throw new Error('Call generateLayer on a subclass instead.');
            }
        }
        // jscs:enable requireSpacesInAnonymousFunctionExpression

        return LayerBlueprint;
    }

    function LayerServiceBlueprintWrapper($q, LayerBlueprint, gapiService, Geo) {
        // generator functions for different layer types
        const layerServiceGenerators = {
            [Geo.Layer.Types.ESRI_DYNAMIC]: (config, commonConfig) =>
                new gapiService.gapi.layer.ArcGISDynamicMapServiceLayer(config.url, commonConfig),

            [Geo.Layer.Types.ESRI_FEATURE]: (config, commonConfig) => {
                commonConfig.mode = config.snapshot ?
                    gapiService.gapi.layer.FeatureLayer.MODE_SNAPSHOT :
                    gapiService.gapi.layer.FeatureLayer.MODE_ONDEMAND;
                return new gapiService.gapi.layer.FeatureLayer(config.url, commonConfig);
            },

            [Geo.Layer.Types.ESRI_IMAGE]: (config, commonConfig) =>
                new gapiService.gapi.layer.ArcGISImageServiceLayer(config.url, commonConfig),

            [Geo.Layer.Types.ESRI_TILE]: (config, commonConfig) =>
                new gapiService.gapi.layer.TileLayer(config.url, commonConfig),

            [Geo.Layer.Types.OGC_WMS]: (config, commonConfig) => {
                commonConfig.visibleLayers = config.layerEntries.map(le => le.id);
                return new gapiService.gapi.layer.ogc.WmsLayer(config.url, commonConfig);
            }
        };

        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        class LayerServiceBlueprint extends LayerBlueprint {
            /**
             * Creates a new LayerServiceBlueprint.
             * @param  {initialConfig} initialConfig partical config, __must__ contain a service `url`.
             */
            constructor(initialConfig) {
                if (typeof initialConfig.url === 'undefined') {
                    // TODO: throw error ?
                    console.error('Service layer needs a url.');
                    return;
                } else {
                    // `replace` strips trailing slashes
                    initialConfig.url = initialConfig.url.replace(/\/+$/, '');
                }

                super(initialConfig);

                // if layerType is no specified, this is likely a user added layer
                // call geoApi to predict its type
                if (this.layerType === null) {
                    return gapiService.gapi.layer.predictLayerUrl(this.config.url)
                        .then(fileInfo => fileInfo.serviceType)
                        .catch(error => console.error('Something happened', error));
                }
            }

            /**
             * Generates a layer from an online service based on the layer type.
             * Takes a layer in the config format and generates an appropriate layer object.
             * @param {Object} layerConfig a configuration fragment for a single layer
             * @return {Promise} resolving with a layer object matching one of the esri/layers objects based on the layer type
             */
            generateLayer() {
                const commonConfig = {
                    id: this.config.id
                };

                // TODO: throw error if layer type is not defined

                if (layerServiceGenerators.hasOwnProperty(this.layerType)) {
                    return $q.resolve(layerServiceGenerators[this.layerType](this.config, commonConfig));
                } else {
                    throw new Error('The layer type is not supported');
                }
            }
        }
        // jscs:enable requireSpacesInAnonymousFunctionExpression

        return LayerServiceBlueprint;
    }

    function LayerFileBlueprintWrapper($q, LayerBlueprint, LayerBlueprintUserOptions, Geo, gapiService) {

        // generator functions for different file types
        const layerFileGenerators = {
            [Geo.Service.Types.csv]: (data, commonConfig) =>
                gapiService.gapi.layer.makeCsvLayer(this._formatedFileData.formattedData, commonConfig),
            [Geo.Service.Types.geojson]:  (data, commonConfig) =>
                gapiService.gapi.layer.makeGeoJsonLayer(this._formatedFileData.formattedData, commonConfig),
            [Geo.Service.Types.shapefile]:  (data, commonConfig) =>
                gapiService.gapi.layer.makeShapeLayer(this._formatedFileData.formattedData, commonConfig),
        };

        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        /**
         * Createa a LayerFileBlueprint.
         * Retrieves data from the file. The file can be either online or local.
         * @param  {String} path      either file name or file url; if it's a file name, need to provide a HTML5 file object
         * @param  {File} file      optional: HTML5 file object
         * @param  {String} extension optional: file extension ??
         * @return {String}           service type: 'csv', 'shapefile', 'geojosn'
         */
        class LayerFileBlueprint extends LayerBlueprint {
            constructor(path, file) { // , extension) {
                super();

                this._fileData = null;
                this._formatedFileData = null;

                // empty blueprint is not valid by default
                this._validPromise = $q.reject();

                this._constructorPromise = gapiService.gapi.layer.predictLayerUrl(path)
                    .then(fileInfo => {
                        // fileData is returned only if path is a url; if it's just a file name, only serviceType is returned                            this.fileData = fileInfo.fileData;
                        this.layerType = 'esriFeature';
                        this.fileType = fileInfo.serviceType;

                        if (typeof file !== 'undefined') {
                            // if there is file object, read it and store the data
                            return this._readFileData(file)
                                .then(fileData => this._fileData = fileData);
                        } else if (typeof fileInfo.fileData !== 'undefined') {
                            this._fileData = fileInfo.fileData;
                            return undefined;
                        } else {
                            throw new Error('Cannot retrieve file data');
                        }
                    });
            }

            get fileType() {
                return this._fileType;
            }

            set fileType(value) {
                this._fileType = value;
                this._validPromise = this._constructorPromise
                    .then(() => gapiService.gapi.layer.validateFile(this.fileType, this._fileData))
                    .then(result => {
                        this._userOptions = new LayerBlueprintUserOptions.File[this.fileType]();
                        this._formatedFileData = result;
                    })
                    .catch(error => console.error(error));
            }

            get valid() {
                return this._validPromise;
            }

            get ready() {
                return this._constructorPromise;
            }

            get fields() {
                console.log(this._formatedFileData);

                return this._formatedFileData.fields;
            }

            /**
             * Reads HTML5 File object data.
             * @private
             * @param  {File} file [description]
             * @return {Promise}      promise resolving with file's data
             */
            _readFileData(file) {
                const dataPromise = $q((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = event => {
                        console.error('Failed to read a file', event);
                        reject('Failed to read a file');
                    };
                    reader.onload = event => {
                        console.log(event, reader.result);
                        // this.fileData = reader.result ??
                        resolve(reader.result); // ???
                    };

                    reader.readAsArrayBuffer(file);
                });

                return dataPromise;
            }

            generateLayer() {
                // TODO: throw error if layer type is not defined

                // set layer id to the config id; this is needed when using file layer generator function
                this.userOptions.layerId = this.config.id;

                // apply user selected layer name to the config so it appears in the legend entry
                this.config.name = this.userOptions.layerName;

                console.log(this.userOptions);
                console.log(layerFileGenerators[this.fileType]);

                return gapiService.gapi.layer.makeCsvLayer(this._formatedFileData.formattedData, this.userOptions);
            }
        }
        // jscs:enable requireSpacesInAnonymousFunctionExpression

        return LayerFileBlueprint;
    }
})();
