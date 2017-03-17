(() => {
    'use strict';

    /**
     * @module ConfigObject
     * @memberof app.core
     * @requires dependencies
     * @description     *
     *
     */
    angular
        .module('app.core')
        .factory('ConfigObject', ConfigObjectFactory);

    function ConfigObjectFactory(Geo, gapiService) {

        // These are layer default values for controls, disabledControls, and state
        const LAYER_DEFAULTS = {
            [Geo.Layer.Types.ESRI_FEATURE]: {
                state: {
                    opacity: 1,
                    visibility: true,
                    boundingBox: false,
                    query: true,
                    snapshot: false
                },
                controls: [
                    'opacity',
                    'visibility',
                    'boundingBox',
                    'query',
                    'snapshot',
                    'metadata',
                    'boundaryZoom',
                    'refresh',
                    'reload',
                    'remove',
                    'settings',
                    'data'
                ],
                disabledControls: []
            },
            [Geo.Layer.Types.OGC_WMS]: {
                state: {
                    opacity: 1,
                    visibility: true,
                    boundingBox: false,
                    query: true,
                    snapshot: false
                },
                controls: [
                    'opacity',
                    'visibility',
                    'boundingBox',
                    'query',
                    // 'snapshot',
                    'metadata',
                    'boundaryZoom',
                    'refresh',
                    'reload',
                    'remove',
                    'settings',
                    // 'data'
                ],
                disabledControls: []
            },
            [Geo.Layer.Types.ESRI_DYNAMIC]: {
                state: {
                    opacity: 1,
                    visibility: true,
                    boundingBox: false,
                    query: true,
                    snapshot: false
                },
                controls: [
                    'opacity',
                    'visibility',
                    'boundingBox',
                    'query',
                    // 'snapshot',
                    'metadata',
                    'boundaryZoom',
                    'refresh',
                    'reload',
                    'remove',
                    'settings',
                    'data'
                ],
                disabledControls: []
            },
            [Geo.Layer.Types.ESRI_IMAGE]: {
                state: {
                    opacity: 1,
                    visibility: true,
                    boundingBox: false,
                    query: false,
                    snapshot: false
                },
                controls: [
                    'opacity',
                    'visibility',
                    'boundingBox',
                    'query',
                    'snapshot',
                    'metadata',
                    'boundaryZoom',
                    'refresh',
                    'reload',
                    'remove',
                    'settings',
                    'data'
                ],
                disabledControls: []
            },
            [Geo.Layer.Types.ESRI_TILE]: {
                state: {
                    opacity: 1,
                    visibility: true,
                    boundingBox: false,
                    query: false,
                    snapshot: false
                },
                controls: [
                    'opacity',
                    'visibility',
                    'boundingBox',
                    'query',
                    'snapshot',
                    'metadata',
                    'boundaryZoom',
                    'refresh',
                    'reload',
                    'remove',
                    'settings',
                    'data'
                ],
                disabledControls: []
            }
        };

        /**
         * Typed representation of a LodSet specified in the config.
         * @class LodSet
         */
        class LodSet {
            constructor({ id, lods }) {
                this._id = id;
                this._lods = lods;
            }

            get id () { return this._id; }
            get lods () { return this._lods; }
        }

        /**
         * Typed representation of an Extent specified in the config.
         * @class ExtentSet
         */
        class ExtentSet {
            constructor({ id, spatialReference, default: _default, full, maximum }) {
                this._id = id;
                this._spatialReference = spatialReference;

                this._default = this._parseExtent(_default);
                this._full = this._parseExtent(full) || this._default;
                this._maximum = this._parseExtent(maximum) || this._default;
            }

            get id () { return this._id; }
            get spatialReference () { return this._spatialReference; }

            /**
             * Returns the default extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get default () { return this._default; }
            /**
             * Returns the full extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get full () { return this._full; }
            /**
             * Returns the maximum extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get maximum () { return this._maximum; }

            /**
             * Converts JSON representation of an extent to Esri extent object.
             * @private
             * @param {Object} extent JSON representation of the extent in the form of { xmin: <Number>, xmax: <Number>, ymin: <Number>, ymax: <Number>, spatialReference: { wkid: <Number> }}
             * @return {Object} returns Esri extent object
             */
            _parseExtent(extent) {
                const completeExtent = angular.extend(
                    {},
                    extent, {
                    spatialReference: this._spatialReference
                });

                return gapiService.gapi.mapManager.getExtentFromJson(completeExtent);
            }
        }

        /**
         * Typed representation of a TileSchema specified in the config.
         * @class TileSchema
         */
        class TileSchema {
            constructor({ id, lodSetId, name }, extentSet, lodSet) {
                this._id = id;
                this._name = name;
                this._lodSetId = lodSetId;

                this._extentSet = extentSet;
                this._lodSet = lodSet;
            }

            get name () { return this._name; }
            get id () { return this._id; }

            get extentSet () { return this._extentSet; }
            get lodSet () { return this._lodSet; }

            // TODO: it's not yet decided how the blank basemap will be made; see arc room for notes
            makeBlankBasemap() {
                return new Basemap({
                    name: $translate.instant('basemap.blank.title'),
                    description: $translate.instant('basemap.blank.desc'),
                    type: 'blank',
                    id: `blank_basemap_${this._id}`,
                    url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7/',
                    attribution: '',
                    tileSchema: this
                });
            }
        }

        /**
         * Typed representation of a Basemap specified in the config.
         * @class Basemap
         */
        class Basemap {
            constructor({ id, name, description, type, layers, attribution }, tileSchema) {
                this._id = id;
                this._name = name;
                this._description = description;
                this._type = type;
                this._layers = layers;
                this._url = layers[0].url;
                this._attribution = attribution;
                this._tileSchema = tileSchema;
            }

            _isSelected = false;

            get id () { return this._id ;}
            get name () { return this._name; }
            get description () { return this._description; }
            get type () { return this._type; }
            get layers () { return this._layers; }
            get url () { return this._url; }
            get attribution () { return this._attribution; }
            get tileSchema () { return this._tileSchema; }

            get isSelected () { return this._isSelected; }
            select() { this._isSelected = true; return this; }
            deselect() { this._isSelected = false; return this; }

            /**
             * Returns an array containing levels of details for the current basemap
             * @return {Array} an array containing levels of details for the current basemap.
             */
            get lods () { return this._tileSchema.lodSet.lods; }

            /**
             * Returns the wkid of the basemap projection.
             * @return {Number} wkid of the basemap projection
             */
            get wkid () { return this._tileSchema.extentSet.spatialReference.wkid; }

            /**
             * Returns the default extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get default () { return this._tileSchema.extentSet.default; }
            /**
             * Returns the full extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get full () { return this._tileSchema.extentSet.full; }
            /**
             * Returns the maximum extent as an Esri extent object.
             * @return {Object} Esri extent object
             */
            get maximum () { return this._tileSchema.extentSet.maximum; }
        }

        /**
         * Typed representation of a InfoSection specified in the config's structured legend.
         * @class InfoSection
         */
        class InfoSection {
            constructor(entrySource) {
                this._infoType = entrySource.infoType;
                this._content = entrySource.content;
            }

            get infoType () { return this._infoType; }
            get content () { return this._content; }

            static get entryType () { return Legend.INFO; }
        }

        /**
         * Typed representation of a VisibilitySet specified in the config's structured legend.
         * @class VisibilitySet
         */
        class VisibilitySet {
            constructor(visibilitySetSource) {
                this._exclusiveVisibility = visibilitySetSource.exclusiveVisibility.map(childConfig =>
                    Legend.makeChildObject(childConfig));
            }

            get exclusiveVisibility () { return this._exclusiveVisibility; }

            static get entryType () { return Legend.SET; }
        }

        /**
         * Typed representation of a Entry specified in the config's structured legend.
         * @class Entry
         */
        class Entry {
            constructor(visibilitySetSource) {
                this._layerId = visibilitySetSource.layerId;
                this._controlledIds = visibilitySetSource.controlledIds || [];
                this._entryIndex = visibilitySetSource.entryIndex;
                this._entryId = visibilitySetSource.entryId;
                this._coverIcon = visibilitySetSource.coverIcon;
                this._symbologyStack = visibilitySetSource.symbologyStack;
                this._symbologyRenderStyle = visibilitySetSource.symbologyRenderStyle || Entry.ICONS;
            }

            static ICONS = 'icons';
            static IMAGES = 'images';

            get layerId () { return this._layerId; }
            get controlledIds () { return this._controlledIds; }
            get entryIndex () { return this._entryIndex; }
            get entryId () { return this._entryId; }
            get coverIcon () { return this._coverIcon; }
            get symbologyStack () { return this._symbologyStack; }
            get symbologyRenderStyle () { return this._symbologyRenderStyle; }

            static get entryType () { return Legend.NODE; }
        }

        /**
         * Typed representation of a EntryGroup specified in the config's structured legend.
         * @class Entry
         */
        class EntryGroup {
            constructor(entryGroupSource) {
                this._name = entryGroupSource.name;
                this._children = entryGroupSource.children.map(childConfig =>
                    Legend.makeChildObject(childConfig));
            }

            get name () { return this._name; }
            get children () { return this._children; }

            static get entryType () { return Legend.GROUP; }
        }

        /**
         * Typed representation of a Legend specified in the config. If the legend's type is set as `autopopulate`, the structured legend (exclusively consisting of Entry objects) is generated based on the layer definition list.
         * @class Legend
         */
        class Legend {
            constructor(legendSource, layersSource) {
                this._type = legendSource.type;

                let rootChildren;

                if (this._type === Legend.AUTOPOPULATE) {
                    // since auto legend is a subset of structured legend, its children are automatically populated
                    const sortGroups = Geo.Layer.SORT_GROUPS_;

                    // with autolegend, the layer list is pre-sorted according to the sort groups, and layer names
                    rootChildren = layersSource
                        .sort((a,b) => {
                                if (sortGroups[a.layerType] < sortGroups[b.layerType]) {
                                    return -1;
                                } else if ((sortGroups[a.layerType] > sortGroups[b.layerType])) {
                                    return 1;
                                } else if (a.name < b.name) {
                                    return -1;
                                } else if (a.name > b.name) {
                                    return 1;
                                }

                                return 0;
                        })
                        .map(layerDefinition =>
                            ({ layerId: layerDefinition.id }));

                } else {
                    rootChildren = legendSource.root;
                }

                this._root = new EntryGroup({
                    name: 'I\'m root',
                    children: rootChildren
                });
            }

            static STRUCTURED = 'structured';
            static AUTOPOPULATE = 'autopopulate';

            static INFO = 'legendInfo';
            static NODE = 'legendNode';
            static GROUP = 'legendGroup';
            static SET = 'legendSet';

            static TYPE_TO_CLASS = {
                [Legend.INFO]: InfoSection,
                [Legend.NODE]: Entry,
                [Legend.GROUP]: EntryGroup,
                [Legend.SET]: VisibilitySet
            };

            get type () { return this._type; }
            get root () { return this._root; }

            static detectChildType(child) {
                if (typeof child.infoType !== 'undefined') {
                    return Legend.INFO;
                } else if (typeof child.exclusiveVisibility !== 'undefined') {
                    return Legend.SET;
                } else if (typeof child.children !== 'undefined') {
                    return Legend.GROUP;
                }

                return Legend.NODE;
            }

            static makeChildObject(childConfig) {
                const childType = Legend.detectChildType(childConfig);
                return new Legend.TYPE_TO_CLASS[childType](childConfig);
            }
        }

        class ComponentBase {
            constructor(source = { enabled: true }) {
                this._source = source;

                this._enabled = source.enabled;
            }

            get enabled () { return this._enabled; }

            get body () { return this._body; }
            set body (value) { this._body = value; }
        }

        class GeoSearchComponent extends ComponentBase {
            constructor(source) {
                super(source);

                this._showGraphic = source.showGraphic;
                this._showInfo = source.showInfo;
            }

            get showGraphic () { return this._showGraphic; }
            get showInfo () { return this._showInfo; }
        }

        class MouseInfoComponent extends ComponentBase {
            constructor(source) {
                super(source);

                this._spatialReference = source.spatialReference;
            }

            get spatialReference () { return this._spatialReference; }
        }

        class NorthArrowComponent extends ComponentBase {
            constructor(source) {
                super(source);
            }
        }

        class OverviewMapComponent extends ComponentBase {
            constructor(source) {
                super(source);

                this._maximizeButton = source.maximizeButton;
                this._layerType = source.layerType;
            }

            get maximizeButton () { return this._maximizeButton; }
            get layerType () { return this._layerType; }
        }

        class ScaleBarComponent extends ComponentBase {
            constructor(source) {
                super(source);
            }
        }

        class BasemapComponent extends ComponentBase {
            constructor(source) {
                super(source);
            }
        }

        class Components {
            constructor(componentsSource) {
                this._source = componentsSource;

                this._geoSearch = new GeoSearchComponent(componentsSource.geoSearch);
                this._mouseInfo = new MouseInfoComponent(componentsSource.mouseInfo);
                this._northArray = new NorthArrowComponent(componentsSource.northArrow);
                this._overviewMap = new OverviewMapComponent(componentsSource.overviewMap);
                this._scaleBar = new ScaleBarComponent(componentsSource.scaleBar);
                this._basemap = new BasemapComponent(componentsSource.basemap);
            }

            get geoSearch () { return this._geoSearch; }
            get mouseInfo () { return this._mouseInfo; }
            get northArray () { return this._northArrow; }
            get overviewMap () { return this._overviewMap; }
            get scaleBar () { return this._scaleBar; }
            get basemap () { return this._basemap; }
        }

        /**
         * Typed representation of a Map specified in the config.
         * @class Map
         */
        class Map {
            constructor(mapSource) {
                this._source = mapSource;

                this._extentSets = mapSource.extentSets.map(extentSetSource =>
                    (new ExtentSet(extentSetSource)));

                this._lodSets = mapSource.lodSets.map(lodSetSource =>
                    (new LodSet(lodSetSource)));

                this._tileSchemas = mapSource.tileSchemas.map(tileSchemaSource => {
                    const extentSet = this._extentSets.find(extentSet =>
                        extentSet.id === tileSchemaSource.extentSetId)

                    const lodSet = this._lodSets.find(lodSet =>
                        lodSet.id === tileSchemaSource.lodSetId);

                    const tileSchema = new TileSchema(tileSchemaSource, extentSet, lodSet);

                    return tileSchema;
                });

                // TODO: if basemaps are optional, here we need to generate a blank basemap for every tileSchema
                this._basemaps = mapSource.baseMaps.map(basemapSource => {
                    const tileSchema = this._tileSchemas.find(tileSchema =>
                        tileSchema.id === basemapSource.tileSchemaId);

                    const basemap = new Basemap(basemapSource, tileSchema);

                    return basemap;
                });

                // calling select on a basemap only marks it as `selected`; to actually change the displayed basemap, call `changeBasemap` on `geoService`
                (mapSource.initialBasemapId ?
                    this._basemaps.find(basemap =>
                        basemap.id === this._initialBasemapId) :
                    this._basemaps[0])
                    .select();

                // TODO: parse components subsections

                this._layers = mapSource.layers.map(layerSource =>
                    this._applyLayerDefaults(layerSource));
                this._legend = new Legend(mapSource.legend, this._layers);

                this._components = new Components(mapSource.components);
            }

            get source () { return this._source; }

            get tileSchemas () { return this._tileSchemas; }
            get basemaps () { return this._basemaps; }
            get extentSets () { return this._extentSets; }
            get lodSets () { return this._lodSets; }
            get layers () { return this._layers; }
            get legend () { return this._legend; }
            get components () { return this._components; }

            get selectedBasemap () { return this._basemaps.find(basemap => basemap.isSelected); }

            _layerRecords = [];
            _legendBlocks = [];

            get layerRecords () { return this._layerRecords; }
            get legendBlocks () { return this._legendBlocks; }

            set body (value) { this._body = value; }
            get body () { return this._body; }

            /**
             * Fills in the missing values in controls, disabledControls, and state with defaults.
             * @function _applyLayerDefaults
             * @private
             * @param {Object} layerSource JSON object of the layer defintion from the config
             * @return {Object} a copy of the layerSource with filled-in defaults; the original object is not modified
             */
            _applyLayerDefaults(layerSource) {
                const defaults = LAYER_DEFAULTS[layerSource.layerType];

                const layer = angular.copy(layerSource);

                // taking the default state and overriding any options that are specified in the config
                layer.state = angular.extend({}, defaults.state, layer.state);

                if (typeof layer.controls === 'undefined') {
                    layer.controls = defaults.controls;
                } else {
                    layer.controls = intersect(layer.controls, defaults.controls);
                }

                if (typeof layer.disabledControls === 'undefined') {
                    layer.disabledControls = defaults.disabledControls;
                } else {
                    layer.disabledControls = intersect(layer.disabledControls, defaults.controls);
                }

                return layer;

                /**
                 * // TODO: move this somewhere else.
                 *
                 * Calculates the intersection between two arrays; does not filter out duplicates.
                 *
                 * @function intersect
                 * @private
                 * @param {Array} array1 first array
                 * @param {Array} array2 second array
                 * @return {Array} intersection of the first and second arrays
                 */
                function intersect(array1, array2) {
                    return array1.filter(item =>
                            array2.indexOf(item) !== -1);
                }
            }
        }

        /**
         * [partially]Typed representation of the app's config.
         * @class ConfigObject
         */
        class ConfigObject {
            /**
             *
             * @param {Object} configSource vanilla json config object loaded into the app by the ConfigService
             */
            constructor (configSource) {
                this._source = configSource;

                this._map = new Map(configSource.map);

                // TODO: parse ui and services sections
            }

            /**
             * Returns orignal JOSN source of the config object.
             * @return {Object} original json config object
             */
            get source () { return this._source; }

            get map () { return this._map; }
            get ui () { return this._ui; }
            get services () { return this._services; }

        }

        return ConfigObject;
    }
})();
