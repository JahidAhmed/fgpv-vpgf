(() => {
    /**
     * LayerRecordFactory is a lightweight wrapper around the LayerRecord class hierarchy.
     * It exposes various builder functions to create LayerRecord classes.
     * FIXME this can move into geoapi
     * @module LayerRecordFactory
     * @memberof app.geo
     */
    angular.module('app.geo').factory('LayerRecordFactory', LayerRecordFactory);

    function LayerRecordFactory(Geo, gapiService, $q) {
        const gapi = () => gapiService.gapi;

        /**
         * @class LayerRecord
         */
        class LayerRecord {
            get layerClass () { throw new Error('This should be overridden in subclasses'); }
            get config () { return this.initialConfig; } // TODO: add a live config reference if needed
            get legendEntry () { return this._legendEntry; } // legend entry class corresponding to those defined in legend entry service
            set legendEntry (value) { this._legendEntry = value; }
            get bbox () { return this._bbox; } // bounding box layer
            get state () { return this._state; }
            get layerId () { return this.config.id; }
            get _layerPassthroughBindings () { return ['setOpacity', 'setVisibility']; } // TODO when jshint parses instance fields properly we can change this from a property to a field
            get _layerPassthroughProperties () { return ['visibleAtMapScale', 'visible', 'spatialReference']; } // TODO when jshint parses instance fields properly we can change this from a property to a field

            /**
             * Generate a bounding box for the layer on the given map.
             */
            createBbox (map) {
                if (this._bbox) {
                    throw new Error('Bbox is already setup');
                }
                this._bbox = gapi().layer.bbox.makeBoundingBox(`bbox_${this._layer.id}`,
                                                               this._layer.fullExtent,
                                                               map.extent.spatialReference);
                map.addLayer(this._bbox);
            }

            /**
             * Destroy bounding box
             */
            destroyBbox (map) {
                map.removeLayer(this._bbox);
                this._bbox = undefined;
            }

            bindEvents (layer) {
                // TODO optional refactor.  Rather than making the events object in the parameter,
                //      do it as a variable, and only add mouse-over, mouse-out events if we are
                //      in an app configuration that will use it. May save a bit of processing
                //      by not having unused events being handled and ignored.
                //      Second optional thing. Call a separate wrapEvents in FeatuerRecord class
                gapi().events.wrapEvents(layer, {
                    // wrapping the function calls to keep `this` bound correctly
                    load: () => this.onLoad(),
                    error: e => this.onError(e),
                    'update-start': () => this.onUpdateStart(),
                    'update-end': () => this.onUpdateEnd(),
                    'mouse-over': e => this.onMouseOver(e),
                    'mouse-out': e => this.onMouseOut(e)
                });
            }

            constructLayer () {
                this._layer = this.layerClass(this.config.url, this.makeLayerConfig());
                this.bindEvents(this._layer);
                return this._layer;
            }

            _stateChange (newState) {
                this._state = newState;
                console.log(`State change for ${this.layerId} to ${newState}`);
                // if we don't copy the array we could be looping on an array
                // that is being modified as it is being read
                this._fireEvent(this._stateListeners, this._state);
            }

            addStateListener (listenerCallback) {
                this._stateListeners.push(listenerCallback);
                return listenerCallback;
            }

            removeStateListener (listenerCallback) {
                const idx = this._stateListeners.indexOf(listenerCallback);
                if (idx < 0) {
                    throw new Error('Attempting to remove a listener which is not registered.');
                }
                this._stateListeners.splice(idx, 1);
            }

            addHoverListener (listenerCallback) {
                this._hoverListeners.push(listenerCallback);
                return listenerCallback;
            }

            removeHoverListener (listenerCallback) {
                const idx = this._hoverListeners.indexOf(listenerCallback);
                if (idx < 0) {
                    throw new Error('Attempting to remove a listener which is not registered.');
                }
                this._hoverListeners.splice(idx, 1);
            }

            onLoad () {
                if (this.legendEntry && this.legendEntry.removed) { return; }
                console.info(`Layer loaded: ${this._layer.id}`);
                let lookupPromise = Promise.resolve();
                if (this._epsgLookup) {
                    const check = gapi().proj.checkProj(this.spatialReference, this._epsgLookup);
                    if (check.lookupPromise) {
                        lookupPromise = check.lookupPromise;
                    }
                }
                lookupPromise.then(() => this._stateChange(Geo.Layer.States.LOADED));
            }

            onError (e) {
                console.warn(`Layer error: ${e}`);
                console.warn(e);
                this._stateChange(Geo.Layer.States.ERROR);
            }

            onUpdateStart () {
                this._stateChange(Geo.Layer.States.REFRESH);
            }

            onUpdateEnd () {
                this._stateChange(Geo.Layer.States.LOADED);
            }

            makeLayerConfig () {
                return {
                    id: this.config.id,
                    opacity: this.config.options.opacity.value,
                    visible: this.config.options.visibility.value
                };
            }

            onMouseOver () {
                // do nothing in baseclass
            }

            onMouseOut () {
                // do nothing in baseclass
            }

            _fireEvent (handlerArray, ...eventParams) {
                handlerArray.slice(0).forEach(l => l(...eventParams));
            }

            /**
             * Creates a config snippet (containing options) given a list of properties and values.
             * Only used for bookmark version A
             *
             * @param {Array} props     The property names
             * @param {Array} info      The values for the properties
             * @returns {Object}        config snippet for the layer
             */
            static parseData (props, info) {

                const lookup = {
                    opacity: value => {
                        return parseInt(value) / 100;
                    },
                    visibility: value => {
                        return value === '1' ? true : null;
                    },
                    boundingBox: value => value === '1',
                    snapshot: value => value === '1',
                    query: value => value === '1'
                };

                const result = { options: {} };

                props.forEach((prop, index) => {
                    result.options[prop] = { value: lookup[prop](info[index]) };
                });
                return result;
            }

            /**
             * Create a layer record with the appropriate geoApi layer type.  Layer config
             * should be fully merged with all layer options defined (i.e. this constructor
             * will not apply any defaults).
             * @param {Object} config layer config values
             * @param {Object} esriLayer an optional pre-constructed layer
             * @param {Function} epsgLookup an optional lookup function for EPSG codes (see geoService for signature)
             */
            constructor (config, esriLayer, epsgLookup) {
                this.initialConfig = config;
                this._stateListeners = [];
                this._hoverListeners = [];
                this._epsgLookup = epsgLookup;
                this._layerPassthroughBindings.forEach(bindingName =>
                    (this[bindingName] = (...args) => this._layer[bindingName](...args)));
                this._layerPassthroughProperties.forEach(propName => {
                    const descriptor = {
                        enumerable: true,
                        get: () => this._layer[propName]
                    };
                    Object.defineProperty(this, propName, descriptor);
                });
                if (esriLayer) {
                    this.constructLayer = () => { throw new Error('Cannot construct pre-made layers'); };
                    this._layer = esriLayer;
                    this.bindEvents(this._layer);
                    this.state = Geo.Layer.States.LOADED;
                } else {
                    this.constructLayer(config);
                    this.state = Geo.Layer.States.LOADING;
                }

                // NOTE layer registry is responsible for adding the layer to the map
                // this avoids LayerRecord having an explicit dependency on the map object
            }

        }

        /**
         * @class AttrRecord
         */
        class AttrRecord extends LayerRecord {
            get attributeBundle () { return this._attributeBundle; }
            // FIXME clickTolerance is not specific to AttrRecord but rather Feature and Dynamic
            get clickTolerance () { return this.config.tolerance; }

            constructor (config, esriLayer, epsgLookup) {
                super(config, esriLayer, epsgLookup);
                this._formattedAttributes = {};
            }

            onLoad () {
                this._attributeBundle = gapi().attribs.loadLayerAttribs(this._layer);
                super.onLoad();
            }

            /**
             * Formats raw attributes to the form consumed by the datatable
             * @param  {Object} attributes raw attribute data returned from geoapi
             * @return {Object} layerData  layer data returned from geoApi
             * @return {Object}               formatted attribute data { data: Array, columns: Array, fields: Array, oidField: String, oidIndex: Object}
             */
            formatAttributes (attributes, layerData) {
                // create columns array consumable by datables
                const columns = layerData.fields
                    .filter(field =>
                        // assuming there is at least one attribute - empty attribute budnle promises should be rejected, so it never even gets this far
                        // filter out fields where there is no corresponding attribute data
                        attributes.features[0].attributes.hasOwnProperty(field.name))
                    .map(field => ({
                        data: field.name,
                        title: field.alias || field.name
                    }));

                return {
                    columns,
                    rows: attributes.features.map(feature => feature.attributes),
                    fields: layerData.fields, // keep fields for reference ...
                    oidField: layerData.oidField, // ... keep a reference to id field ...
                    oidIndex: attributes.oidIndex, // ... and keep id mapping array
                    renderer: layerData.renderer
                };
            }

            /**
             * Retrieves attributes from a layer for a specified feature index
             * @param  {Number} featureIdx feature id on the service endpoint
             * @return {Promise}            promise resolving with formatted attributes to be consumed by the datagrid and esri feature identify
             */
            getAttributes (featureIdx) {
                const formAtt = this._formattedAttributes;

                if (formAtt.hasOwnProperty(featureIdx)) {
                    return formAtt[featureIdx];
                }

                const layerPackage = this._attributeBundle[featureIdx];
                const attributePromise = $q.all([layerPackage.getAttribs(), layerPackage.layerData])
                    .then(([attributes, layerData]) => this.formatAttributes(attributes, layerData))
                    .catch(() => {
                        delete this._formattedAttributes[featureIdx]; // delete cached promise when the geoApi `getAttribs` call fails, so it will be requested again next time `getAttributes` is called;
                        throw new Error('Attrib loading failed');
                    });
                return (this._formattedAttributes[featureIdx] = attributePromise);
            }

        }

        /**
         * @class ImageRecord
         */
        class ImageRecord extends LayerRecord {
            get layerClass () { return gapi().layer.ArcGISImageServiceLayer; }

            /**
             * Creates a config snippet (containing options) given the dataString portion of the layer bookmark.
             *
             * @param {String} dataString   a partial layer bookmark (everything after the id)
             * @returns {Object}            config snippet for the layer
             */
            static parseData (dataString) {
                // Only used for bookmark version A
                // ( opacity )( viz )( boundingBox )( query )

                const format = /^(\d{3})(\d{1})(\d{1})$/;

                const info = dataString.match(format);

                if (info) {
                    return super.parseData([, 'opacity', 'visibility', 'boundingBox'], info); // jshint ignore:line
                }
            }
        }

        /**
         * @class DynamicRecord
         */
        class DynamicRecord extends AttrRecord {
            get _layerPassthroughBindings () {
                return ['setOpacity', 'setVisibility', 'setVisibleLayers', 'setLayerDrawingOptions'];
            }
            get _layerPassthroughProperties () {
                return ['visibleAtMapScale', 'visible', 'spatialReference', 'layerInfos', 'supportsDynamicLayers'];
            }
            get layerClass () { return gapi().layer.ArcGISDynamicMapServiceLayer; }

            /**
             * Creates a config snippet (containing options) given the dataString portion of the layer bookmark.
             *
             * @param {String} dataString   a partial layer bookmark (everything after the id)
             * @returns {Object}            config snippet for the layer
             */
            static parseData (dataString) {
                // Only used for bookmark version A
                // ( opacity )( viz )( boundingBox )( query )

                const format = /^(\d{3})(\d{1})(\d{1})(\d{1})$/;
                const info = dataString.match(format);

                if (info) {
                    return super.parseData([, 'opacity', 'visibility', 'boundingBox', 'query'], info); // jshint ignore:line
                }
            }
        }

        /**
         * @class TileRecord
         */
        class TileRecord extends LayerRecord {
            get layerClass () { return gapi().layer.TileLayer; }

            /**
             * Creates a config snippet (containing options) given the dataString portion of the layer bookmark.
             *
             * @param {String} dataString   a partial layer bookmark (everything after the id)
             * @returns {Object}            config snippet for the layer
             */
            static parseData (dataString) {
                // Only used for bookmark version A
                // ( opacity )( viz )( boundingBox )

                const format = /^(\d{3})(\d{1})(\d{1})$/;
                const info = dataString.match(format);

                if (info) {
                    return super.parseData([, 'opacity', 'visibility', 'boundingBox'], info); // jshint ignore:line
                }
            }
        }

        /**
         * @class WmsRecord
         */
        class WmsRecord extends LayerRecord {
            get layerClass () { return gapi().layer.ogc.WmsLayer; }

            makeLayerConfig () {
                const cfg = super.makeLayerConfig();
                cfg.visibleLayers = this.config.layerEntries.map(le => le.id);
                return cfg;
            }

            /**
             * Creates a config snippet (containing options) given the dataString portion of the layer bookmark.
             *
             * @param {String} dataString   a partial layer bookmark (everything after the id)
             * @returns {Object}            config snippet for the layer
             */
            static parseData (dataString) {
                // Only used for bookmark version A
                // ( opacity )( viz )( boundingBox )( query )

                const format = /^(\d{3})(\d{1})(\d{1})(\d{1})$/;
                const info = dataString.match(format);

                if (info) {
                    return super.parseData([, 'opacity', 'visibility', 'boundingBox', 'query'], info); // jshint ignore:line
                }
            }
        }

        /**
         * @class FeatureRecord
         */
        class FeatureRecord extends AttrRecord {
            get layerClass () { return gapi().layer.FeatureLayer; }

            makeLayerConfig () {
                const cfg = super.makeLayerConfig();
                cfg.mode = this.config.options.snapshot.value ? this.layerClass.MODE_SNAPSHOT
                                                              : this.layerClass.MODE_ONDEMAND;
                this.config.options.snapshot.enabled = !this.config.options.snapshot.value;
                return cfg;
            }

            /**
             * Creates a config snippet (containing options) given the dataString portion of the layer bookmark.
             *
             * @param {String} dataString   a partial layer bookmark (everything after the id)
             * @returns {Object}            config snippet for the layer
             */
            static parseData (dataString) {
                // Only used for bookmark version A
                // ( opacity )( viz )( boundingBox )( snapshot )( query )

                const format =  /^(\d{3})(\d{1})(\d{1})(\d{1})(\d{1})$/;
                const info = dataString.match(format);

                if (info) {
                    return super.parseData([, 'opacity', 'visibility', 'boundingBox', 'snapshot', 'query'], info); // jshint ignore:line
                }
            }

            // HACK this is a duplicate of the function that is in identify.service.js
            //      after refactor, everything will be in geoApi and happy.
            //      for now, this class can't access geo service, so duplicating.
            getFeatureName (attribs, objId) {
                let nameField = '';

                if (this.legendEntry && this.legendEntry.nameField) {
                    nameField = this.legendEntry.nameField;
                } else if (this._layer && this._layer.displayField) {
                    nameField = this._layer.displayField;
                }

                if (nameField) {
                    return attribs[nameField];
                } else {
                    // FIXME wire in "feature" to translation service
                    return 'Feature ' + objId;
                }
            }

            onMouseOver (e) {
                if (this._hoverListeners.length > 0) {
                    // TODO add in quick lookup for layers that dont have attributes loaded yet

                    const showBundle = {
                        type: 'mouseOver',
                        point: e.screenPoint,
                        target: e.target
                    };

                    // tell anyone listening we moused into something
                    this._fireEvent(this._hoverListeners, showBundle);

                    // pull metadata for this layer. feature layer only ever has one index (thus index 0)
                    // TODO after refactor, the class should have a .featureIdx property to use instead.
                    const featureIdx = this.attributeBundle.indexes[0];
                    this.attributeBundle[featureIdx].layerData.then(lInfo => {
                        // TODO this will change a bit after we add in quick lookup. for now, get all attribs
                        return $q.all([Promise.resolve(lInfo), this.attributeBundle[featureIdx].getAttribs()]);
                    }).then(([lInfo, aInfo]) => {
                        // graphic attributes will only have the OID if layer is server based
                        const oid = e.graphic.attributes[lInfo.oidField];

                        // get name via attribs and name field
                        const featAttribs = aInfo.features[aInfo.oidIndex[oid]].attributes;
                        const featName = this.getFeatureName(featAttribs, oid);

                        // get icon via renderer and geoApi call
                        const svgcode = gapi().symbology.getGraphicIcon(featAttribs, lInfo.renderer);

                        // duplicate the position so listener can verify this event is same as mouseOver event above
                        const loadBundle = {
                            type: 'tipLoaded',
                            name: featName,
                            target: e.target,
                            svgcode
                        };

                        // tell anyone listening we moused into something
                        this._fireEvent(this._hoverListeners, loadBundle);
                    });
                }
            }

            onMouseOut (e) {
                // tell anyone listening we moused out
                const outBundle = {
                    type: 'mouseOut',
                    target: e.target
                };
                this._fireEvent(this._hoverListeners, outBundle);
            }
        }

        /**
         * Create a LayerRecord based on a config fragment
         * @function makeServiceRecord
         * @param {Object} config A configuration fragment for the layer to be created
         * @param {Function} epsgLookup An optional lookup function for unknown projections
         * @return {Object} A LayerRecord object of the appropriate type
         */
        function makeServiceRecord(config, epsgLookup) {
            const types = Geo.Layer.Types;
            const typeToClass = {
                [types.ESRI_TILE]: TileRecord,
                [types.ESRI_FEATURE]: FeatureRecord,
                [types.ESRI_IMAGE]: ImageRecord,
                [types.ESRI_DYNAMIC]: DynamicRecord,
                [types.OGC_WMS]: WmsRecord
            };
            return new typeToClass[config.layerType](config, undefined, epsgLookup);
        }

        /**
         * Create a LayerRecord from an existing layer (used for file based layers).
         * @function makeFileRecord
         * @param {Object} config A configuration fragment for the layer to be created
         * @param {Object} layer An ESRI layer object which has already been setup
         * @return {FeatureRecord} A FeatureRecord (currently all files use FeatureLayers internally)
         */
        function makeFileRecord(config, layer) {
            return new FeatureRecord(config, layer);
        }

        /**
         * Creates a config snippet for the layer described by dataString.
         * Maps to the correct layerRecord class using layerType.
         *
         * @function parseLayerData
         * @param {String} dataString   a partial layer bookmark (everything after the id)
         * @param {Number} layerType    Layer type taken from the layer bookmark
         * @returns {Object}            config snippet for the layer
         */
        function parseLayerData(dataString, layerType) {
            const classes = [
                FeatureRecord,
                WmsRecord,
                TileRecord,
                DynamicRecord,
                ImageRecord
            ];

            return classes[layerType].parseData(dataString);
        }

        return { makeServiceRecord, makeFileRecord, parseLayerData };
    }
})();
